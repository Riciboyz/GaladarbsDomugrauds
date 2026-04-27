const { Router } = require('express');
const crypto = require('crypto');
const {
  optionalAuth,
  authenticateToken,
  currentUserId,
  requireRole,
  assertUserCanCreateContent,
} = require('../middleware/auth');
const { toIsoUtc } = require('../helpers/utils');
const { logAudit, touchLastActive } = require('../helpers/audit');

const TOPIC_STATUSES = ['pending', 'approved', 'rejected'];
const FEATURE_STATUSES = ['pending', 'planned', 'in_progress', 'done', 'rejected'];
const FEATURE_CATEGORIES = ['donation', 'ui', 'feature', 'other'];

module.exports = function (db, io) {
  const router = Router();

  const todayIso = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  function broadcastActiveDailyTopic() {
    if (!io) return;
    const today = todayIso();
    const format = (row) => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      status: row.status || 'published',
      is_active: true,
      created_at: toIsoUtc(row.created_at),
      created_by_username: row.cu,
      created_by_display_name: row.cdn,
    });
    db.get(
      `SELECT dt.*, u.username as cu, u.display_name as cdn
       FROM daily_topics dt JOIN users u ON dt.created_by = u.id
       WHERE dt.date = ? AND COALESCE(dt.status, 'published') = 'published'
       ORDER BY dt.created_at DESC LIMIT 1`,
      [today],
      (err, row) => {
        if (!err && row) {
          io.emit('daily_topic_active_set', format(row));
          return;
        }
        db.get(
          `SELECT dt.*, u.username as cu, u.display_name as cdn
           FROM daily_topics dt JOIN users u ON dt.created_by = u.id
           WHERE COALESCE(dt.status, 'published') = 'published' AND dt.date <= ?
           ORDER BY dt.date DESC, dt.created_at DESC LIMIT 1`,
          [today],
          (_e2, latest) => {
            io.emit('daily_topic_active_set', latest ? format(latest) : null);
          }
        );
      }
    );
  }

  function mapTopicSuggestionRow(r, myVote) {
    return {
      id: r.id,
      title: r.title,
      description: r.description || '',
      image_url: r.image_url || '',
      status: r.status || 'pending',
      approved_topic_id: r.approved_topic_id || null,
      admin_note: r.admin_note || '',
      created_at: toIsoUtc(r.created_at),
      reviewed_at: toIsoUtc(r.reviewed_at) || null,
      votes: r.vote_sum != null ? Number(r.vote_sum) : 0,
      vote_count: r.vote_count != null ? Number(r.vote_count) : 0,
      my_vote: myVote != null ? myVote : 0,
      author: {
        id: r.user_id,
        username: r.username,
        display_name: r.display_name,
        avatar: r.avatar || '',
      },
    };
  }

  function mapFeatureSuggestionRow(r, myVote) {
    return {
      id: r.id,
      title: r.title,
      description: r.description || '',
      image_url: r.image_url || '',
      category: r.category || 'other',
      status: r.status || 'pending',
      admin_note: r.admin_note || '',
      created_at: toIsoUtc(r.created_at),
      reviewed_at: toIsoUtc(r.reviewed_at) || null,
      votes: r.vote_sum != null ? Number(r.vote_sum) : 0,
      vote_count: r.vote_count != null ? Number(r.vote_count) : 0,
      my_vote: myVote != null ? myVote : 0,
      author: {
        id: r.user_id,
        username: r.username,
        display_name: r.display_name,
        avatar: r.avatar || '',
      },
    };
  }

  function fetchVoteTotals(suggestionId, cb) {
    db.get(
      `SELECT COALESCE(SUM(value), 0) AS vote_sum, COUNT(*) AS vote_count
       FROM suggestion_votes WHERE suggestion_id = ?`,
      [suggestionId],
      (err, row) => {
        if (err || !row) return cb({ vote_sum: 0, vote_count: 0 });
        cb({ vote_sum: Number(row.vote_sum) || 0, vote_count: Number(row.vote_count) || 0 });
      }
    );
  }

  function fetchMyVote(suggestionId, userId, cb) {
    if (!userId) return cb(0);
    db.get(
      'SELECT value FROM suggestion_votes WHERE suggestion_id = ? AND user_id = ?',
      [suggestionId, userId],
      (err, row) => cb(err || !row ? 0 : Number(row.value) || 0)
    );
  }

  function reloadTopicSuggestion(id, uid, cb) {
    db.get(
      `SELECT ts.*, u.username, u.display_name, u.avatar,
              (SELECT COALESCE(SUM(value), 0) FROM suggestion_votes v WHERE v.suggestion_id = ts.id) AS vote_sum,
              (SELECT COUNT(*) FROM suggestion_votes v WHERE v.suggestion_id = ts.id) AS vote_count
       FROM topic_suggestions ts JOIN users u ON ts.user_id = u.id
       WHERE ts.id = ?`,
      [id],
      (err, row) => {
        if (err || !row) return cb(null);
        fetchMyVote(id, uid, (mine) => cb(mapTopicSuggestionRow(row, mine)));
      }
    );
  }

  function reloadFeatureSuggestion(id, uid, cb) {
    db.get(
      `SELECT fs.*, u.username, u.display_name, u.avatar,
              (SELECT COALESCE(SUM(value), 0) FROM suggestion_votes v WHERE v.suggestion_id = fs.id) AS vote_sum,
              (SELECT COUNT(*) FROM suggestion_votes v WHERE v.suggestion_id = fs.id) AS vote_count
       FROM feature_suggestions fs JOIN users u ON fs.user_id = u.id
       WHERE fs.id = ?`,
      [id],
      (err, row) => {
        if (err || !row) return cb(null);
        fetchMyVote(id, uid, (mine) => cb(mapFeatureSuggestionRow(row, mine)));
      }
    );
  }

  /* ----------------- TOPIC SUGGESTIONS ----------------- */

  router.get('/topic-suggestions', optionalAuth, (req, res) => {
    const uid = currentUserId(req);
    const status = String(req.query.status || 'pending');
    const sort = String(req.query.sort || 'top');

    const params = [];
    let where = '1=1';
    if (status !== 'all') {
      if (!TOPIC_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }
      where += ' AND ts.status = ?';
      params.push(status);
    }

    let orderBy = 'vote_sum DESC, ts.created_at DESC';
    if (sort === 'new') orderBy = 'ts.created_at DESC';
    if (sort === 'old') orderBy = 'ts.created_at ASC';

    db.all(
      `SELECT ts.*, u.username, u.display_name, u.avatar,
              (SELECT COALESCE(SUM(value), 0) FROM suggestion_votes v WHERE v.suggestion_id = ts.id) AS vote_sum,
              (SELECT COUNT(*) FROM suggestion_votes v WHERE v.suggestion_id = ts.id) AS vote_count
       FROM topic_suggestions ts JOIN users u ON ts.user_id = u.id
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT 200`,
      params,
      (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });
        if (!rows || rows.length === 0) {
          return res.json({ success: true, suggestions: [] });
        }
        if (!uid) {
          return res.json({ success: true, suggestions: rows.map((r) => mapTopicSuggestionRow(r, 0)) });
        }
        const ids = rows.map((r) => r.id);
        db.all(
          `SELECT suggestion_id, value FROM suggestion_votes
           WHERE user_id = ? AND suggestion_id IN (${ids.map(() => '?').join(',')})`,
          [uid, ...ids],
          (e2, votes) => {
            const map = new Map();
            (votes || []).forEach((v) => map.set(v.suggestion_id, Number(v.value) || 0));
            res.json({
              success: true,
              suggestions: rows.map((r) => mapTopicSuggestionRow(r, map.get(r.id) || 0)),
            });
          }
        );
      }
    );
  });

  router.post('/topic-suggestions', authenticateToken, assertUserCanCreateContent(db), (req, res) => {
    const uid = currentUserId(req);
    if (!uid) {
      return res.status(401).json({ success: false, error: 'Login required' });
    }
    const { title, description, imageUrl } = req.body || {};
    const t = String(title || '').trim();
    if (!t) return res.status(400).json({ success: false, error: 'Title required' });
    if (t.length > 120) return res.status(400).json({ success: false, error: 'Title too long' });
    const desc = String(description || '').slice(0, 2000);
    const img = String(imageUrl || '').slice(0, 500);
    const id = crypto.randomUUID();
    db.run(
      `INSERT INTO topic_suggestions (id, user_id, title, description, image_url, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))`,
      [id, uid, t, desc, img],
      (err) => {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });
        touchLastActive(db, uid, () => {});
        logAudit(
          db,
          {
            actorId: uid,
            action: 'suggestion.topic.create',
            entityType: 'topic_suggestion',
            entityId: id,
            metadata: { title: t },
          },
          () => {
            reloadTopicSuggestion(id, uid, (row) => {
              if (row && io) io.emit('topic_suggestion_created', row);
              res.json({ success: true, suggestion: row });
            });
          }
        );
      }
    );
  });

  router.post('/topic-suggestions/:id/vote', authenticateToken, (req, res) => {
    const uid = currentUserId(req);
    if (!uid) {
      return res.status(401).json({ success: false, error: 'Login required' });
    }
    const { id } = req.params;
    const raw = req.body && req.body.value;
    const value = raw === 1 || raw === '1' ? 1 : raw === -1 || raw === '-1' ? -1 : 0;
    db.get('SELECT id FROM topic_suggestions WHERE id = ?', [id], (err, row) => {
      if (err) return res.status(500).json({ success: false, error: 'Database error' });
      if (!row) return res.status(404).json({ success: false, error: 'Suggestion not found' });

      const after = () => {
        fetchVoteTotals(id, (totals) => {
          if (io) {
            io.emit('topic_suggestion_vote_updated', {
              id,
              votes: totals.vote_sum,
              vote_count: totals.vote_count,
            });
          }
          res.json({ success: true, votes: totals.vote_sum, vote_count: totals.vote_count, my_vote: value });
        });
      };

      if (value === 0) {
        db.run(
          'DELETE FROM suggestion_votes WHERE suggestion_id = ? AND user_id = ?',
          [id, uid],
          (e2) => {
            if (e2) return res.status(500).json({ success: false, error: 'Database error' });
            after();
          }
        );
      } else {
        db.run(
          `INSERT INTO suggestion_votes (suggestion_id, user_id, kind, value, created_at)
           VALUES (?, ?, 'topic', ?, datetime('now'))
           ON CONFLICT(suggestion_id, user_id) DO UPDATE SET value = excluded.value, created_at = datetime('now')`,
          [id, uid, value],
          (e2) => {
            if (e2) return res.status(500).json({ success: false, error: 'Database error' });
            after();
          }
        );
      }
    });
  });

  router.post('/topic-suggestions/:id/approve', requireRole(db, 'admin'), (req, res) => {
    const { id } = req.params;
    const { date, status: requestedStatus } = req.body || {};
    const targetDate = String(date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return res.status(400).json({ success: false, error: 'Valid date (YYYY-MM-DD) required' });
    }
    if (targetDate < todayIso()) {
      return res.status(400).json({ success: false, error: 'Past dates are not allowed' });
    }
    const actorId = currentUserId(req);
    db.get(
      'SELECT * FROM topic_suggestions WHERE id = ?',
      [id],
      (err, suggestion) => {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });
        if (!suggestion) return res.status(404).json({ success: false, error: 'Suggestion not found' });
        if (suggestion.status === 'approved') {
          return res.status(409).json({ success: false, error: 'Already approved' });
        }

        const topicId = crypto.randomUUID();
        const st =
          requestedStatus && ['draft', 'scheduled', 'published'].includes(requestedStatus)
            ? requestedStatus
            : targetDate > todayIso()
            ? 'scheduled'
            : 'published';

        db.run(
          `INSERT INTO daily_topics (id, title, description, date, created_by, participants, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, '[]', ?, datetime('now'), datetime('now'))`,
          [topicId, suggestion.title, suggestion.description || '', targetDate, actorId, st],
          (e2) => {
            if (e2) return res.status(500).json({ success: false, error: 'Database error' });
            db.run(
              `UPDATE topic_suggestions
               SET status = 'approved', approved_topic_id = ?, reviewed_by = ?, reviewed_at = datetime('now')
               WHERE id = ?`,
              [topicId, actorId, id],
              (e3) => {
                if (e3) return res.status(500).json({ success: false, error: e3.message });
                logAudit(
                  db,
                  {
                    actorId,
                    action: 'suggestion.topic.approve',
                    entityType: 'topic_suggestion',
                    entityId: id,
                    metadata: { topicId, date: targetDate, status: st },
                  },
                  () => {
                    reloadTopicSuggestion(id, actorId, (row) => {
                      if (row && io) io.emit('topic_suggestion_updated', row);
                      if (io) {
                        io.emit('daily_topic_updated', {
                          id: topicId,
                          title: suggestion.title,
                          description: suggestion.description || '',
                          date: targetDate,
                          status: st,
                          maxParticipants: 100,
                          participants: [],
                        });
                      }
                      broadcastActiveDailyTopic();
                      res.json({ success: true, suggestion: row, topicId, date: targetDate, status: st });
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });

  router.post('/topic-suggestions/:id/reject', requireRole(db, 'admin'), (req, res) => {
    const { id } = req.params;
    const reason = String((req.body || {}).reason || '').slice(0, 500);
    const actorId = currentUserId(req);
    db.run(
      `UPDATE topic_suggestions
       SET status = 'rejected', admin_note = ?, reviewed_by = ?, reviewed_at = datetime('now')
       WHERE id = ?`,
      [reason, actorId, id],
      function (err) {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });
        if (!this.changes) return res.status(404).json({ success: false, error: 'Suggestion not found' });
        logAudit(
          db,
          {
            actorId,
            action: 'suggestion.topic.reject',
            entityType: 'topic_suggestion',
            entityId: id,
            metadata: { reason },
          },
          () => {
            reloadTopicSuggestion(id, actorId, (row) => {
              if (row && io) io.emit('topic_suggestion_updated', row);
              res.json({ success: true, suggestion: row });
            });
          }
        );
      }
    );
  });

  router.delete('/topic-suggestions/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const uid = currentUserId(req);
    db.get(
      'SELECT user_id, status FROM topic_suggestions WHERE id = ?',
      [id],
      (err, row) => {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });
        if (!row) return res.status(404).json({ success: false, error: 'Suggestion not found' });
        db.get('SELECT role FROM users WHERE id = ?', [uid], (e2, ur) => {
          const isAdmin = ur && ur.role === 'admin';
          if (!isAdmin && row.user_id !== uid) {
            return res.status(403).json({ success: false, error: 'Not allowed' });
          }
          db.run('DELETE FROM topic_suggestions WHERE id = ?', [id], (e3) => {
            if (e3) return res.status(500).json({ success: false, error: e3.message });
            db.run('DELETE FROM suggestion_votes WHERE suggestion_id = ?', [id], () => {});
            if (io) io.emit('topic_suggestion_deleted', { id });
            logAudit(
              db,
              {
                actorId: uid,
                action: 'suggestion.topic.delete',
                entityType: 'topic_suggestion',
                entityId: id,
                metadata: {},
              },
              () => res.json({ success: true })
            );
          });
        });
      }
    );
  });

  /* ----------------- FEATURE SUGGESTIONS ----------------- */

  router.get('/feature-suggestions', optionalAuth, (req, res) => {
    const uid = currentUserId(req);
    const status = String(req.query.status || 'all');
    const category = String(req.query.category || 'all');
    const sort = String(req.query.sort || 'top');

    const params = [];
    let where = '1=1';
    if (status !== 'all') {
      if (!FEATURE_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }
      where += ' AND fs.status = ?';
      params.push(status);
    }
    if (category !== 'all') {
      if (!FEATURE_CATEGORIES.includes(category)) {
        return res.status(400).json({ success: false, error: 'Invalid category' });
      }
      where += ' AND fs.category = ?';
      params.push(category);
    }

    let orderBy = 'vote_sum DESC, fs.created_at DESC';
    if (sort === 'new') orderBy = 'fs.created_at DESC';
    if (sort === 'old') orderBy = 'fs.created_at ASC';

    db.all(
      `SELECT fs.*, u.username, u.display_name, u.avatar,
              (SELECT COALESCE(SUM(value), 0) FROM suggestion_votes v WHERE v.suggestion_id = fs.id) AS vote_sum,
              (SELECT COUNT(*) FROM suggestion_votes v WHERE v.suggestion_id = fs.id) AS vote_count
       FROM feature_suggestions fs JOIN users u ON fs.user_id = u.id
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT 200`,
      params,
      (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });
        if (!rows || rows.length === 0) {
          return res.json({ success: true, suggestions: [] });
        }
        if (!uid) {
          return res.json({ success: true, suggestions: rows.map((r) => mapFeatureSuggestionRow(r, 0)) });
        }
        const ids = rows.map((r) => r.id);
        db.all(
          `SELECT suggestion_id, value FROM suggestion_votes
           WHERE user_id = ? AND suggestion_id IN (${ids.map(() => '?').join(',')})`,
          [uid, ...ids],
          (_e2, votes) => {
            const map = new Map();
            (votes || []).forEach((v) => map.set(v.suggestion_id, Number(v.value) || 0));
            res.json({
              success: true,
              suggestions: rows.map((r) => mapFeatureSuggestionRow(r, map.get(r.id) || 0)),
            });
          }
        );
      }
    );
  });

  router.post('/feature-suggestions', authenticateToken, assertUserCanCreateContent(db), (req, res) => {
    const uid = currentUserId(req);
    if (!uid) {
      return res.status(401).json({ success: false, error: 'Login required' });
    }
    const { title, description, imageUrl, category } = req.body || {};
    const t = String(title || '').trim();
    if (!t) return res.status(400).json({ success: false, error: 'Title required' });
    if (t.length > 120) return res.status(400).json({ success: false, error: 'Title too long' });
    const desc = String(description || '').slice(0, 4000);
    const img = String(imageUrl || '').slice(0, 500);
    const cat = FEATURE_CATEGORIES.includes(String(category)) ? String(category) : 'other';
    const id = crypto.randomUUID();
    db.run(
      `INSERT INTO feature_suggestions (id, user_id, title, description, image_url, category, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
      [id, uid, t, desc, img, cat],
      (err) => {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });
        touchLastActive(db, uid, () => {});
        logAudit(
          db,
          {
            actorId: uid,
            action: 'suggestion.feature.create',
            entityType: 'feature_suggestion',
            entityId: id,
            metadata: { title: t, category: cat },
          },
          () => {
            reloadFeatureSuggestion(id, uid, (row) => {
              if (row && io) io.emit('feature_suggestion_created', row);
              res.json({ success: true, suggestion: row });
            });
          }
        );
      }
    );
  });

  router.post('/feature-suggestions/:id/vote', authenticateToken, (req, res) => {
    const uid = currentUserId(req);
    if (!uid) {
      return res.status(401).json({ success: false, error: 'Login required' });
    }
    const { id } = req.params;
    const raw = req.body && req.body.value;
    const value = raw === 1 || raw === '1' ? 1 : raw === -1 || raw === '-1' ? -1 : 0;
    db.get('SELECT id FROM feature_suggestions WHERE id = ?', [id], (err, row) => {
      if (err) return res.status(500).json({ success: false, error: 'Database error' });
      if (!row) return res.status(404).json({ success: false, error: 'Suggestion not found' });

      const after = () => {
        fetchVoteTotals(id, (totals) => {
          if (io) {
            io.emit('feature_suggestion_vote_updated', {
              id,
              votes: totals.vote_sum,
              vote_count: totals.vote_count,
            });
          }
          res.json({ success: true, votes: totals.vote_sum, vote_count: totals.vote_count, my_vote: value });
        });
      };

      if (value === 0) {
        db.run(
          'DELETE FROM suggestion_votes WHERE suggestion_id = ? AND user_id = ?',
          [id, uid],
          (e2) => {
            if (e2) return res.status(500).json({ success: false, error: 'Database error' });
            after();
          }
        );
      } else {
        db.run(
          `INSERT INTO suggestion_votes (suggestion_id, user_id, kind, value, created_at)
           VALUES (?, ?, 'feature', ?, datetime('now'))
           ON CONFLICT(suggestion_id, user_id) DO UPDATE SET value = excluded.value, created_at = datetime('now')`,
          [id, uid, value],
          (e2) => {
            if (e2) return res.status(500).json({ success: false, error: 'Database error' });
            after();
          }
        );
      }
    });
  });

  router.patch('/feature-suggestions/:id', requireRole(db, 'admin'), (req, res) => {
    const { id } = req.params;
    const { status, adminNote } = req.body || {};
    const actorId = currentUserId(req);

    const updates = [];
    const values = [];

    if (status !== undefined) {
      if (!FEATURE_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }
      updates.push('status = ?');
      values.push(status);
    }
    if (adminNote !== undefined) {
      updates.push('admin_note = ?');
      values.push(String(adminNote).slice(0, 1000));
    }
    if (!updates.length) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }
    updates.push("reviewed_by = ?");
    values.push(actorId);
    updates.push("reviewed_at = datetime('now')");

    values.push(id);
    db.run(
      `UPDATE feature_suggestions SET ${updates.join(', ')} WHERE id = ?`,
      values,
      function (err) {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });
        if (!this.changes) return res.status(404).json({ success: false, error: 'Suggestion not found' });
        logAudit(
          db,
          {
            actorId,
            action: 'suggestion.feature.update',
            entityType: 'feature_suggestion',
            entityId: id,
            metadata: { status, adminNote },
          },
          () => {
            reloadFeatureSuggestion(id, actorId, (row) => {
              if (row && io) io.emit('feature_suggestion_updated', row);
              res.json({ success: true, suggestion: row });
            });
          }
        );
      }
    );
  });

  router.delete('/feature-suggestions/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const uid = currentUserId(req);
    db.get(
      'SELECT user_id FROM feature_suggestions WHERE id = ?',
      [id],
      (err, row) => {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });
        if (!row) return res.status(404).json({ success: false, error: 'Suggestion not found' });
        db.get('SELECT role FROM users WHERE id = ?', [uid], (_e2, ur) => {
          const isAdmin = ur && ur.role === 'admin';
          if (!isAdmin && row.user_id !== uid) {
            return res.status(403).json({ success: false, error: 'Not allowed' });
          }
          db.run('DELETE FROM feature_suggestions WHERE id = ?', [id], (e3) => {
            if (e3) return res.status(500).json({ success: false, error: e3.message });
            db.run('DELETE FROM suggestion_votes WHERE suggestion_id = ?', [id], () => {});
            if (io) io.emit('feature_suggestion_deleted', { id });
            logAudit(
              db,
              {
                actorId: uid,
                action: 'suggestion.feature.delete',
                entityType: 'feature_suggestion',
                entityId: id,
                metadata: {},
              },
              () => res.json({ success: true })
            );
          });
        });
      }
    );
  });

  return router;
};

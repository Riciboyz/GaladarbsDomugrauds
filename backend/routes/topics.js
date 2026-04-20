const { Router } = require('express');
const crypto = require('crypto');
const { optionalAuth, currentUserId, requireRole, assertUserCanCreateContent } = require('../middleware/auth');
const { safeJsonParse, toIsoUtc } = require('../helpers/utils');
const { logAudit, touchLastActive } = require('../helpers/audit');

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
    const emit = (row) => {
      io.emit('daily_topic_active_set', row ? formatDailyTopicRow(row) : null);
    };
    db.get(
      `SELECT dt.*, u.username as cu, u.display_name as cdn
       FROM daily_topics dt JOIN users u ON dt.created_by = u.id
       WHERE dt.date = ? AND COALESCE(dt.status, 'published') = 'published'
       ORDER BY dt.created_at DESC LIMIT 1`,
      [today],
      (err, row) => {
        if (!err && row) {
          emit(row);
          return;
        }
        db.get(
          `SELECT dt.*, u.username as cu, u.display_name as cdn
           FROM daily_topics dt JOIN users u ON dt.created_by = u.id
           WHERE COALESCE(dt.status, 'published') = 'published' AND dt.date <= ?
           ORDER BY dt.date DESC, dt.created_at DESC LIMIT 1`,
          [today],
          (e2, latest) => {
            if (e2 || !latest) emit(null);
            else emit(latest);
          }
        );
      }
    );
  }

  function mapSubmissionRow(r, includeTopicId) {
    let text = r.content;
    let image_url = '';
    try {
      const parsed = JSON.parse(r.content);
      if (parsed && typeof parsed === 'object' && parsed.text !== undefined) {
        text = parsed.text;
        image_url = parsed.image_url || '';
      }
    } catch {
      /* plain text */
    }
    const o = {
      id: r.id,
      content: text,
      image_url,
      created_at: toIsoUtc(r.created_at),
      username: r.username,
      display_name: r.display_name,
      avatar: r.avatar,
    };
    if (includeTopicId) o.topic_id = r.topic_id;
    return o;
  }

  function ensureSampleDailyTopic() {
    const today = todayIso();
    db.get('SELECT id FROM users LIMIT 1', (e, u) => {
      if (!u || !u.id) return;
      db.get('SELECT id FROM daily_topics WHERE date = ?', [today], (_err, existing) => {
        if (existing) return;
        db.get('SELECT COUNT(*) as c FROM daily_topics', (_e2, row) => {
          if (!row || row.c > 0) return;
          const id = crypto.randomUUID();
          db.run(
            `INSERT INTO daily_topics (id, title, description, date, created_by, participants, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, '[]', 'published', datetime('now'), datetime('now'))`,
            [id, 'Daily reflection', 'Share something on your mind today.', today, u.id]
          );
        });
      });
    });
  }
  ensureSampleDailyTopic();

  function formatDailyTopicRow(row) {
    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      status: row.status || 'published',
      is_active: true,
      created_at: toIsoUtc(row.created_at),
      created_by_username: row.cu,
      created_by_display_name: row.cdn,
    };
  }

  function mapTopicDayRow(r) {
    return {
      id: r.id,
      title: r.title,
      description: r.description || '',
      date: r.date,
      status: r.status || 'published',
      maxParticipants: 100,
      participants: safeJsonParse(r.participants, []),
      created_by_username: r.created_by_username,
      created_by_display_name: r.created_by_display_name,
    };
  }

  /** Public: only published topics (for TopicDayContext / general use). */
  router.get('/topic-days', (_req, res) => {
    db.all(
      `SELECT dt.*, u.username as created_by_username, u.display_name as created_by_display_name
       FROM daily_topics dt JOIN users u ON dt.created_by = u.id
       WHERE COALESCE(dt.status, 'published') = 'published'
       ORDER BY dt.date DESC LIMIT 100`,
      (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, topicDays: (rows || []).map(mapTopicDayRow) });
      }
    );
  });

  router.get('/topic-days/manage', requireRole(db, 'admin'), (_req, res) => {
    db.all(
      `SELECT dt.*, u.username as created_by_username, u.display_name as created_by_display_name
       FROM daily_topics dt JOIN users u ON dt.created_by = u.id
       ORDER BY dt.date DESC LIMIT 500`,
      (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, topicDays: (rows || []).map(mapTopicDayRow) });
      }
    );
  });

  router.get('/topic-days/calendar', requireRole(db, 'admin'), (req, res) => {
    const y = parseInt(req.query.year, 10) || new Date().getFullYear();
    const m = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    if (m < 1 || m > 12) return res.status(400).json({ success: false, error: 'Invalid month' });
    const pad = (n) => String(n).padStart(2, '0');
    const start = `${y}-${pad(m)}-01`;
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`;
    db.all(
      `SELECT dt.*, u.username as created_by_username, u.display_name as created_by_display_name
       FROM daily_topics dt JOIN users u ON dt.created_by = u.id
       WHERE dt.date >= ? AND dt.date < ?
       ORDER BY dt.date ASC`,
      [start, nextMonth],
      (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, topicDays: (rows || []).map(mapTopicDayRow) });
      }
    );
  });

  router.get('/daily-topic', (_req, res) => {
    const today = todayIso();
    db.get(
      `SELECT dt.*, u.username as cu, u.display_name as cdn
       FROM daily_topics dt JOIN users u ON dt.created_by = u.id
       WHERE dt.date = ? AND COALESCE(dt.status, 'published') = 'published'
       ORDER BY dt.created_at DESC LIMIT 1`,
      [today],
      (err, row) => {
        if (!err && row) return res.json({ success: true, topic: formatDailyTopicRow(row) });
        db.get(
          `SELECT dt.*, u.username as cu, u.display_name as cdn
           FROM daily_topics dt JOIN users u ON dt.created_by = u.id
           WHERE COALESCE(dt.status, 'published') = 'published' AND dt.date <= ?
           ORDER BY dt.date DESC, dt.created_at DESC LIMIT 1`,
          [today],
          (e2, latest) => {
            if (e2 || !latest) return res.json({ success: true, topic: null });
            res.json({ success: true, topic: formatDailyTopicRow(latest) });
          }
        );
      }
    );
  });

  router.post('/topic-days/bulk-week', requireRole(db, 'admin'), (req, res) => {
    const startDate = String((req.body || {}).startDate || '').slice(0, 10);
    if (startDate.length < 10) {
      return res.status(400).json({ error: 'startDate (YYYY-MM-DD) required' });
    }
    const base = new Date(`${startDate}T12:00:00`);
    if (Number.isNaN(base.getTime())) return res.status(400).json({ error: 'Invalid startDate' });
    const titleList = Array.isArray(req.body.titles) && req.body.titles.length === 7 ? req.body.titles : null;
    const uid = currentUserId(req);
    const created = [];
    let idx = 0;
    const runNext = (err) => {
      if (err) return res.status(500).json({ error: err.message });
      if (idx >= 7) {
        return logAudit(
          db,
          {
            actorId: uid,
            action: 'topic.bulk_week',
            entityType: 'daily_topic',
            entityId: null,
            metadata: { startDate, count: created.length },
          },
          () => {
            broadcastActiveDailyTopic();
            res.json({ success: true, topicDays: created });
          }
        );
      }
      const i = idx++;
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const title =
        titleList && titleList[i] != null && String(titleList[i]).trim()
          ? String(titleList[i]).trim()
          : `Daily topic ${iso}`;
      const id = crypto.randomUUID();
      db.run(
        `INSERT INTO daily_topics (id, title, description, date, created_by, participants, status, created_at, updated_at)
         VALUES (?, ?, '', ?, ?, '[]', 'draft', datetime('now'), datetime('now'))`,
        [id, title, iso, uid],
        (e2) => {
          if (e2) return runNext(e2);
          created.push({ id, title, description: '', date: iso, status: 'draft' });
          runNext(null);
        }
      );
    };
    runNext(null);
  });

  router.post('/topic-days', requireRole(db, 'admin'), (req, res) => {
    const { title, description, date, maxParticipants, status } = req.body || {};
    if (!title || !date) return res.status(400).json({ error: 'title and date required' });
    if (date < todayIso()) return res.status(400).json({ error: 'Past dates are not allowed' });
    let st = status && ['draft', 'scheduled', 'published'].includes(status) ? status : null;
    if (!st) {
      st = date > todayIso() ? 'scheduled' : 'published';
    }
    const id = crypto.randomUUID();
    const uid = currentUserId(req);
    db.run(
      `INSERT INTO daily_topics (id, title, description, date, created_by, participants, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '[]', ?, datetime('now'), datetime('now'))`,
      [id, title, description || '', date, uid, st],
      (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        logAudit(
          db,
          {
            actorId: uid,
            action: 'topic.create',
            entityType: 'daily_topic',
            entityId: id,
            metadata: { title, date, status: st },
          },
          () => {
            broadcastActiveDailyTopic();
            res.json({
              success: true,
              topicDay: {
                id,
                title,
                description: description || '',
                date,
                status: st,
                maxParticipants: maxParticipants || 100,
                participants: [],
              },
            });
          }
        );
      }
    );
  });

  router.patch('/topic-days/:id/status', requireRole(db, 'admin'), (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!['draft', 'scheduled', 'published'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const actorId = currentUserId(req);
    db.run(
      'UPDATE daily_topics SET status = ?, updated_at = datetime("now") WHERE id = ?',
      [status, id],
      function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!this.changes) return res.status(404).json({ error: 'Topic day not found' });
        logAudit(
          db,
          { actorId, action: 'topic.status', entityType: 'daily_topic', entityId: id, metadata: { status } },
          () => {
            db.get(
              `SELECT dt.*, u.username as created_by_username, u.display_name as created_by_display_name
               FROM daily_topics dt JOIN users u ON dt.created_by = u.id WHERE dt.id = ?`,
              [id],
              (e, row) => {
                if (e || !row) return res.status(500).json({ error: 'Database error' });
                if (io) io.emit('daily_topic_updated', mapTopicDayRow(row));
                broadcastActiveDailyTopic();
                res.json({ success: true, topicDay: mapTopicDayRow(row) });
              }
            );
          }
        );
      }
    );
  });

  router.put('/topic-days/:id', requireRole(db, 'admin'), (req, res) => {
    const { id } = req.params;
    const { title, description, date } = req.body || {};
    db.get('SELECT * FROM daily_topics WHERE id = ?', [id], (err, before) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!before) return res.status(404).json({ error: 'Topic day not found' });

      const updates = [];
      const values = [];

      if (title !== undefined) {
        if (!String(title).trim()) return res.status(400).json({ error: 'title cannot be empty' });
        updates.push('title = ?');
        values.push(String(title).trim());
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(String(description));
      }
      if (date !== undefined) {
        if (!String(date).trim()) return res.status(400).json({ error: 'date cannot be empty' });
        updates.push('date = ?');
        values.push(String(date));
      }
      if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

      values.push(id);
      const actorId = currentUserId(req);
      db.run(`UPDATE daily_topics SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`, values, function (e2) {
        if (e2) return res.status(500).json({ error: 'Database error' });
        if (!this.changes) return res.status(404).json({ error: 'Topic day not found' });
        logAudit(
          db,
          {
            actorId,
            action: 'topic.update',
            entityType: 'daily_topic',
            entityId: id,
            metadata: {
              before: { title: before.title, description: before.description, date: before.date, status: before.status },
              after: { title, description, date },
            },
          },
          () => {
            db.get(
              `SELECT dt.*, u.username as created_by_username, u.display_name as created_by_display_name
               FROM daily_topics dt JOIN users u ON dt.created_by = u.id WHERE dt.id = ?`,
              [id],
              (e, row) => {
                if (e || !row) return res.status(500).json({ error: 'Database error' });
                if (io) io.emit('daily_topic_updated', mapTopicDayRow(row));
                broadcastActiveDailyTopic();
                res.json({ success: true, topicDay: mapTopicDayRow(row) });
              }
            );
          }
        );
      });
    });
  });

  router.delete('/topic-days/:id', requireRole(db, 'admin'), (req, res) => {
    const { id } = req.params;
    const actorId = currentUserId(req);
    db.get('SELECT title, date FROM daily_topics WHERE id = ?', [id], (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!row) return res.status(404).json({ error: 'Topic day not found' });
      db.run('DELETE FROM daily_topics WHERE id = ?', [id], function (e2) {
        if (e2) return res.status(500).json({ error: 'Database error' });
        if (!this.changes) return res.status(404).json({ error: 'Topic day not found' });
        logAudit(
          db,
          {
            actorId,
            action: 'topic.delete',
            entityType: 'daily_topic',
            entityId: id,
            metadata: { title: row.title, date: row.date },
          },
          () => {
            if (io) io.emit('daily_topic_deleted', { id });
            broadcastActiveDailyTopic();
            res.json({ success: true });
          }
        );
      });
    });
  });

  router.get('/topic-submissions', optionalAuth, (req, res) => {
    const topicId = req.query.topicId;
    if (!topicId) return res.status(400).json({ success: false, error: 'topicId required' });
    const uid = currentUserId(req);
    db.all(
      `SELECT ts.*, u.username, u.display_name, u.avatar
       FROM topic_submissions ts JOIN users u ON ts.user_id = u.id
       WHERE ts.topic_id = ? AND u.deleted_at IS NULL
       ORDER BY ts.created_at DESC`,
      [topicId],
      (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        let mySubmissionId = null;
        const submissions = (rows || []).map((r) => {
          if (r.user_id === uid) mySubmissionId = r.id;
          return mapSubmissionRow(r, false);
        });
        res.json({ success: true, submissions, mySubmissionId });
      }
    );
  });

  router.get('/topic-submissions/me', optionalAuth, (req, res) => {
    const topicId = req.query.topicId;
    if (!topicId) return res.status(400).json({ success: false, error: 'topicId required' });
    const uid = currentUserId(req);
    db.get(
      'SELECT id FROM topic_submissions WHERE topic_id = ? AND user_id = ? LIMIT 1',
      [topicId, uid],
      (err, row) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, hasSubmitted: !!row, submissionId: row ? row.id : null });
      }
    );
  });

  router.post('/topic-submissions', optionalAuth, assertUserCanCreateContent(db), (req, res) => {
    const { topicId, content, imageUrl } = req.body || {};
    if (!topicId || (!content && !imageUrl)) return res.status(400).json({ error: 'topicId and content or imageUrl required' });
    const uid = currentUserId(req);
    db.get(
      'SELECT id FROM topic_submissions WHERE topic_id = ? AND user_id = ? LIMIT 1',
      [topicId, uid],
      (existsErr, existing) => {
        if (existsErr) return res.status(500).json({ error: 'Database error' });
        if (existing) return res.status(409).json({ error: 'You have already submitted for this topic today', alreadySubmitted: true });

        const id = crypto.randomUUID();
        const stored = imageUrl ? JSON.stringify({ text: content || '', image_url: imageUrl }) : String(content);
        db.run(
          'INSERT INTO topic_submissions (id, topic_id, user_id, content, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
          [id, topicId, uid, stored],
          (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            touchLastActive(db, uid, () => {});
            db.get(
              `SELECT ts.*, u.username, u.display_name, u.avatar
               FROM topic_submissions ts JOIN users u ON ts.user_id = u.id
               WHERE ts.id = ? AND u.deleted_at IS NULL`,
              [id],
              (e2, r) => {
                if (!e2 && r && io) {
                  io.emit('topic_submission_created', mapSubmissionRow(r, true));
                }
                res.json({ success: true, id });
              }
            );
          }
        );
      }
    );
  });

  return router;
};

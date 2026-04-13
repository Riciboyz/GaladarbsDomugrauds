const { Router } = require('express');
const crypto = require('crypto');
const { optionalAuth, currentUserId } = require('../middleware/auth');
const { safeJsonParse } = require('../helpers/utils');

module.exports = function (db) {
  const router = Router();

  function ensureSampleDailyTopic() {
    const today = new Date().toISOString().slice(0, 10);
    db.get('SELECT id FROM users LIMIT 1', (e, u) => {
      if (!u || !u.id) return;
      db.get('SELECT id FROM daily_topics WHERE date = ?', [today], (_err, existing) => {
        if (existing) return;
        db.get('SELECT COUNT(*) as c FROM daily_topics', (_e2, row) => {
          if (!row || row.c > 0) return;
          const id = crypto.randomUUID();
          db.run(
            `INSERT INTO daily_topics (id, title, description, date, created_by, participants, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, '[]', datetime('now'), datetime('now'))`,
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
      is_active: true,
      created_at: row.created_at,
      created_by_username: row.cu,
      created_by_display_name: row.cdn
    };
  }

  router.get('/daily-topic', (_req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    db.get(
      `SELECT dt.*, u.username as cu, u.display_name as cdn
       FROM daily_topics dt JOIN users u ON dt.created_by = u.id
       WHERE dt.date = ? ORDER BY dt.created_at DESC LIMIT 1`,
      [today],
      (err, row) => {
        if (!err && row) return res.json({ success: true, topic: formatDailyTopicRow(row) });
        db.get(
          `SELECT dt.*, u.username as cu, u.display_name as cdn
           FROM daily_topics dt JOIN users u ON dt.created_by = u.id
           ORDER BY dt.date DESC, dt.created_at DESC LIMIT 1`,
          [],
          (e2, latest) => {
            if (e2 || !latest) return res.json({ success: true, topic: null });
            res.json({ success: true, topic: formatDailyTopicRow(latest) });
          }
        );
      }
    );
  });

  router.get('/topic-days', (_req, res) => {
    db.all(
      `SELECT dt.*, u.username as created_by_username, u.display_name as created_by_display_name
       FROM daily_topics dt JOIN users u ON dt.created_by = u.id
       ORDER BY dt.date DESC LIMIT 100`,
      (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        const topicDays = (rows || []).map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description || '',
          date: r.date,
          maxParticipants: 100,
          participants: safeJsonParse(r.participants, []),
          created_by_username: r.created_by_username,
          created_by_display_name: r.created_by_display_name
        }));
        res.json({ success: true, topicDays });
      }
    );
  });

  router.post('/topic-days', optionalAuth, (req, res) => {
    const { title, description, date, maxParticipants } = req.body || {};
    if (!title || !date) return res.status(400).json({ error: 'title and date required' });
    const id = crypto.randomUUID();
    const uid = currentUserId(req);
    db.run(
      `INSERT INTO daily_topics (id, title, description, date, created_by, participants, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '[]', datetime('now'), datetime('now'))`,
      [id, title, description || '', date, uid],
      (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({
          success: true,
          topicDay: { id, title, description: description || '', date, maxParticipants: maxParticipants || 100, participants: [] }
        });
      }
    );
  });

  router.get('/topic-submissions', (req, res) => {
    const topicId = req.query.topicId;
    if (!topicId) return res.status(400).json({ success: false, error: 'topicId required' });
    db.all(
      `SELECT ts.*, u.username, u.display_name, u.avatar
       FROM topic_submissions ts JOIN users u ON ts.user_id = u.id
       WHERE ts.topic_id = ? ORDER BY ts.created_at DESC`,
      [topicId],
      (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        const submissions = (rows || []).map((r) => {
          let text = r.content;
          let image_url = '';
          try {
            const parsed = JSON.parse(r.content);
            if (parsed && typeof parsed === 'object' && parsed.text !== undefined) {
              text = parsed.text;
              image_url = parsed.image_url || '';
            }
          } catch { /* plain text */ }
          return { id: r.id, content: text, image_url, created_at: r.created_at, username: r.username, display_name: r.display_name, avatar: r.avatar };
        });
        res.json({ success: true, submissions });
      }
    );
  });

  router.post('/topic-submissions', optionalAuth, (req, res) => {
    const { topicId, content, imageUrl } = req.body || {};
    if (!topicId || (!content && !imageUrl)) return res.status(400).json({ error: 'topicId and content or imageUrl required' });
    const id = crypto.randomUUID();
    const uid = currentUserId(req);
    const stored = imageUrl ? JSON.stringify({ text: content || '', image_url: imageUrl }) : String(content);
    db.run(
      'INSERT INTO topic_submissions (id, topic_id, user_id, content, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
      [id, topicId, uid, stored],
      (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, id });
      }
    );
  });

  return router;
};

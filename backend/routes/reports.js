const { Router } = require('express');
const crypto = require('crypto');
const { authenticateToken, currentUserId, requireAdmin, loadAuthUser } = require('../middleware/auth');
const { logAudit } = require('../helpers/audit');

module.exports = function (db) {
  const router = Router();

  router.post('/', authenticateToken, loadAuthUser(db), (req, res) => {
    const { threadId, reason } = req.body || {};
    const reporterId = currentUserId(req);
    if (!threadId) return res.status(400).json({ success: false, error: 'threadId required' });
    db.get('SELECT id FROM threads WHERE id = ?', [threadId], (err, thread) => {
      if (err) return res.status(500).json({ success: false, error: 'Database error' });
      if (!thread) return res.status(404).json({ success: false, error: 'Thread not found' });
      const id = crypto.randomUUID();
      db.run(
        `INSERT INTO content_reports (id, reporter_id, thread_id, reason, status, created_at)
         VALUES (?, ?, ?, ?, 'open', datetime('now'))`,
        [id, reporterId, threadId, reason ? String(reason).slice(0, 500) : ''],
        (e2) => {
          if (e2) return res.status(500).json({ success: false, error: 'Database error' });
          res.json({ success: true, id });
        }
      );
    });
  });

  router.get('/', requireAdmin(db), (req, res) => {
    const status = (req.query.status || '').trim();
    let sql = `SELECT r.*, u.username AS reporter_username, u.display_name AS reporter_display_name,
                      t.content AS thread_content, t.parent_id AS thread_parent_id, t.visibility
               FROM content_reports r
               JOIN users u ON u.id = r.reporter_id
               JOIN threads t ON t.id = r.thread_id
               WHERE 1=1`;
    const params = [];
    if (status && ['open', 'reviewed', 'dismissed'].includes(status)) {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY r.created_at DESC LIMIT 200';
    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: 'Database error' });
      res.json({ success: true, reports: rows || [] });
    });
  });

  router.patch('/:id', requireAdmin(db), (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!['reviewed', 'dismissed', 'open'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const actorId = req.user.id;
    db.run(
      `UPDATE content_reports SET status = ?, reviewed_by = ?, reviewed_at = datetime('now')
       WHERE id = ?`,
      [status, actorId, id],
      function (err) {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });
        if (!this.changes) return res.status(404).json({ success: false, error: 'Report not found' });
        logAudit(
          db,
          {
            actorId,
            action: 'report.status',
            entityType: 'content_report',
            entityId: id,
            metadata: { status }
          },
          () => res.json({ success: true })
        );
      }
    );
  });

  return router;
};

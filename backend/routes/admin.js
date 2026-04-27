const { Router } = require('express');
const { requireRole, currentUserId } = require('../middleware/auth');
const { toIsoUtc } = require('../helpers/utils');
const { logAudit } = require('../helpers/audit');

module.exports = function (db) {
  const router = Router();

  router.get('/stats', requireRole(db, 'admin'), (req, res) => {
    const date = (req.query.date || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const out = {
      date,
      newUsers: 0,
      topicSubmissions: 0,
    };

    db.get(
      'SELECT COUNT(*) AS c FROM users WHERE deleted_at IS NULL AND date(created_at) = date(?)',
      [date],
      (e1, r1) => {
        if (!e1 && r1) out.newUsers = r1.c;
        db.get(
          'SELECT COUNT(*) AS c FROM topic_submissions WHERE date(created_at) = date(?)',
          [date],
          (e2, r2) => {
            if (!e2 && r2) out.topicSubmissions = r2.c;
            res.json({ success: true, stats: out });
          }
        );
      }
    );
  });

  router.get('/dm-reports', requireRole(db, 'admin'), (req, res) => {
    const status = (req.query.status || '').trim();
    let sql = `SELECT r.*, rep.username AS reporter_username, rep.display_name AS reporter_display_name,
                      m.content AS message_content, m.sender_id, m.conversation_id,
                      s.username AS sender_username, s.display_name AS sender_display_name
               FROM dm_reports r
               JOIN users rep ON rep.id = r.reporter_id
               JOIN dm_messages m ON m.id = r.message_id
               JOIN users s ON s.id = m.sender_id
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

  router.patch('/dm-reports/:id', requireRole(db, 'admin'), (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!['reviewed', 'dismissed', 'open'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const actorId = currentUserId(req);
    db.run(
      `UPDATE dm_reports SET status = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?`,
      [status, actorId, id],
      function (err) {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });
        if (!this.changes) return res.status(404).json({ success: false, error: 'Report not found' });
        logAudit(
          db,
          {
            actorId,
            action: 'dm_report.status',
            entityType: 'dm_report',
            entityId: id,
            metadata: { status }
          },
          () => res.json({ success: true })
        );
      }
    );
  });

  router.get('/audit-logs', requireRole(db, 'admin'), (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;
    const actorId = (req.query.actorId || '').trim();
    const action = (req.query.action || '').trim();
    let sql = `SELECT a.id, a.actor_id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at,
                      u.username AS actor_username, u.display_name AS actor_display_name
               FROM audit_logs a
               JOIN users u ON u.id = a.actor_id
               WHERE 1=1`;
    const params = [];
    if (actorId) {
      sql += ' AND a.actor_id = ?';
      params.push(actorId);
    }
    if (action) {
      sql += ' AND a.action LIKE ?';
      params.push(`%${action}%`);
    }
    sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: 'Database error' });
      const logs = (rows || []).map((r) => ({
        id: r.id,
        actorId: r.actor_id,
        actorUsername: r.actor_username,
        actorDisplayName: r.actor_display_name,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        metadata: r.metadata,
        createdAt: toIsoUtc(r.created_at)
      }));
      res.json({ success: true, logs });
    });
  });

  return router;
};

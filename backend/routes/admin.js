const { Router } = require('express');
const { requireRole } = require('../middleware/auth');

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
      if (err) return res.status(500).json({ success: false, error: err.message });
      const logs = (rows || []).map((r) => ({
        id: r.id,
        actorId: r.actor_id,
        actorUsername: r.actor_username,
        actorDisplayName: r.actor_display_name,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        metadata: r.metadata,
        createdAt: r.created_at
      }));
      res.json({ success: true, logs });
    });
  });

  return router;
};

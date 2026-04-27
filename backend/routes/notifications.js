const { Router } = require('express');
const crypto = require('crypto');
const { authenticateToken, currentUserId } = require('../middleware/auth');
const { safeJsonParse, toIsoUtc } = require('../helpers/utils');

module.exports = function (db, io) {
  const router = Router();

  function mapNotification(row) {
    const data = safeJsonParse(row.data, {});
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      message: row.message || row.title || '',
      read: !!row.read,
      createdAt: toIsoUtc(row.created_at),
      relatedId: data.relatedId,
      title: row.title
    };
  }

  router.get('/', authenticateToken, (req, res) => {
    const userId = currentUserId(req);
    db.all(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
      (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, notifications: (rows || []).map(mapNotification) });
      }
    );
  });

  router.post('/send', authenticateToken, (req, res) => {
    const { type, fromUserId, toUserId, message, data } = req.body || {};
    if (!type || !toUserId || !message) return res.status(400).json({ error: 'Missing required fields' });
    const senderId = currentUserId(req);
    if (!senderId) return res.status(401).json({ error: 'Login required' });
    if (fromUserId && fromUserId !== senderId) return res.status(403).json({ error: 'Forbidden' });
    const notificationId = crypto.randomUUID();
    const dataJson = JSON.stringify({ ...(data || {}), fromUserId: senderId });
    const title = String(type);
    db.run(
      `INSERT INTO notifications (id, user_id, type, title, message, read, data, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, datetime('now'))`,
      [notificationId, toUserId, type, title, message, dataJson],
      function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        const row = {
          id: notificationId,
          user_id: toUserId,
          type,
          title,
          message,
          read: 0,
          data: dataJson,
          created_at: new Date().toISOString()
        };
        const notification = mapNotification(row);
        if (io) {
          io.to(`user:${toUserId}`).emit('new_notification', notification);
        }
        res.json({ success: true, notification });
      }
    );
  });

  function markOneRead(notificationId, req, res) {
    const userId = currentUserId(req);
    db.run('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', [notificationId, userId], function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!this.changes) return res.status(404).json({ error: 'Notification not found' });
      res.json({ success: true, message: 'Notification marked as read' });
    });
  }

  router.post('/:id/read', authenticateToken, (req, res) => markOneRead(req.params.id, req, res));
  router.put('/:id/read', authenticateToken, (req, res) => markOneRead(req.params.id, req, res));

  function markAllRead(req, res) {
    const userId = currentUserId(req);
    db.run('UPDATE notifications SET read = 1 WHERE user_id = ?', [userId], (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true, message: 'All notifications marked as read' });
    });
  }

  router.post('/read-all', authenticateToken, markAllRead);
  router.put('/read-all', authenticateToken, markAllRead);

  return router;
};

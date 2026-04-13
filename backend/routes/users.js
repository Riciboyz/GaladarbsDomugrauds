const { Router } = require('express');
const { optionalAuth, currentUserId } = require('../middleware/auth');
const { mapUserPublic } = require('../helpers/utils');

module.exports = function (db) {
  const router = Router();

  router.get('/', (_req, res) => {
    db.all(
      'SELECT id, username, display_name, email, avatar, bio, created_at FROM users ORDER BY username',
      (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error', details: err.message });
        res.json({ success: true, users: rows.map(mapUserPublic) });
      }
    );
  });

  router.get('/search', (req, res) => {
    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    if (!q) return res.json({ success: true, users: [] });
    const like = `%${q}%`;
    db.all(
      `SELECT id, username, display_name, email, avatar, bio, created_at FROM users
       WHERE username LIKE ? OR display_name LIKE ? OR email LIKE ?
       LIMIT ?`,
      [like, like, like, limit],
      (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, users: rows.map(mapUserPublic) });
      }
    );
  });

  router.get('/followers', (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.json({ success: true, followers: [] });
    db.all(
      `SELECT u.id, u.username, u.display_name, u.avatar as avatar_url
       FROM users u INNER JOIN followers f ON u.id = f.follower_id
       WHERE f.following_id = ?`,
      [userId],
      (err, rows) => {
        if (err) return res.json({ success: true, followers: [] });
        res.json({ success: true, followers: rows || [] });
      }
    );
  });

  router.get('/following', (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.json({ success: true, following: [] });
    db.all(
      `SELECT u.id, u.username, u.display_name, u.avatar as avatar_url
       FROM users u INNER JOIN followers f ON u.id = f.following_id
       WHERE f.follower_id = ?`,
      [userId],
      (err, rows) => {
        if (err) return res.json({ success: true, following: [] });
        res.json({ success: true, following: rows || [] });
      }
    );
  });

  router.post('/follow', optionalAuth, (req, res) => {
    const { userId, action } = req.body;
    const uid = currentUserId(req);
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    if (userId === uid) return res.status(400).json({ error: 'Cannot follow yourself' });

    const doUnfollow = () => {
      db.run('DELETE FROM followers WHERE follower_id = ? AND following_id = ?', [uid, userId], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, message: 'Unfollowed user', following: false });
      });
    };
    const doFollow = () => {
      db.run('INSERT OR IGNORE INTO followers (follower_id, following_id, created_at) VALUES (?, ?, datetime("now"))', [uid, userId], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, message: 'Followed user', following: true });
      });
    };

    if (action === 'unfollow') return doUnfollow();
    if (action === 'follow') return doFollow();
    db.get('SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?', [uid, userId], (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      row ? doUnfollow() : doFollow();
    });
  });

  router.get('/:id', (req, res) => {
    db.get(
      'SELECT id, username, display_name, email, avatar as avatar_url, bio, created_at FROM users WHERE id = ?',
      [req.params.id],
      (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, user: row });
      }
    );
  });

  router.put('/:id', (req, res) => {
    const userId = req.params.id;
    const { displayName, bio, avatar } = req.body;
    const updates = [];
    const values = [];
    if (displayName !== undefined) { updates.push('display_name = ?'); values.push(displayName); }
    if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }
    if (avatar !== undefined) { updates.push('avatar = ?'); values.push(avatar); }
    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
    values.push(userId);
    db.run(`UPDATE users SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`, values, function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      db.get('SELECT id, username, display_name, email, avatar as avatar_url, bio FROM users WHERE id = ?', [userId], (e, row) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, user: row });
      });
    });
  });

  return router;
};

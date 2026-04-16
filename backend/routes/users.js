const { Router } = require('express');
const { authenticateToken, optionalAuth, currentUserId, requireRole } = require('../middleware/auth');
const { mapUserPublic, mapUserAdmin } = require('../helpers/utils');
const { logAudit } = require('../helpers/audit');

module.exports = function (db) {
  const router = Router();

  router.get('/', (_req, res) => {
    db.all(
      `SELECT id, username, display_name, email, avatar, bio, created_at FROM users
       WHERE deleted_at IS NULL ORDER BY username`,
      (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error', details: err.message });
        res.json({ success: true, users: rows.map(mapUserPublic) });
      }
    );
  });

  router.get('/admin/all', requireRole(db, 'admin'), (req, res) => {
    const q = (req.query.q || '').trim();
    const roleFilter = (req.query.role || '').trim();
    const includeDeleted = req.query.includeDeleted === '1';
    let sql = `SELECT id, username, display_name, email, role, avatar, bio, created_at,
                      banned_until, muted_until, deleted_at, last_active_at
               FROM users WHERE 1=1`;
    const params = [];
    if (!includeDeleted) {
      sql += ' AND deleted_at IS NULL';
    }
    if (q) {
      sql += ' AND (username LIKE ? OR display_name LIKE ? OR email LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (roleFilter && ['user', 'admin'].includes(roleFilter)) {
      sql += ' AND role = ?';
      params.push(roleFilter);
    }
    sql += ' ORDER BY created_at DESC LIMIT 500';
    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });
      res.json({ success: true, users: (rows || []).map(mapUserAdmin) });
    });
  });

  router.get('/search', (req, res) => {
    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    if (!q) return res.json({ success: true, users: [] });
    const like = `%${q}%`;
    db.all(
      `SELECT id, username, display_name, email, avatar, bio, created_at FROM users
       WHERE deleted_at IS NULL AND (username LIKE ? OR display_name LIKE ? OR email LIKE ?)
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
       WHERE f.following_id = ? AND u.deleted_at IS NULL`,
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
       WHERE f.follower_id = ? AND u.deleted_at IS NULL`,
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
      db.run(
        'INSERT OR IGNORE INTO followers (follower_id, following_id, created_at) VALUES (?, ?, datetime("now"))',
        [uid, userId],
        (err) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          res.json({ success: true, message: 'Followed user', following: true });
        }
      );
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
      `SELECT id, username, display_name, email, avatar as avatar_url, bio, created_at FROM users
       WHERE id = ? AND deleted_at IS NULL`,
      [req.params.id],
      (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, user: row });
      }
    );
  });

  router.put('/:id', authenticateToken, (req, res) => {
    const userId = req.params.id;
    if (!req.user?.id || req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { username, displayName, bio, avatar } = req.body;
    const updates = [];
    const values = [];
    const nextUsername = typeof username === 'string' ? username.trim() : username;

    if (nextUsername !== undefined) {
      if (!nextUsername) return res.status(400).json({ error: 'Username is required' });
      if (typeof nextUsername !== 'string') return res.status(400).json({ error: 'Invalid username' });
      if (nextUsername.length < 3 || nextUsername.length > 30) {
        return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(nextUsername)) {
        return res.status(400).json({ error: 'Username may contain only letters, numbers, and underscores' });
      }
      updates.push('username = ?');
      values.push(nextUsername);
    }
    if (displayName !== undefined) {
      updates.push('display_name = ?');
      values.push(displayName);
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(bio);
    }
    if (avatar !== undefined) {
      updates.push('avatar = ?');
      values.push(avatar);
    }
    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

    const runUpdate = () => {
      values.push(userId);
      db.run(`UPDATE users SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`, values, function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        db.get(
          'SELECT id, username, display_name, email, avatar, bio, created_at FROM users WHERE id = ?',
          [userId],
          (e, row) => {
            if (e) return res.status(500).json({ error: 'Database error' });
            if (!row) return res.status(404).json({ error: 'User not found' });
            res.json({ success: true, user: mapUserPublic(row) });
          }
        );
      });
    };

    if (nextUsername !== undefined) {
      db.get('SELECT id FROM users WHERE username = ? AND id != ?', [nextUsername, userId], (checkErr, existing) => {
        if (checkErr) return res.status(500).json({ error: 'Database error' });
        if (existing) return res.status(400).json({ error: 'Username already taken' });
        runUpdate();
      });
    } else {
      runUpdate();
    }
  });

  router.patch('/admin/:id', requireRole(db, 'admin'), (req, res) => {
    const targetId = req.params.id;
    const actorId = req.user.id;
    const { role, bannedUntil, mutedUntil } = req.body || {};

    db.get('SELECT * FROM users WHERE id = ?', [targetId], (err, before) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!before) return res.status(404).json({ error: 'User not found' });

      const updates = [];
      const values = [];
      if (role !== undefined) {
        if (!['user', 'admin'].includes(role)) {
          return res.status(400).json({ error: 'Invalid role' });
        }
        if (targetId === actorId && role !== 'admin') {
          return res.status(400).json({ error: 'You cannot remove your own admin role' });
        }
        updates.push('role = ?');
        values.push(role);
      }
      if (bannedUntil !== undefined) {
        updates.push('banned_until = ?');
        values.push(bannedUntil === null || bannedUntil === '' ? null : String(bannedUntil));
      }
      if (mutedUntil !== undefined) {
        updates.push('muted_until = ?');
        values.push(mutedUntil === null || mutedUntil === '' ? null : String(mutedUntil));
      }
      if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

      values.push(targetId);
      db.run(`UPDATE users SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`, values, function (e2) {
        if (e2) return res.status(500).json({ error: 'Database error' });
        logAudit(
          db,
          {
            actorId,
            action: 'user.patch',
            entityType: 'user',
            entityId: targetId,
            metadata: { before: { role: before.role, banned_until: before.banned_until, muted_until: before.muted_until }, body: req.body }
          },
          () => {
            db.get(
              `SELECT id, username, display_name, email, role, avatar, bio, created_at,
                      banned_until, muted_until, deleted_at, last_active_at FROM users WHERE id = ?`,
              [targetId],
              (e3, row) => {
                if (e3 || !row) return res.status(500).json({ error: 'Database error' });
                res.json({ success: true, user: mapUserAdmin(row) });
              }
            );
          }
        );
      });
    });
  });

  router.post('/admin/:id/restore', requireRole(db, 'admin'), (req, res) => {
    const targetId = req.params.id;
    const actorId = req.user.id;
    db.run(
      'UPDATE users SET deleted_at = NULL, deleted_by = NULL, updated_at = datetime("now") WHERE id = ?',
      [targetId],
      function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!this.changes) return res.status(404).json({ error: 'User not found' });
        logAudit(db, { actorId, action: 'user.restore', entityType: 'user', entityId: targetId, metadata: {} }, () => {
          db.get(
            `SELECT id, username, display_name, email, role, avatar, bio, created_at,
                    banned_until, muted_until, deleted_at, last_active_at FROM users WHERE id = ?`,
            [targetId],
            (e, row) => {
              if (e || !row) return res.status(500).json({ error: 'Database error' });
              res.json({ success: true, user: mapUserAdmin(row) });
            }
          );
        });
      }
    );
  });

  router.delete('/admin/:id', requireRole(db, 'admin'), (req, res) => {
    const targetId = req.params.id;
    const adminId = req.user.id;
    if (targetId === adminId) {
      return res.status(400).json({ error: 'You cannot delete your own admin account' });
    }
    db.run(
      'UPDATE users SET deleted_at = datetime("now"), deleted_by = ?, updated_at = datetime("now") WHERE id = ? AND deleted_at IS NULL',
      [adminId, targetId],
      function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!this.changes) return res.status(404).json({ error: 'User not found or already deleted' });
        logAudit(db, { actorId: adminId, action: 'user.soft_delete', entityType: 'user', entityId: targetId, metadata: {} }, () => {
          res.json({ success: true });
        });
      }
    );
  });

  return router;
};

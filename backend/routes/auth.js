const { Router } = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, getTokenFromRequest, isBanned } = require('../middleware/auth');
const { touchLastActive } = require('../helpers/audit');
const { toIsoUtc } = require('../helpers/utils');

module.exports = function (db) {
  const router = Router();

  function authCookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 24 * 60 * 60 * 1000
    };
  }

  router.post('/register', (req, res) => {
    const { username, email, password, display_name } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    const pwdChecks = [
      [/.{8,}/, 'vismaz 8 rakstzīmes'],
      [/[A-Z]/, 'lielais burts'],
      [/[a-z]/, 'mazais burts'],
      [/[0-9]/, 'cipars'],
      [/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/, 'speciālais simbols'],
    ];
    const missing = pwdChecks.filter(([re]) => !re.test(password)).map(([, label]) => label);
    if (missing.length) {
      return res.status(400).json({
        error: `Parolei nepieciešams: ${missing.join(', ')}.`,
      });
    }
    db.get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username], (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (row) return res.status(400).json({ error: 'User already exists' });

      const userId = crypto.randomUUID();
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.run(
        'INSERT INTO users (id, username, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
        [userId, username, email, hashedPassword, display_name || username],
        function (insertErr) {
          if (insertErr) return res.status(500).json({ error: 'Database error' });
          touchLastActive(db, userId, () => {});
          const token = jwt.sign({ id: userId, username, email }, JWT_SECRET, { expiresIn: '24h' });
          res.cookie('auth-token', token, authCookieOptions());
          res.json({
            success: true,
            user: { id: userId, username, email, displayName: display_name || username, role: 'user' }
          });
        }
      );
    });
  });

  router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!row) return res.status(401).json({ error: 'Invalid credentials' });

      const hash = String(row.password_hash || '');
      if (!hash.startsWith('$2')) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const ok = bcrypt.compareSync(password, hash);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

      if (row.deleted_at) return res.status(403).json({ error: 'Account deleted' });
      if (isBanned(row)) return res.status(403).json({ error: 'Account suspended' });

      touchLastActive(db, row.id, () => {});

      const token = jwt.sign({ id: row.id, username: row.username, email: row.email }, JWT_SECRET, { expiresIn: '24h' });
      res.cookie('auth-token', token, authCookieOptions());
      res.json({
        success: true,
        user: {
          id: row.id,
          username: row.username,
          email: row.email,
          displayName: row.display_name,
          avatar: row.avatar,
          role: row.role || 'user'
        }
      });
    });
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie('auth-token', { path: '/' });
    res.json({ success: true });
  });

  router.post('/2fa/verify', (_req, res) => {
    res.json({ success: true });
  });

  router.get('/me', (req, res) => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ success: false, error: 'Invalid token' });
      db.get(
        `SELECT id, username, email, display_name, avatar, bio, role, created_at,
                deleted_at, banned_until, muted_until
         FROM users WHERE id = ?`,
        [user.id],
        (e, row) => {
          if (e || !row) return res.status(404).json({ success: false, error: 'User not found' });
          if (row.deleted_at) return res.status(403).json({ success: false, error: 'Account deleted' });
          if (isBanned(row)) return res.status(403).json({ success: false, error: 'Account suspended' });
          touchLastActive(db, row.id, () => {});
          // Read follow relationships from the join table so /me always reflects
          // the latest state instead of the stale users.following/followers JSON columns.
          db.all(
            `SELECT follower_id, following_id FROM followers
             WHERE follower_id = ? OR following_id = ?`,
            [row.id, row.id],
            (fErr, fRows) => {
              const rows = Array.isArray(fRows) ? fRows : [];
              const following = rows
                .filter(r => r.follower_id === row.id)
                .map(r => r.following_id);
              const followers = rows
                .filter(r => r.following_id === row.id)
                .map(r => r.follower_id);
              res.json({
                success: true,
                user: {
                  id: row.id,
                  username: row.username,
                  email: row.email,
                  displayName: row.display_name,
                  avatar: row.avatar,
                  bio: row.bio,
                  role: row.role || 'user',
                  followers,
                  following,
                  createdAt: toIsoUtc(row.created_at)
                }
              });
            }
          );
        }
      );
    });
  });

  return router;
};

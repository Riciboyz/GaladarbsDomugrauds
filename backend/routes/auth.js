const { Router } = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

module.exports = function (db) {
  const router = Router();

  router.post('/register', (req, res) => {
    const { username, email, password, display_name } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
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
          const token = jwt.sign({ id: userId, username, email }, JWT_SECRET, { expiresIn: '24h' });
          res.json({
            success: true,
            token,
            user: { id: userId, username, email, displayName: display_name || username }
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

      let ok = false;
      if (row.password_hash && String(row.password_hash).startsWith('$2')) {
        ok = bcrypt.compareSync(password, row.password_hash);
      } else {
        ok = password === row.password_hash;
      }
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ id: row.id, username: row.username, email: row.email }, JWT_SECRET, { expiresIn: '24h' });
      res.json({
        success: true,
        token,
        user: {
          id: row.id,
          username: row.username,
          email: row.email,
          displayName: row.display_name,
          avatar: row.avatar
        }
      });
    });
  });

  router.post('/logout', (_req, res) => {
    res.json({ success: true });
  });

  router.post('/2fa/verify', (_req, res) => {
    res.json({ success: true });
  });

  router.get('/me', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ success: false, error: 'Invalid token' });
      db.get(
        'SELECT id, username, email, display_name, avatar FROM users WHERE id = ?',
        [user.id],
        (e, row) => {
          if (e || !row) return res.status(404).json({ success: false, error: 'User not found' });
          res.json({
            success: true,
            user: {
              id: row.id,
              username: row.username,
              email: row.email,
              displayName: row.display_name,
              avatar: row.avatar
            }
          });
        }
      );
    });
  });

  return router;
};

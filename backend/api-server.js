const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const dbPath = path.join(process.cwd(), '..', 'threads_app.db');
const db = new sqlite3.Database(dbPath);

// JWT Secret (in production, use environment variable)
const JWT_SECRET = 'your-secret-key';

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Get threads
app.get('/api/threads', (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  db.all(
    `SELECT t.*, u.username, u.display_name, u.avatar as avatar_url 
     FROM threads t 
     JOIN users u ON t.author_id = u.id 
     ORDER BY t.created_at DESC 
     LIMIT ? OFFSET ?`,
    [limit, offset],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      console.log('Threads query successful, found', rows.length, 'threads');
      res.json({ success: true, threads: rows });
    }
  );
});

// Get users
app.get('/api/users', (req, res) => {
  db.all('SELECT id, username, display_name, avatar as avatar_url, created_at FROM users', (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.json({ success: true, users: rows });
  });
});

// Get notifications
app.get('/api/notifications', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  db.all(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, notifications: rows });
    }
  );
});

// Get groups
app.get('/api/groups', (req, res) => {
  db.all('SELECT * FROM groups ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, groups: rows });
  });
});

// Get daily topic
app.get('/api/daily-topic', (req, res) => {
  db.get(
    'SELECT * FROM topic_days WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1',
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, topic: row });
    }
  );
});

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Simple password check (in production, use bcrypt)
      if (user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          email: user.email,
          avatar_url: user.avatar_url
        }
      });
    }
  );
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  db.get(
    'SELECT id, username, display_name, email, avatar_url FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ success: true, user });
    }
  );
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});

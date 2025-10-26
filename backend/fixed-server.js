const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const dbPath = path.join(process.cwd(), '..', 'threads_app.db');
const db = new sqlite3.Database(dbPath);

// JWT Secret
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

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    websocket: 'enabled',
    connections: io.engine.clientsCount
  });
});

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const bcrypt = require('bcryptjs');
    if (!bcrypt.compareSync(password, row.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: row.id, username: row.username, email: row.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: row.id,
        username: row.username,
        email: row.email,
        displayName: row.display_name,
        avatar: row.avatar,
        bio: row.bio
      }
    });
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, username, displayName } = req.body;
  
  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Email, password, and username required' });
  }

  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    'INSERT INTO users (id, email, password_hash, username, display_name) VALUES (?, ?, ?, ?, ?)',
    [require('uuid').v4(), email, hashedPassword, username, displayName || username],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ success: true, message: 'User created successfully' });
    }
  );
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: row.id,
        username: row.username,
        email: row.email,
        displayName: row.display_name,
        avatar: row.avatar,
        bio: row.bio
      }
    });
  });
});

// Threads routes
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

app.post('/api/threads', authenticateToken, (req, res) => {
  const { content, parentId, groupId, topicDayId, attachments, visibility } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const threadId = require('uuid').v4();
  const attachmentsJson = JSON.stringify(attachments || []);

  db.run(
    `INSERT INTO threads (id, author_id, content, parent_id, group_id, topic_day_id, attachments, visibility, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [threadId, req.user.id, content, parentId, groupId, topicDayId, attachmentsJson, visibility || 'public'],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      // Get the created thread with user info
      db.get(
        `SELECT t.*, u.username, u.display_name, u.avatar as avatar_url 
         FROM threads t 
         JOIN users u ON t.author_id = u.id 
         WHERE t.id = ?`,
        [threadId],
        (err, row) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          res.json({
            success: true,
            thread: row
          });
        }
      );
    }
  );
});

// Users routes
app.get('/api/users', (req, res) => {
  db.all('SELECT id, username, display_name, avatar, bio FROM users ORDER BY username', (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.json({ success: true, users: rows });
  });
});

// Groups routes
app.get('/api/groups', (req, res) => {
  db.all('SELECT * FROM groups ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.json({ success: true, groups: rows });
  });
});

app.post('/api/groups', authenticateToken, (req, res) => {
  const { name, description, isPrivate } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  const groupId = require('uuid').v4();

  db.run(
    'INSERT INTO groups (id, name, description, is_private, created_by, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
    [groupId, name, description, isPrivate || false, req.user.id],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      res.json({
        success: true,
        group: {
          id: groupId,
          name,
          description,
          isPrivate: isPrivate || false,
          createdBy: req.user.id
        }
      });
    }
  );
});

// Notifications routes
app.get('/api/notifications', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  db.all(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      res.json({ success: true, notifications: rows });
    }
  );
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });

  // Handle thread creation
  socket.on('create_thread', (data) => {
    console.log('📝 New thread created:', data.content);
    socket.broadcast.emit('new_thread', data);
  });

  // Handle thread updates
  socket.on('update_thread', (data) => {
    console.log('✏️ Thread updated:', data.id);
    socket.broadcast.emit('thread_updated', data);
  });

  // Handle notifications
  socket.on('send_notification', (data) => {
    console.log('🔔 Notification sent:', data.message);
    socket.broadcast.emit('new_notification', data);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Combined API + WebSocket Server running on port ${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`📱 Frontend: http://localhost:3000`);
});

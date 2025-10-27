const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3002"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

const PORT = 3001;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Database connection
const dbPath = path.join(__dirname, '..', 'threads_app.db');
console.log('📊 Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Connected to database');
  }
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  socket.on('create_thread', (data) => {
    io.emit('new_thread', data);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Get threads
app.get('/api/threads', (req, res) => {
  console.log('📥 GET /api/threads');
  
  db.all('SELECT t.*, u.username, u.display_name, u.avatar FROM threads t LEFT JOIN users u ON t.author_id = u.id ORDER BY t.created_at DESC LIMIT 50', [], (err, rows) => {
    if (err) {
      console.error('❌ Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    const threads = rows.map(row => ({
      id: row.id,
      authorId: row.author_id,
      author: {
        id: row.author_id,
        username: row.username,
        displayName: row.display_name,
        avatar: row.avatar
      },
      content: row.content,
      visibility: row.visibility,
      likes: JSON.parse(row.likes || '[]'),
      dislikes: JSON.parse(row.dislikes || '[]'),
      comments: [],
      attachments: JSON.parse(row.attachments || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.json({ success: true, threads });
  });
});

// Create thread
app.post('/api/threads', (req, res) => {
  console.log('📥 POST /api/threads', req.body);
  
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  
  const threadId = require('crypto').randomUUID();
  const author_id = '550e8400-e29b-41d4-a716-446655440000';
  
  db.run(
    `INSERT INTO threads (id, author_id, content, visibility, likes, dislikes, created_at, updated_at)
     VALUES (?, ?, ?, 'public', '[]', '[]', datetime('now'), datetime('now'))`,
    [threadId, author_id, content],
    function(err) {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      const thread = {
        id: threadId,
        authorId: author_id,
        content,
        visibility: 'public',
        likes: [],
        dislikes: [],
        comments: [],
        createdAt: new Date().toISOString()
      };
      
      io.emit('new_thread', thread);
      res.json({ success: true, thread });
    }
  );
});

// Like thread
app.put('/api/threads/:id', (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  
  db.get('SELECT likes, dislikes FROM threads WHERE id = ?', [id], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    
    let likes = JSON.parse(row.likes || '[]');
    let dislikes = JSON.parse(row.dislikes || '[]');
    
    if (action === 'like') {
      if (!likes.includes(userId)) likes.push(userId);
      dislikes = dislikes.filter(id => id !== userId);
    } else if (action === 'unlike') {
      likes = likes.filter(id => id !== userId);
    }
    
    db.run('UPDATE threads SET likes = ?, dislikes = ? WHERE id = ?', 
      [JSON.stringify(likes), JSON.stringify(dislikes), id],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, likes, dislikes });
      }
    );
  });
});

// Delete thread
app.delete('/api/threads/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM threads WHERE id = ?', [id], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true });
  });
});

// Get users
app.get('/api/users', (req, res) => {
  console.log('📥 GET /api/users');
  
  db.all('SELECT id, username, display_name as displayName, avatar, bio, created_at as createdAt FROM users', [], (err, rows) => {
    if (err) {
      console.error('❌ Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    const users = rows.map(user => ({
      ...user,
      followers: [],
      following: [],
      email: user.username + '@example.com'
    }));
    
    res.json({ success: true, users });
  });
});

// Get user by ID
app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT id, username, display_name as displayName, avatar, bio, created_at as createdAt FROM users WHERE id = ?', [id], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = {
      ...row,
      followers: [],
      following: [],
      email: row.username + '@example.com'
    };
    
    res.json({ success: true, user });
  });
});

// Update user profile
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { displayName, bio, avatar } = req.body;
  
  db.run(
    'UPDATE users SET display_name = ?, bio = ?, avatar = ? WHERE id = ?',
    [displayName, bio, avatar, id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({ 
        success: true, 
        user: { id, displayName, bio, avatar }
      });
    }
  );
});

// Follow user
app.post('/api/users/follow', (req, res) => {
  res.json({ success: true, message: 'Follow successful' });
});

// Get followers
app.get('/api/users/followers', (req, res) => {
  res.json({ success: true, followers: [] });
});

// Get following
app.get('/api/users/following', (req, res) => {
  res.json({ success: true, following: [] });
});

// Get groups
app.get('/api/groups', (req, res) => {
  console.log('📥 GET /api/groups');
  
  db.all('SELECT * FROM groups', [], (err, rows) => {
    if (err) {
      console.error('❌ Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    const groups = (rows || []).map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      isPrivate: group.visibility === 'private',
      createdBy: group.created_by,
      members: JSON.parse(group.members || '[]'),
      avatar: group.avatar,
      createdAt: group.created_at
    }));
    
    res.json({ success: true, groups });
  });
});

// Create group
app.post('/api/groups', (req, res) => {
  const { name, description } = req.body;
  const groupId = require('crypto').randomUUID();
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  
  db.run(
    `INSERT INTO groups (id, name, description, visibility, created_by, members, created_at)
     VALUES (?, ?, ?, 'public', ?, '[]', datetime('now'))`,
    [groupId, name, description, userId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({ 
        success: true, 
        group: { id: groupId, name, description, isPrivate: false, createdBy: userId, members: [] }
      });
    }
  );
});

// Join group
app.post('/api/groups/join', (req, res) => {
  res.json({ success: true, message: 'Joined group' });
});

// Auth endpoints
app.get('/api/auth/me', (req, res) => {
  res.json({ success: false, error: 'Not authenticated' });
});

app.post('/api/auth/login', (req, res) => {
  res.json({ success: false, error: 'Login not implemented' });
});

app.post('/api/auth/register', (req, res) => {
  res.json({ success: false, error: 'Registration not implemented' });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

// Notifications
app.get('/api/notifications', (req, res) => {
  res.json({ success: true, notifications: [] });
});

app.post('/api/notifications/read-all', (req, res) => {
  res.json({ success: true });
});

// Daily topic
app.get('/api/daily-topic', (req, res) => {
  res.json({ success: true, topic: null });
});

// Weather
app.get('/api/weather', (req, res) => {
  res.json({
    success: true,
    current: {
      temperature_2m: 15,
      weather_code: 3,
      is_day: 1,
      wind_speed_10m: 10,
      relative_humidity_2m: 65,
      rain: 0,
      snowfall: 0
    },
    location: {
      latitude: 57.31,
      longitude: 25.27,
      name: 'Rezekne'
    }
  });
});

// Catch-all
app.all('/api/*', (req, res) => {
  console.log(`📥 ${req.method} ${req.path} - Returning success`);
  res.json({ success: true, message: 'Endpoint acknowledged', data: [] });
});

server.listen(PORT, () => {
  console.log(`🚀 Full server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});

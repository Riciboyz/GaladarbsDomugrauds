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
    origin: ["http://localhost:3000", "http://localhost:3002", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.set('trust proxy', 1);

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

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // Handle thread creation
  socket.on('create_thread', (data) => {
    console.log('📝 New thread created:', data.content);
    
    // Broadcast to all connected clients
    socket.broadcast.emit('new_thread', data);
  });

  // Handle thread updates
  socket.on('update_thread', (data) => {
    console.log('✏️ Thread updated:', data.id);
    socket.broadcast.emit('thread_updated', data);
  });

  // Handle thread likes/dislikes
  socket.on('thread_reaction', (data) => {
    console.log('👍 Thread reaction:', data.type, 'for thread', data.threadId);
    socket.broadcast.emit('thread_reaction_update', data);
  });

  // Handle notifications
  socket.on('send_notification', (data) => {
    console.log('🔔 Notification sent:', data.message);
    socket.broadcast.emit('new_notification', data);
  });

  // Handle group chat messages
  socket.on('group_message', (data) => {
    console.log('💬 Group message:', data.groupId);
    socket.to(`group_${data.groupId}`).emit('new_group_message', data);
  });

  // Join group room
  socket.on('join_group', (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`👥 User joined group: ${groupId}`);
  });

  // Leave group room
  socket.on('leave_group', (groupId) => {
    socket.leave(`group_${groupId}`);
    console.log(`👋 User left group: ${groupId}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// API Routes

// Auth routes
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, display_name } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  // Check if user already exists
  db.get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (row) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    const userId = require('crypto').randomUUID();
    const hashedPassword = require('bcryptjs').hashSync(password, 10);
    
    db.run(
      'INSERT INTO users (id, username, email, password, display_name, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
      [userId, username, email, hashedPassword, display_name || username],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        const token = jwt.sign({ id: userId, username, email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ 
          success: true, 
          token, 
          user: { id: userId, username, email, display_name: display_name || username } 
        });
      }
    );
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // For testing purposes, check if password matches (plain text)
    if (password !== row.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: row.id, username: row.username, email: row.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ 
      success: true, 
      token, 
      user: { 
        id: row.id, 
        username: row.username, 
        email: row.email, 
        display_name: row.display_name,
        avatar: row.avatar
      } 
    });
  });
});

// Removed duplicate /api/auth/me - handled below

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
      res.json({ 
        success: true, 
        threads: rows,
      });
      // Set cache control headers to prevent stale data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }
  );
});

// Create thread
app.post('/api/threads', (req, res) => {
  const { content, parent_id, group_id, topic_day_id, visibility = 'public', attachments } = req.body;
  const userId = req.user?.id || '550e8400-e29b-41d4-a716-446655440000'; // Use default test user
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const threadId = require('crypto').randomUUID();
  const attachmentsJson = attachments ? JSON.stringify(attachments) : '[]';
  
  db.run(
    `INSERT INTO threads (id, author_id, content, parent_id, group_id, topic_day_id, visibility, attachments, likes, dislikes, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', datetime('now'), datetime('now'))`,
    [threadId, userId, content, parent_id, group_id, topic_day_id, visibility, attachmentsJson],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Fetch the full thread with user info to match GET response format
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
          
          // Broadcast to all connected clients via WebSocket
          io.emit('thread_created', row);
          
          res.json({ 
            success: true, 
            thread: row
          });
        }
      );
    }
  );
});

// Like/Unlike thread
app.post('/api/threads/:id/like', authenticateToken, (req, res) => {
  const threadId = req.params.id;
  const userId = req.user.id;
  
  db.get('SELECT likes FROM threads WHERE id = ?', [threadId], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    
    try {
      const likes = JSON.parse(row.likes);
      const isLiked = likes.includes(userId);
      
      if (isLiked) {
        // Unlike
        const newLikes = likes.filter(id => id !== userId);
        db.run('UPDATE threads SET likes = ? WHERE id = ?', [JSON.stringify(newLikes), threadId], (err) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ success: true, liked: false, likes: newLikes });
        });
      } else {
        // Like
        const newLikes = [...likes, userId];
        db.run('UPDATE threads SET likes = ? WHERE id = ?', [JSON.stringify(newLikes), threadId], (err) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ success: true, liked: true, likes: newLikes });
        });
      }
    } catch (error) {
      console.error('JSON parse error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
  });
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

// Groups API
app.get('/api/groups', (req, res) => {
  db.all('SELECT * FROM groups ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, groups: rows || [] });
  });
});

app.post('/api/groups', authenticateToken, (req, res) => {
  const { name, description, is_private = false } = req.body;
  const userId = req.user.id;
  
  if (!name) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  const groupId = require('crypto').randomUUID();
  
  db.run(
    'INSERT INTO groups (id, name, description, is_private, created_by, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
    [groupId, name, description, is_private, userId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Add creator as admin member
      db.run(
        'INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, ?, datetime("now"))',
        [groupId, userId, 'admin'],
        (err) => {
          if (err) {
            console.error('Database error:', err);
          }
        }
      );
      
      res.json({ 
        success: true, 
        group: { 
          id: groupId, 
          name, 
          description, 
          is_private, 
          created_by: userId,
          created_at: new Date().toISOString()
        } 
      });
    }
  );
});

app.post('/api/groups/:id/join', authenticateToken, (req, res) => {
  const groupId = req.params.id;
  const userId = req.user.id;
  
  // Check if user is already a member
  db.get('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (row) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }
    
    // Add user to group
    db.run(
      'INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, ?, datetime("now"))',
      [groupId, userId, 'member'],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ success: true, message: 'Joined group successfully' });
      }
    );
  });
});

app.post('/api/groups/:id/leave', authenticateToken, (req, res) => {
  const groupId = req.params.id;
  const userId = req.user.id;
  
  db.run('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ success: true, message: 'Left group successfully' });
  });
});

// Get notifications
app.get('/api/notifications', (req, res) => {
  const userId = req.user?.id || req.query.userId;
  
  if (!userId) {
    return res.json({ success: true, notifications: [] });
  }
  
  db.all(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      res.json({ success: true, notifications: rows || [] });
    }
  );
});

// Get groups
app.get('/api/groups', (req, res) => {
  db.all('SELECT * FROM groups ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
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
        return res.status(500).json({ error: 'Database error', details: err.message });
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
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Simple password check (in production, use bcrypt)
      if (user.password_hash !== password) {
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
          avatar_url: user.avatar
        }
      });
    }
  );
});

// Get current user (optional auth)
app.get('/api/auth/me', (req, res) => {
  const userId = req.user?.id || req.query.userId;
  
  if (!userId) {
    return res.json({ success: true, user: null });
  }
  
  db.get(
    'SELECT id, username, display_name, email, avatar as avatar_url FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      if (!user) {
        return res.json({ success: true, user: null });
      }
      
      res.json({ success: true, user });
    }
  );
});

// Weather API
app.get('/api/weather', (req, res) => {
  // Mock weather data
  res.json({ 
    success: true, 
    weather: {
      temperature: 20,
      condition: 'sunny',
      humidity: 65,
      windSpeed: 10,
      location: 'Valmiera'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    websocket: 'enabled',
    connections: io.engine.clientsCount
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

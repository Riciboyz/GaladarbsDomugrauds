const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

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
const dbPath = process.env.DATABASE_PATH 
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : path.join(process.cwd(), '..', 'threads_app.db');
const db = new sqlite3.Database(dbPath);

// JWT Secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-this';

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
    `SELECT t.*, u.id as user_id, u.username, u.display_name, u.avatar as avatar_url 
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
      
      // Transform to match frontend expectations with nested author object
      const threads = rows.map(row => ({
        id: row.id,
        authorId: row.author_id,
        content: row.content,
        parentId: row.parent_id,
        groupId: row.group_id,
        topicDayId: row.topic_day_id,
        visibility: row.visibility,
        attachments: row.attachments,
        likes: row.likes,
        dislikes: row.dislikes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        author: {
          id: row.user_id,
          username: row.username,
          displayName: row.display_name,
          avatarUrl: row.avatar_url
        }
      }));
      
      // Set cache control headers to prevent stale data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.json({ 
        success: true, 
        threads: threads,
      });
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
        `SELECT t.*, u.id as user_id, u.username, u.display_name, u.avatar as avatar_url 
         FROM threads t 
         JOIN users u ON t.author_id = u.id 
         WHERE t.id = ?`,
        [threadId],
        (err, row) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          
          // Transform to match frontend expectations
          const thread = {
            id: row.id,
            authorId: row.author_id,
            content: row.content,
            parentId: row.parent_id,
            groupId: row.group_id,
            topicDayId: row.topic_day_id,
            visibility: row.visibility,
            attachments: row.attachments,
            likes: row.likes,
            dislikes: row.dislikes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            author: {
              id: row.user_id,
              username: row.username,
              displayName: row.display_name,
              avatarUrl: row.avatar_url
            }
          };
          
          // Broadcast to all connected clients via WebSocket
          io.emit('thread_created', thread);
          
          res.json({ 
            success: true, 
            thread: thread
          });
        }
      );
    }
  );
});

// Like/Unlike/Dislike thread - PUT endpoint for frontend compatibility
app.put('/api/threads', (req, res) => {
  const { threadId, userId, action } = req.body;
  
  if (!threadId || !userId || !action) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  db.get('SELECT * FROM threads WHERE id = ?', [threadId], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    
    try {
      let likes = JSON.parse(row.likes || '[]');
      let dislikes = JSON.parse(row.dislikes || '[]');
      
      if (action === 'like') {
        if (!likes.includes(userId)) {
          likes.push(userId);
          // Remove from dislikes if present
          dislikes = dislikes.filter(id => id !== userId);
        }
      } else if (action === 'unlike') {
        likes = likes.filter(id => id !== userId);
      } else if (action === 'dislike') {
        if (!dislikes.includes(userId)) {
          dislikes.push(userId);
          // Remove from likes if present
          likes = likes.filter(id => id !== userId);
        }
      } else if (action === 'undislike') {
        dislikes = dislikes.filter(id => id !== userId);
      }
      
      db.run(
        'UPDATE threads SET likes = ?, dislikes = ? WHERE id = ?',
        [JSON.stringify(likes), JSON.stringify(dislikes), threadId],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          
          // Fetch updated thread with author info
          db.get(
            `SELECT t.*, u.id as user_id, u.username, u.display_name, u.avatar as avatar_url 
             FROM threads t 
             JOIN users u ON t.author_id = u.id 
             WHERE t.id = ?`,
            [threadId],
            (err, updatedRow) => {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
              }
              
              const thread = {
                id: updatedRow.id,
                authorId: updatedRow.author_id,
                content: updatedRow.content,
                parentId: updatedRow.parent_id,
                groupId: updatedRow.group_id,
                topicDayId: updatedRow.topic_day_id,
                visibility: updatedRow.visibility,
                attachments: updatedRow.attachments,
                likes: updatedRow.likes,
                dislikes: updatedRow.dislikes,
                createdAt: updatedRow.created_at,
                updatedAt: updatedRow.updated_at,
                author: {
                  id: updatedRow.user_id,
                  username: updatedRow.username,
                  displayName: updatedRow.display_name,
                  avatarUrl: updatedRow.avatar_url
                }
              };
              
              // Broadcast update via WebSocket
              io.emit('thread_updated', thread);
              
              res.json({ success: true, thread });
            }
          );
        }
      );
    } catch (error) {
      console.error('JSON parse error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
  });
});

// Like/Unlike thread - POST endpoint (legacy, kept for compatibility)
app.post('/api/threads/:id/like', (req, res) => {
  const threadId = req.params.id;
  const userId = req.user?.id || req.body.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'User ID required' });
  }
  
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

// Get user followers
app.get('/api/users/followers', (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.json({ success: true, followers: [] });
  }
  
  db.all(
    `SELECT u.id, u.username, u.display_name, u.avatar as avatar_url 
     FROM users u 
     INNER JOIN followers f ON u.id = f.follower_id 
     WHERE f.following_id = ?`,
    [userId],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.json({ success: true, followers: [] });
      }
      res.json({ success: true, followers: rows || [] });
    }
  );
});

// Get user following
app.get('/api/users/following', (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.json({ success: true, following: [] });
  }
  
  db.all(
    `SELECT u.id, u.username, u.display_name, u.avatar as avatar_url 
     FROM users u 
     INNER JOIN followers f ON u.id = f.following_id 
     WHERE f.follower_id = ?`,
    [userId],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.json({ success: true, following: [] });
      }
      res.json({ success: true, following: rows || [] });
    }
  );
});

// Follow/Unfollow user
app.post('/api/users/follow', (req, res) => {
  const { userId } = req.body;
  const currentUserId = req.user?.id || '550e8400-e29b-41d4-a716-446655440000';
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }
  
  // Check if already following
  db.get(
    'SELECT * FROM followers WHERE follower_id = ? AND following_id = ?',
    [currentUserId, userId],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (row) {
        // Unfollow
        db.run(
          'DELETE FROM followers WHERE follower_id = ? AND following_id = ?',
          [currentUserId, userId],
          (err) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, message: 'Unfollowed user', following: false });
          }
        );
      } else {
        // Follow
        db.run(
          'INSERT INTO followers (follower_id, following_id, created_at) VALUES (?, ?, datetime("now"))',
          [currentUserId, userId],
          (err) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, message: 'Followed user', following: true });
          }
        );
      }
    }
  );
});

// Get user by ID
app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  
  db.get(
    'SELECT id, username, display_name, email, avatar as avatar_url, bio, created_at FROM users WHERE id = ?',
    [userId],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ success: true, user: row });
    }
  );
});

// Update user profile
app.put('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const { displayName, bio, avatar } = req.body;
  
  const updates = [];
  const values = [];
  
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
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  values.push(userId);
  
  db.run(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Fetch updated user
      db.get(
        'SELECT id, username, display_name, email, avatar as avatar_url, bio FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ success: true, user: row });
        }
      );
    }
  );
});

// Get daily topic
app.get('/api/daily-topic', (req, res) => {
  res.json({ success: true, topic: null });
});

// Get auth/me
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid token' });
    }
    
    db.get('SELECT id, username, email, display_name, avatar FROM users WHERE id = ?', [user.id], (err, row) => {
      if (err || !row) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      res.json({ success: true, user: row });
    });
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
  const userId = req.user?.id || req.query.userId || '550e8400-e29b-41d4-a716-446655440000';
  
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

// Send notification
app.post('/api/notifications/send', (req, res) => {
  const { type, fromUserId, toUserId, message, data } = req.body;
  
  if (!type || !toUserId || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const notificationId = require('crypto').randomUUID();
  const dataJson = data ? JSON.stringify(data) : '{}';
  
  db.run(
    `INSERT INTO notifications (id, user_id, type, from_user_id, message, data, is_read, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
    [notificationId, toUserId, type, fromUserId, message, dataJson],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      const notification = {
        id: notificationId,
        user_id: toUserId,
        type,
        from_user_id: fromUserId,
        message,
        data: dataJson,
        is_read: false,
        created_at: new Date().toISOString()
      };
      
      // Broadcast via WebSocket
      io.emit('new_notification', notification);
      
      res.json({ success: true, notification });
    }
  );
});

// Mark notification as read
app.post('/api/notifications/:id/read', (req, res) => {
  const notificationId = req.params.id;
  
  db.run(
    'UPDATE notifications SET is_read = 1 WHERE id = ?',
    [notificationId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, message: 'Notification marked as read' });
    }
  );
});

// Mark all notifications as read
app.post('/api/notifications/read-all', (req, res) => {
  const userId = req.user?.id || req.body.userId || '550e8400-e29b-41d4-a716-446655440000';
  
  db.run(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
    [userId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, message: 'All notifications marked as read' });
    }
  );
});


// Weather API
app.get('/api/weather', (req, res) => {
  // Mock weather data matching frontend expectations
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


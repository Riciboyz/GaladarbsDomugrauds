const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3001;

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
    
    // Transform to match frontend expectations
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
      comments: [], // Comments would be child threads with parent_id
      attachments: JSON.parse(row.attachments || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    console.log(`✅ Found ${threads.length} threads`);
    res.json({ success: true, threads });
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
    
    // Add empty arrays for followers/following since we don't have that data yet
    const users = rows.map(user => ({
      ...user,
      followers: [],
      following: [],
      email: user.username + '@example.com' // Mock email
    }));
    
    console.log(`✅ Found ${users.length} users`);
    res.json({ success: true, users });
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
  const author_id = '550e8400-e29b-41d4-a716-446655440000'; // Default test user
  
  db.run(
    `INSERT INTO threads (id, author_id, content, visibility, likes, dislikes, created_at, updated_at)
     VALUES (?, ?, ?, 'public', '[]', '[]', datetime('now'), datetime('now'))`,
    [threadId, author_id, content],
    function(err) {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      console.log(`✅ Created thread ${threadId}`);
      res.json({ 
        success: true, 
        thread: { id: threadId, author_id, content, visibility: 'public' }
      });
    }
  );
});

// Get groups
app.get('/api/groups', (req, res) => {
  console.log('📥 GET /api/groups');
  
  db.all('SELECT * FROM groups', [], (err, rows) => {
    if (err) {
      console.error('❌ Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    // Transform to match frontend expectations
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
    
    console.log(`✅ Found ${groups.length} groups`);
    res.json({ success: true, groups });
  });
});

// Get weather (mock data)
app.get('/api/weather', (req, res) => {
  console.log('📥 GET /api/weather');
  
  const mockWeather = {
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
  };
  
  res.json(mockWeather);
});

// Catch-all for missing endpoints
app.get('/api/*', (req, res) => {
  console.log(`📥 ${req.method} ${req.path} - Not implemented`);
  res.json({ success: true, message: 'Endpoint exists but not fully implemented', data: [] });
});

app.post('/api/*', (req, res) => {
  console.log(`📥 ${req.method} ${req.path} - Not implemented`);
  res.json({ success: true, message: 'Endpoint exists but not fully implemented' });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});

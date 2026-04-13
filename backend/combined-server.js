const express = require('express');
const cors = require('cors');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = parseInt(process.env.PORT, 10) || 3001;
const DEMO_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.set('trust proxy', 1);

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : path.join(process.cwd(), '..', 'threads_app.db');
const db = new sqlite3.Database(dbPath);

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-this';

const migrationsDir = path.join(__dirname, 'database', 'migrations');
const migrationFiles = ['001_initial_schema.sql', '002_add_group_roles.sql', '003_add_user_settings.sql'];
let bootstrapSql = '';
for (const f of migrationFiles) {
  const fp = path.join(migrationsDir, f);
  if (fs.existsSync(fp)) {
    bootstrapSql += fs.readFileSync(fp, 'utf8') + '\n';
  }
}
bootstrapSql += `
CREATE TABLE IF NOT EXISTS followers (
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, following_id)
);
`;

db.exec(bootstrapSql, (err) => {
  if (err) console.error('Schema bootstrap:', err.message);
});

function safeJsonParse(s, fallback) {
  try {
    return JSON.parse(s || '');
  } catch {
    return fallback;
  }
}

function rowToThread(row) {
  return {
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
}

function mapUserPublic(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    email: row.email,
    avatar: row.avatar || row.avatar_url,
    bio: row.bio,
    createdAt: row.created_at
  };
}

function getMembersArray(membersCol) {
  const m = safeJsonParse(membersCol, []);
  return Array.isArray(m) ? m : [];
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = { id: DEMO_USER_ID };
    return next();
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) req.user = { id: DEMO_USER_ID };
    else req.user = user;
    next();
  });
}

function currentUserId(req) {
  return req.user?.id || DEMO_USER_ID;
}

io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

// ---------- Auth ----------
app.post('/api/auth/register', (req, res) => {
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

app.post('/api/auth/login', (req, res) => {
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

app.post('/api/auth/logout', (_req, res) => {
  res.json({ success: true });
});

app.post('/api/auth/2fa/verify', (_req, res) => {
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
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

// ---------- Users ----------
app.get('/api/users', (_req, res) => {
  db.all(
    'SELECT id, username, display_name, email, avatar, bio, created_at FROM users ORDER BY username',
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });
      res.json({ success: true, users: rows.map(mapUserPublic) });
    }
  );
});

app.get('/api/users/search', (req, res) => {
  const q = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  if (!q) {
    return res.json({ success: true, users: [] });
  }
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

app.get('/api/users/followers', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.json({ success: true, followers: [] });
  db.all(
    `SELECT u.id, u.username, u.display_name, u.avatar as avatar_url
     FROM users u
     INNER JOIN followers f ON u.id = f.follower_id
     WHERE f.following_id = ?`,
    [userId],
    (err, rows) => {
      if (err) return res.json({ success: true, followers: [] });
      res.json({ success: true, followers: rows || [] });
    }
  );
});

app.get('/api/users/following', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.json({ success: true, following: [] });
  db.all(
    `SELECT u.id, u.username, u.display_name, u.avatar as avatar_url
     FROM users u
     INNER JOIN followers f ON u.id = f.following_id
     WHERE f.follower_id = ?`,
    [userId],
    (err, rows) => {
      if (err) return res.json({ success: true, following: [] });
      res.json({ success: true, following: rows || [] });
    }
  );
});

app.post('/api/users/follow', optionalAuth, (req, res) => {
  const { userId, action } = req.body;
  const currentUserIdVal = currentUserId(req);
  if (!userId) return res.status(400).json({ error: 'User ID required' });
  if (userId === currentUserIdVal) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }

  const doUnfollow = () => {
    db.run(
      'DELETE FROM followers WHERE follower_id = ? AND following_id = ?',
      [currentUserIdVal, userId],
      (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, message: 'Unfollowed user', following: false });
      }
    );
  };

  const doFollow = () => {
    db.run(
      'INSERT OR IGNORE INTO followers (follower_id, following_id, created_at) VALUES (?, ?, datetime("now"))',
      [currentUserIdVal, userId],
      (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, message: 'Followed user', following: true });
      }
    );
  };

  if (action === 'unfollow') {
    return doUnfollow();
  }
  if (action === 'follow') {
    return doFollow();
  }

  db.get(
    'SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?',
    [currentUserIdVal, userId],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (row) doUnfollow();
      else doFollow();
    }
  );
});

app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  db.get(
    'SELECT id, username, display_name, email, avatar as avatar_url, bio, created_at FROM users WHERE id = ?',
    [userId],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!row) return res.status(404).json({ error: 'User not found' });
      res.json({ success: true, user: row });
    }
  );
});

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
  db.run(`UPDATE users SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`, values, function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    db.get(
      'SELECT id, username, display_name, email, avatar as avatar_url, bio FROM users WHERE id = ?',
      [userId],
      (e, row) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, user: row });
      }
    );
  });
});

// ---------- Threads ----------
app.get('/api/threads', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const offset = parseInt(req.query.offset, 10) || 0;
  const feedType = req.query.feedType || 'all';
  const viewerId = req.query.userId || DEMO_USER_ID;

  let sql = `SELECT t.*, u.id as user_id, u.username, u.display_name, u.avatar as avatar_url
     FROM threads t
     JOIN users u ON t.author_id = u.id
     WHERE (t.parent_id IS NULL OR t.parent_id = '')`;
  const params = [];

  if (feedType === 'following') {
    sql += ` AND t.author_id IN (SELECT following_id FROM followers WHERE follower_id = ?)`;
    params.push(viewerId);
  }

  sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    const threads = rows.map(rowToThread);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json({ success: true, threads });
  });
});

app.get('/api/threads/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ success: true, threads: [] });
  const like = `%${q}%`;
  db.all(
    `SELECT t.*, u.id as user_id, u.username, u.display_name, u.avatar as avatar_url
     FROM threads t
     JOIN users u ON t.author_id = u.id
     WHERE t.content LIKE ? AND (t.parent_id IS NULL OR t.parent_id = '')
     ORDER BY t.created_at DESC LIMIT 50`,
    [like],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, threads: [] });
      res.json({ success: true, threads: rows.map(rowToThread) });
    }
  );
});

app.post('/api/threads', optionalAuth, (req, res) => {
  const body = req.body || {};
  const content = body.content;
  const parent_id = body.parent_id ?? body.parentId ?? null;
  const group_id = body.group_id ?? body.groupId ?? null;
  const topic_day_id = body.topic_day_id ?? body.topicDayId ?? null;
  const visibility = body.visibility || 'public';
  const attachments = body.attachments;
  const userId = currentUserId(req);

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const threadId = crypto.randomUUID();
  const attachmentsJson = attachments ? JSON.stringify(attachments) : '[]';

  db.run(
    `INSERT INTO threads (id, author_id, content, parent_id, group_id, topic_day_id, visibility, attachments, likes, dislikes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', datetime('now'), datetime('now'))`,
    [threadId, userId, content, parent_id, group_id, topic_day_id, visibility, attachmentsJson],
    function (err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      db.get(
        `SELECT t.*, u.id as user_id, u.username, u.display_name, u.avatar as avatar_url
         FROM threads t JOIN users u ON t.author_id = u.id WHERE t.id = ?`,
        [threadId],
        (e, row) => {
          if (e || !row) return res.status(500).json({ error: 'Database error' });
          const thread = rowToThread(row);
          io.emit('thread_created', thread);
          res.json({ success: true, thread });
        }
      );
    }
  );
});

app.put('/api/threads', (req, res) => {
  const { threadId, userId, action } = req.body;
  if (!threadId || !userId || !action) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  db.get('SELECT * FROM threads WHERE id = ?', [threadId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Thread not found' });

    let likes = safeJsonParse(row.likes, []);
    let dislikes = safeJsonParse(row.dislikes, []);
    if (!Array.isArray(likes)) likes = [];
    if (!Array.isArray(dislikes)) dislikes = [];

    if (action === 'like') {
      if (!likes.includes(userId)) {
        likes.push(userId);
        dislikes = dislikes.filter((id) => id !== userId);
      }
    } else if (action === 'unlike') {
      likes = likes.filter((id) => id !== userId);
    } else if (action === 'dislike') {
      if (!dislikes.includes(userId)) {
        dislikes.push(userId);
        likes = likes.filter((id) => id !== userId);
      }
    } else if (action === 'undislike') {
      dislikes = dislikes.filter((id) => id !== userId);
    }

    db.run(
      'UPDATE threads SET likes = ?, dislikes = ?, updated_at = datetime("now") WHERE id = ?',
      [JSON.stringify(likes), JSON.stringify(dislikes), threadId],
      (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        db.get(
          `SELECT t.*, u.id as user_id, u.username, u.display_name, u.avatar as avatar_url
           FROM threads t JOIN users u ON t.author_id = u.id WHERE t.id = ?`,
          [threadId],
          (e2, updatedRow) => {
            if (e2 || !updatedRow) return res.status(500).json({ error: 'Database error' });
            const thread = rowToThread(updatedRow);
            io.emit('thread_updated', thread);
            res.json({ success: true, thread });
          }
        );
      }
    );
  });
});

app.delete('/api/threads', optionalAuth, (req, res) => {
  const threadId = req.query.id;
  if (!threadId) return res.status(400).json({ error: 'Thread id required' });
  const userId = currentUserId(req);
  db.get('SELECT author_id FROM threads WHERE id = ?', [threadId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Thread not found' });
    if (row.author_id !== userId) {
      return res.status(403).json({ error: 'Not allowed to delete this thread' });
    }
    db.run('DELETE FROM threads WHERE id = ? OR parent_id = ?', [threadId, threadId], function (delErr) {
      if (delErr) return res.status(500).json({ error: 'Database error' });
      io.emit('thread_deleted', { threadId });
      res.json({ success: true });
    });
  });
});

app.post('/api/threads/:id/like', optionalAuth, (req, res) => {
  const threadId = req.params.id;
  const userId = currentUserId(req);
  db.get('SELECT likes FROM threads WHERE id = ?', [threadId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Thread not found' });
    const likes = safeJsonParse(row.likes, []);
    const isLiked = likes.includes(userId);
    const newLikes = isLiked ? likes.filter((id) => id !== userId) : [...likes, userId];
    db.run('UPDATE threads SET likes = ? WHERE id = ?', [JSON.stringify(newLikes), threadId], (e) => {
      if (e) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true, liked: !isLiked, likes: newLikes });
    });
  });
});

// ---------- Daily topics & submissions ----------
function ensureSampleDailyTopic() {
  const today = new Date().toISOString().slice(0, 10);
  db.get('SELECT id FROM users LIMIT 1', (e, u) => {
    if (!u || !u.id) return;
    db.get('SELECT id FROM daily_topics WHERE date = ?', [today], (err, existing) => {
      if (existing) return;
      db.get('SELECT COUNT(*) as c FROM daily_topics', (e2, row) => {
        if (e2 || !row || row.c > 0) return;
        const id = crypto.randomUUID();
        db.run(
          `INSERT INTO daily_topics (id, title, description, date, created_by, participants, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, '[]', datetime('now'), datetime('now'))`,
          [id, 'Daily reflection', 'Share something on your mind today.', today, u.id]
        );
      });
    });
  });
}
ensureSampleDailyTopic();

function formatDailyTopicRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    is_active: true,
    created_at: row.created_at,
    created_by_username: row.cu,
    created_by_display_name: row.cdn
  };
}

app.get('/api/daily-topic', (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  db.get(
    `SELECT dt.*, u.username as cu, u.display_name as cdn
     FROM daily_topics dt
     JOIN users u ON dt.created_by = u.id
     WHERE dt.date = ?
     ORDER BY dt.created_at DESC LIMIT 1`,
    [today],
    (err, row) => {
      if (!err && row) {
        return res.json({ success: true, topic: formatDailyTopicRow(row) });
      }
      db.get(
        `SELECT dt.*, u.username as cu, u.display_name as cdn
         FROM daily_topics dt
         JOIN users u ON dt.created_by = u.id
         ORDER BY dt.date DESC, dt.created_at DESC LIMIT 1`,
        [],
        (e2, latest) => {
          if (e2 || !latest) {
            return res.json({ success: true, topic: null });
          }
          res.json({ success: true, topic: formatDailyTopicRow(latest) });
        }
      );
    }
  );
});

app.get('/api/topic-days', (_req, res) => {
  db.all(
    `SELECT dt.*, u.username as created_by_username, u.display_name as created_by_display_name
     FROM daily_topics dt
     JOIN users u ON dt.created_by = u.id
     ORDER BY dt.date DESC LIMIT 100`,
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      const topicDays = (rows || []).map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description || '',
        date: r.date,
        maxParticipants: 100,
        participants: safeJsonParse(r.participants, []),
        created_by_username: r.created_by_username,
        created_by_display_name: r.created_by_display_name
      }));
      res.json({ success: true, topicDays });
    }
  );
});

app.post('/api/topic-days', optionalAuth, (req, res) => {
  const { title, description, date, maxParticipants } = req.body || {};
  if (!title || !date) {
    return res.status(400).json({ error: 'title and date required' });
  }
  const id = crypto.randomUUID();
  const uid = currentUserId(req);
  db.run(
    `INSERT INTO daily_topics (id, title, description, date, created_by, participants, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, '[]', datetime('now'), datetime('now'))`,
    [id, title, description || '', date, uid],
    (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({
        success: true,
        topicDay: {
          id,
          title,
          description: description || '',
          date,
          maxParticipants: maxParticipants || 100,
          participants: []
        }
      });
    }
  );
});

app.get('/api/topic-submissions', (req, res) => {
  const topicId = req.query.topicId;
  if (!topicId) return res.status(400).json({ success: false, error: 'topicId required' });
  db.all(
    `SELECT ts.*, u.username, u.display_name, u.avatar
     FROM topic_submissions ts
     JOIN users u ON ts.user_id = u.id
     WHERE ts.topic_id = ?
     ORDER BY ts.created_at DESC`,
    [topicId],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      const submissions = (rows || []).map((r) => {
        let text = r.content;
        let image_url = '';
        try {
          const parsed = JSON.parse(r.content);
          if (parsed && typeof parsed === 'object' && parsed.text !== undefined) {
            text = parsed.text;
            image_url = parsed.image_url || '';
          }
        } catch {
          /* plain text */
        }
        return {
          id: r.id,
          content: text,
          image_url,
          created_at: r.created_at,
          username: r.username,
          display_name: r.display_name,
          avatar: r.avatar
        };
      });
      res.json({ success: true, submissions });
    }
  );
});

app.post('/api/topic-submissions', optionalAuth, (req, res) => {
  const { topicId, content, imageUrl } = req.body || {};
  if (!topicId || (!content && !imageUrl)) {
    return res.status(400).json({ error: 'topicId and content or imageUrl required' });
  }
  const id = crypto.randomUUID();
  const uid = currentUserId(req);
  const stored = imageUrl
    ? JSON.stringify({ text: content || '', image_url: imageUrl })
    : String(content);

  db.run(
    'INSERT INTO topic_submissions (id, topic_id, user_id, content, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
    [id, topicId, uid, stored],
    (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true, id });
    }
  );
});

// ---------- Groups (members JSON on groups table) ----------
function mapGroupRow(row, viewerId) {
  const members = getMembersArray(row.members);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    avatar: row.avatar,
    members,
    admins: members.length ? [row.created_by] : [],
    isPrivate: row.visibility === 'private',
    createdBy: row.created_by,
    memberCount: members.length,
    isMember: viewerId ? members.includes(viewerId) : false,
    createdAt: row.created_at,
    threads: []
  };
}

app.get('/api/groups', optionalAuth, (req, res) => {
  const viewerId = currentUserId(req);
  db.all('SELECT * FROM groups ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true, groups: (rows || []).map((r) => mapGroupRow(r, viewerId)) });
  });
});

app.post('/api/groups', optionalAuth, (req, res) => {
  const { name, description, isPrivate, is_private } = req.body || {};
  const userId = currentUserId(req);
  if (!name) return res.status(400).json({ error: 'Group name is required' });
  const visibility =
    isPrivate === true || is_private === true ? 'private' : 'public';
  const groupId = crypto.randomUUID();
  const members = JSON.stringify([userId]);

  db.run(
    `INSERT INTO groups (id, name, description, avatar, created_by, members, visibility, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, ?, ?, datetime('now'), datetime('now'))`,
    [groupId, name, description || '', userId, members, visibility],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      db.get('SELECT * FROM groups WHERE id = ?', [groupId], (e, row) => {
        if (e || !row) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, group: mapGroupRow(row, userId) });
      });
    }
  );
});

app.put('/api/groups', optionalAuth, (req, res) => {
  const { groupId, name, description, avatar } = req.body || {};
  if (!groupId) return res.status(400).json({ error: 'groupId required' });
  const uid = currentUserId(req);
  db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Group not found' });
    const members = getMembersArray(row.members);
    if (row.created_by !== uid && !members.includes(uid)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updates = [];
    const vals = [];
    if (name !== undefined) {
      updates.push('name = ?');
      vals.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      vals.push(description);
    }
    if (avatar !== undefined) {
      updates.push('avatar = ?');
      vals.push(avatar);
    }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(groupId);
    db.run(
      `UPDATE groups SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`,
      vals,
      (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        db.get('SELECT * FROM groups WHERE id = ?', [groupId], (e2, r) => {
          res.json({ success: true, group: mapGroupRow(r, uid) });
        });
      }
    );
  });
});

app.delete('/api/groups', optionalAuth, (req, res) => {
  const groupId = req.query.groupId;
  if (!groupId) return res.status(400).json({ error: 'groupId required' });
  const uid = currentUserId(req);
  db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Group not found' });
    if (row.created_by !== uid) {
      return res.status(403).json({ error: 'Only creator can delete' });
    }
    db.run('DELETE FROM groups WHERE id = ?', [groupId], (e) => {
      if (e) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true });
    });
  });
});

app.post('/api/groups/join', optionalAuth, (req, res) => {
  const groupId = req.body?.groupId || req.body?.group_id;
  const uid = currentUserId(req);
  if (!groupId) return res.status(400).json({ error: 'groupId required' });
  db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Group not found' });
    const members = getMembersArray(row.members);
    if (members.includes(uid)) {
      return res.status(400).json({ error: 'Already a member' });
    }
    members.push(uid);
    db.run(
      'UPDATE groups SET members = ?, updated_at = datetime("now") WHERE id = ?',
      [JSON.stringify(members), groupId],
      (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, message: 'Joined group successfully' });
      }
    );
  });
});

app.delete('/api/groups/join', optionalAuth, (req, res) => {
  const groupId = req.query.groupId;
  const uid = currentUserId(req);
  if (!groupId) return res.status(400).json({ error: 'groupId required' });
  db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Group not found' });
    const members = getMembersArray(row.members).filter((id) => id !== uid);
    db.run(
      'UPDATE groups SET members = ?, updated_at = datetime("now") WHERE id = ?',
      [JSON.stringify(members), groupId],
      (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
      }
    );
  });
});

app.post('/api/groups/:id/join', optionalAuth, (req, res) => {
  const groupId = req.params.id;
  const uid = currentUserId(req);
  db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Group not found' });
    const members = getMembersArray(row.members);
    if (members.includes(uid)) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }
    members.push(uid);
    db.run(
      'UPDATE groups SET members = ?, updated_at = datetime("now") WHERE id = ?',
      [JSON.stringify(members), groupId],
      (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, message: 'Joined group successfully' });
      }
    );
  });
});

app.post('/api/groups/:id/leave', optionalAuth, (req, res) => {
  const groupId = req.params.id;
  const uid = currentUserId(req);
  db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Group not found' });
    const members = getMembersArray(row.members).filter((id) => id !== uid);
    db.run(
      'UPDATE groups SET members = ?, updated_at = datetime("now") WHERE id = ?',
      [JSON.stringify(members), groupId],
      (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, message: 'Left group successfully' });
      }
    );
  });
});

app.get('/api/groups/invite', optionalAuth, (req, res) => {
  const uid = req.query.userId || currentUserId(req);
  db.all(
    `SELECT gi.*, g.name as group_name FROM group_invites gi
     JOIN groups g ON gi.group_id = g.id
     WHERE gi.invited_user = ? AND gi.status = 'pending' AND gi.expires_at > datetime('now')
     ORDER BY gi.created_at DESC`,
    [uid],
    (err, rows) => {
      if (err) return res.json({ success: true, invitations: [] });
      res.json({
        success: true,
        invitations: (rows || []).map((r) => ({
          id: r.id,
          groupId: r.group_id,
          groupName: r.group_name,
          invitedBy: r.invited_by,
          status: r.status,
          expiresAt: r.expires_at
        }))
      });
    }
  );
});

app.post('/api/groups/invite', optionalAuth, (req, res) => {
  const { groupId, inviterId, inviteeId } = req.body || {};
  const uid = currentUserId(req);
  const inviter = inviterId || uid;
  if (!groupId || !inviteeId) {
    return res.status(400).json({ error: 'groupId and inviteeId required' });
  }
  const inviteId = crypto.randomUUID();
  const expires = new Date(Date.now() + 7 * 864e5).toISOString();
  db.run(
    `INSERT INTO group_invites (id, group_id, invited_by, invited_user, status, expires_at, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?, datetime('now'))`,
    [inviteId, groupId, inviter, inviteeId, expires.replace('T', ' ').slice(0, 19)],
    (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true, invitation: { id: inviteId } });
    }
  );
});

app.get('/api/groups/members', (req, res) => {
  const groupId = req.query.groupId;
  if (!groupId) return res.status(400).json({ error: 'groupId required' });
  db.get('SELECT members FROM groups WHERE id = ?', [groupId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Group not found' });
    const ids = getMembersArray(row.members);
    if (!ids.length) return res.json({ success: true, members: [] });
    const placeholders = ids.map(() => '?').join(',');
    db.all(
      `SELECT id, username, display_name, avatar FROM users WHERE id IN (${placeholders})`,
      ids,
      (e, users) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, members: users || [] });
      }
    );
  });
});

app.post('/api/groups/members', optionalAuth, (req, res) => {
  const { groupId, userId: newMemberId } = req.body || {};
  if (!groupId || !newMemberId) {
    return res.status(400).json({ error: 'groupId and userId required' });
  }
  db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Group not found' });
    const members = getMembersArray(row.members);
    if (!members.includes(newMemberId)) members.push(newMemberId);
    db.run(
      'UPDATE groups SET members = ?, updated_at = datetime("now") WHERE id = ?',
      [JSON.stringify(members), groupId],
      (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
      }
    );
  });
});

app.delete('/api/groups/members', optionalAuth, (req, res) => {
  const { groupId, userId: removeId } = req.query;
  if (!groupId || !removeId) {
    return res.status(400).json({ error: 'groupId and userId required' });
  }
  db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Group not found' });
    const members = getMembersArray(row.members).filter((id) => id !== removeId);
    db.run(
      'UPDATE groups SET members = ?, updated_at = datetime("now") WHERE id = ?',
      [JSON.stringify(members), groupId],
      (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
      }
    );
  });
});

function mapGroupPostRow(row) {
  const att = safeJsonParse(row.attachments, {});
  return {
    id: row.id,
    group_id: row.group_id,
    sender_id: row.author_id,
    content: row.content,
    message_type: att.messageType || 'text',
    attachment_url: att.attachmentUrl || att.url || '',
    created_at: row.created_at,
    username: row.username,
    display_name: row.display_name,
    avatar: row.avatar
  };
}

app.get('/api/groups/chat', optionalAuth, (req, res) => {
  const groupId = req.query.groupId;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  if (!groupId) return res.status(400).json({ error: 'groupId required' });
  db.all(
    `SELECT gp.*, u.username, u.display_name, u.avatar
     FROM group_posts gp
     JOIN users u ON gp.author_id = u.id
     WHERE gp.group_id = ?
     ORDER BY gp.created_at DESC
     LIMIT ?`,
    [groupId, limit],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, messages: (rows || []).map(mapGroupPostRow) });
    }
  );
});

app.post('/api/groups/chat', optionalAuth, (req, res) => {
  const { groupId, content, messageType, attachmentUrl } = req.body || {};
  const uid = currentUserId(req);
  if (!groupId || !content) {
    return res.status(400).json({ error: 'groupId and content required' });
  }
  const id = crypto.randomUUID();
  const attachments = JSON.stringify({
    messageType: messageType || 'text',
    attachmentUrl: attachmentUrl || ''
  });
  db.run(
    `INSERT INTO group_posts (id, group_id, author_id, content, attachments, likes, dislikes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, '[]', '[]', datetime('now'), datetime('now'))`,
    [id, groupId, uid, content, attachments],
    (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true, messageId: id });
    }
  );
});

// ---------- Notifications ----------
function mapNotification(row) {
  const data = safeJsonParse(row.data, {});
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    message: row.message || row.title || '',
    read: !!row.read,
    createdAt: row.created_at,
    relatedId: data.relatedId,
    title: row.title
  };
}

app.get('/api/notifications', optionalAuth, (req, res) => {
  const userId = req.query.userId || currentUserId(req);
  db.all(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true, notifications: (rows || []).map(mapNotification) });
    }
  );
});

app.post('/api/notifications/send', (req, res) => {
  const { type, fromUserId, toUserId, message, data } = req.body || {};
  if (!type || !toUserId || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const notificationId = crypto.randomUUID();
  const dataJson = JSON.stringify({
    ...(data || {}),
    fromUserId: fromUserId || null
  });
  const title = String(type);
  db.run(
    `INSERT INTO notifications (id, user_id, type, title, message, read, data, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, datetime('now'))`,
    [notificationId, toUserId, type, title, message, dataJson],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      const notification = {
        id: notificationId,
        user_id: toUserId,
        type,
        title,
        message,
        read: false,
        data: dataJson,
        created_at: new Date().toISOString()
      };
      io.emit('new_notification', notification);
      res.json({ success: true, notification: mapNotification({ ...notification, user_id: toUserId, read: 0 }) });
    }
  );
});

function markOneRead(notificationId, res) {
  db.run('UPDATE notifications SET read = 1 WHERE id = ?', [notificationId], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true, message: 'Notification marked as read' });
  });
}

app.post('/api/notifications/:id/read', (req, res) => {
  markOneRead(req.params.id, res);
});

app.put('/api/notifications/:id/read', (req, res) => {
  markOneRead(req.params.id, res);
});

app.post('/api/notifications/read-all', optionalAuth, (req, res) => {
  const userId = req.body?.userId || currentUserId(req);
  db.run('UPDATE notifications SET read = 1 WHERE user_id = ?', [userId], (err) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true, message: 'All notifications marked as read' });
  });
});

app.put('/api/notifications/read-all', optionalAuth, (req, res) => {
  const userId = req.body?.userId || currentUserId(req);
  db.run('UPDATE notifications SET read = 1 WHERE user_id = ?', [userId], (err) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true, message: 'All notifications marked as read' });
  });
});

// ---------- Upload (data URLs, no disk) ----------
function dataUrlResponse(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const b64 = req.file.buffer.toString('base64');
  const url = `data:${req.file.mimetype};base64,${b64}`;
  res.json({ success: true, url });
}

app.post('/api/upload', upload.single('file'), dataUrlResponse);
app.post('/api/upload/chat', upload.single('file'), dataUrlResponse);

// ---------- Health ----------
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    websocket: 'enabled',
    connections: io.engine.clientsCount
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Combined API + WebSocket Server running on port ${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`📱 Frontend: http://localhost:3000`);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.close((err) => {
    if (err) console.error('Error closing database:', err);
    else console.log('✅ Database connection closed');
    process.exit(0);
  });
});

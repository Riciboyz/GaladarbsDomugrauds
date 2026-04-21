const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { initDatabase } = require('./config/database');
const crypto = require('crypto');
const dmCore = require('./helpers/dmCore');
require('dotenv').config();

const DEFAULT_ORIGINS = ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3001'];
const EXTRA_ORIGINS = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = Array.from(new Set([...DEFAULT_ORIGINS, ...EXTRA_ORIGINS]));

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'], credentials: true }
});

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.set('trust proxy', 1);

let db;
let dbPath;

// One-time sanitize: older uploads stored absolute URLs (e.g.
// `http://localhost:3001/uploads/xyz.webp`) which are unreachable for any
// client other than the machine that uploaded them. Convert those rows to
// relative `/uploads/...` paths so the frontend's `/uploads/*` rewrite can
// proxy them correctly for every client.
function sanitizeLegacyAvatarUrls() {
  const hosts = [
    'http://localhost:3001',
    'https://localhost:3001',
    'http://127.0.0.1:3001'
  ];
  ['users', 'groups'].forEach((table) => {
    hosts.forEach((host) => {
      db.run(
        `UPDATE ${table} SET avatar = REPLACE(avatar, ?, '')
         WHERE avatar LIKE ?`,
        [host, `${host}/uploads/%`],
        (err) => {
          if (err) console.warn(`Avatar sanitize (${table}) failed:`, err.message);
        }
      );
    });
  });
}

// Remove `blob:` entries from thread attachments. Blob URLs only exist in the
// author's browser memory, so other users (and even the author after refresh)
// see 404s. Older builds of the thread composer accidentally persisted them.
function sanitizeThreadBlobAttachments() {
  db.all(
    `SELECT id, attachments FROM threads
     WHERE attachments LIKE '%blob:%'`,
    [],
    (err, rows) => {
      if (err) {
        console.warn('Thread attachment sanitize failed:', err.message);
        return;
      }
      (rows || []).forEach((row) => {
        let parsed;
        try {
          parsed = JSON.parse(row.attachments);
        } catch {
          return;
        }
        if (!Array.isArray(parsed)) return;
        const cleaned = parsed.filter(
          (item) => typeof item === 'string' && !item.startsWith('blob:')
        );
        if (cleaned.length === parsed.length) return;
        db.run(
          `UPDATE threads SET attachments = ? WHERE id = ?`,
          [JSON.stringify(cleaned), row.id],
          (uErr) => {
            if (uErr) console.warn('Thread attachment update failed:', uErr.message);
          }
        );
      });
    }
  );
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

io.on('connection', (socket) => {
  socket.on('register', ({ userId } = {}) => {
    if (!userId) return;
    socket.data.userId = userId;
    socket.join(`user:${userId}`);
    socket.emit('registered', { userId });
  });

  socket.on('join_group', ({ groupId } = {}) => {
    if (!groupId) return;
    socket.join(`group:${groupId}`);
  });

  socket.on('leave_group', ({ groupId } = {}) => {
    if (!groupId) return;
    socket.leave(`group:${groupId}`);
  });

  socket.on('dm_message', ({ conversationId, content, messageType, attachmentUrl } = {}) => {
    const authorId = socket.data.userId;
    const text = String(content || '').trim();
    const att = String(attachmentUrl || '').trim();
    if (!authorId || !conversationId || (!text && !att)) return;
    dmCore.insertDmMessage(
      db,
      io,
      {
        conversationId,
        senderId: authorId,
        content,
        messageType: messageType || 'text',
        attachmentUrl: att
      },
      (err) => {
        if (err) socket.emit('dm_error', { code: err.message || 'error' });
      }
    );
  });

  socket.on('group_message', ({ groupId, content, messageType, attachmentUrl } = {}) => {
    if (!groupId || !content) return;
    const authorId = socket.data.userId;
    if (!authorId) return;

    const id = crypto.randomUUID();
    const attachments = JSON.stringify({
      messageType: messageType || 'text',
      attachmentUrl: attachmentUrl || ''
    });

    db.run(
      `INSERT INTO group_posts (id, group_id, author_id, content, attachments, likes, dislikes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '[]', '[]', datetime('now'), datetime('now'))`,
      [id, groupId, authorId, content, attachments],
      (insertErr) => {
        if (insertErr) return;
        db.get(
          `SELECT gp.*, u.username, u.display_name, u.avatar
           FROM group_posts gp
           JOIN users u ON gp.author_id = u.id
           WHERE gp.id = ?`,
          [id],
          (fetchErr, row) => {
            if (fetchErr || !row) return;
            io.to(`group:${groupId}`).emit('group_message', {
              id: row.id,
              group_id: row.group_id,
              sender_id: row.author_id,
              content: row.content,
              message_type: JSON.parse(row.attachments || '{}').messageType || 'text',
              attachment_url: JSON.parse(row.attachments || '{}').attachmentUrl || '',
              created_at: row.created_at,
              username: row.username,
              display_name: row.display_name,
              avatar: row.avatar
            });
          }
        );
      }
    );
  });

  socket.on('typing', ({ groupId, userId } = {}) => {
    if (!groupId || !userId) return;
    socket.to(`group:${groupId}`).emit('user_typing', { groupId, userId });
  });

  socket.on('stop_typing', ({ groupId, userId } = {}) => {
    if (!groupId || !userId) return;
    socket.to(`group:${groupId}`).emit('user_stopped_typing', { groupId, userId });
  });

  socket.on('disconnect', () => {});
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    websocket: 'enabled',
    connections: io.engine.clientsCount
  });
});

const PORT = parseInt(process.env.PORT, 10) || 3001;

async function start() {
  const conn = await initDatabase();
  db = conn.db;
  dbPath = conn.dbPath;

  sanitizeLegacyAvatarUrls();
  sanitizeThreadBlobAttachments();

  app.use('/api/auth', require('./routes/auth')(db));
  app.use('/api/users', require('./routes/users')(db, io));
  app.use('/api/threads', require('./routes/threads')(db, io));
  app.use('/api/groups', require('./routes/groups')(db, io));
  app.use('/api/dms', require('./routes/dms')(db, io));
  app.use('/api/notifications', require('./routes/notifications')(db, io));
  app.use('/api', require('./routes/topics')(db, io));
  app.use('/api', require('./routes/suggestions')(db, io));
  app.use('/api/admin', require('./routes/admin')(db));
  app.use('/api/reports', require('./routes/reports')(db));
  app.use('/api', require('./routes/upload')());

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database: ${dbPath}`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(`Frontend: http://localhost:3000`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  if (!db) return process.exit(0);
  db.close((err) => {
    if (err) console.error('Error closing database:', err);
    process.exit(0);
  });
});

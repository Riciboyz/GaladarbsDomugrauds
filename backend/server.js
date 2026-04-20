const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { initDatabase } = require('./config/database');
const crypto = require('crypto');
require('dotenv').config();

const ALLOWED_ORIGINS = ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3001'];

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

const { db, dbPath } = initDatabase();

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

// Routes
app.use('/api/auth', require('./routes/auth')(db));
app.use('/api/users', require('./routes/users')(db, io));
app.use('/api/threads', require('./routes/threads')(db, io));
app.use('/api/groups', require('./routes/groups')(db, io));
app.use('/api/notifications', require('./routes/notifications')(db, io));
app.use('/api', require('./routes/topics')(db));
app.use('/api/admin', require('./routes/admin')(db));
app.use('/api/reports', require('./routes/reports')(db));
app.use('/api', require('./routes/upload')());

app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    websocket: 'enabled',
    connections: io.engine.clientsCount
  });
});

const PORT = parseInt(process.env.PORT, 10) || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database: ${dbPath}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Frontend: http://localhost:3000`);
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  db.close((err) => {
    if (err) console.error('Error closing database:', err);
    process.exit(0);
  });
});

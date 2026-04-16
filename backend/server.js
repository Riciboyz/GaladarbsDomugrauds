const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { initDatabase } = require('./config/database');
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
  socket.on('disconnect', () => {});
});

// Routes
app.use('/api/auth', require('./routes/auth')(db));
app.use('/api/users', require('./routes/users')(db));
app.use('/api/threads', require('./routes/threads')(db, io));
app.use('/api/groups', require('./routes/groups')(db));
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

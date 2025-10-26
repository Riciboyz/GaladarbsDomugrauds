const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3001;

// Create Next.js app
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Create HTTP server
const httpServer = createServer(handler);

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Store connected users
const connectedUsers = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  // Handle user authentication
  socket.on('authenticate', (userId) => {
    connectedUsers.set(socket.id, userId);
    socket.join(`user:${userId}`);
    console.log(`✅ User ${userId} authenticated with socket ${socket.id}`);
  });

  // Handle joining a group
  socket.on('join_group', (groupId) => {
    socket.join(`group:${groupId}`);
    console.log(`👥 Socket ${socket.id} joined group ${groupId}`);
  });

  // Handle leaving a group
  socket.on('leave_group', (groupId) => {
    socket.leave(`group:${groupId}`);
    console.log(`👥 Socket ${socket.id} left group ${groupId}`);
  });

  // Handle new thread creation
  socket.on('new_thread', (data) => {
    const { thread, groupId } = data;
    
    if (groupId) {
      // Broadcast to group members
      socket.to(`group:${groupId}`).emit('thread_created', thread);
    } else {
      // Broadcast to all connected users
      io.emit('thread_created', thread);
    }
  });

  // Handle thread updates (likes, comments, etc.)
  socket.on('thread_updated', (data) => {
    const { thread, groupId } = data;
    
    if (groupId) {
      socket.to(`group:${groupId}`).emit('thread_updated', thread);
    } else {
      io.emit('thread_updated', thread);
    }
  });

  // Handle new notifications
  socket.on('new_notification', (notification) => {
    const userId = connectedUsers.get(socket.id);
    if (userId) {
      socket.to(`user:${userId}`).emit('notification_received', notification);
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const { groupId, userId } = data;
    if (groupId) {
      socket.to(`group:${groupId}`).emit('user_typing', { userId, isTyping: true });
    }
  });

  socket.on('typing_stop', (data) => {
    const { groupId, userId } = data;
    if (groupId) {
      socket.to(`group:${groupId}`).emit('user_typing', { userId, isTyping: false });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const userId = connectedUsers.get(socket.id);
    if (userId) {
      console.log(`❌ User ${userId} disconnected`);
      connectedUsers.delete(socket.id);
    }
  });
});

// Broadcast notification to specific user
const broadcastNotification = (userId, notification) => {
  io.to(`user:${userId}`).emit('notification_received', {
    type: 'notification',
    id: notification.id,
    notificationType: notification.type,
    message: notification.message,
    createdAt: notification.createdAt
  });
};

// Broadcast thread update
const broadcastThreadUpdate = (thread, groupId = null) => {
  if (groupId) {
    io.to(`group:${groupId}`).emit('thread_updated', thread);
  } else {
    io.emit('thread_updated', thread);
  }
};

// Broadcast new thread
const broadcastNewThread = (thread, groupId = null) => {
  if (groupId) {
    io.to(`group:${groupId}`).emit('thread_created', thread);
  } else {
    io.emit('thread_created', thread);
  }
};

// Make functions available globally
global.broadcastNotification = broadcastNotification;
global.broadcastThreadUpdate = broadcastThreadUpdate;
global.broadcastNewThread = broadcastNewThread;

// Start server
app.prepare().then(() => {
  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`🚀 WebSocket server ready on http://${hostname}:${port}`);
    console.log(`🔌 Socket.IO server running for real-time features`);
  });
});

module.exports = { io, broadcastNotification, broadcastThreadUpdate, broadcastNewThread };

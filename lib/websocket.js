const { Server } = require('socket.io');
const http = require('http');

class WebSocketServer {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.FRONTEND_URL 
          : "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });
    
    this.connectedUsers = new Map();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Handle user authentication
      socket.on('authenticate', (data) => {
        const userId = data.userId || data; // Support both old and new format
        this.connectedUsers.set(socket.id, userId);
        socket.join(`user:${userId}`);
        console.log(`🔐 User ${userId} authenticated with socket ${socket.id}`);
      });

      // Handle joining a group
      socket.on('join_group', (groupId) => {
        socket.join(`group:${groupId}`);
        console.log(`Socket ${socket.id} joined group ${groupId}`);
      });

      // Handle leaving a group
      socket.on('leave_group', (groupId) => {
        socket.leave(`group:${groupId}`);
        console.log(`Socket ${socket.id} left group ${groupId}`);
      });

      // Handle new thread creation
      socket.on('new_thread', (data) => {
        const { thread, groupId } = data;
        
        if (groupId) {
          // Broadcast to group members
          socket.to(`group:${groupId}`).emit('thread_created', thread);
        } else {
          // Broadcast to all connected users
          this.io.emit('thread_created', thread);
        }
      });

      // Handle thread updates (likes, comments, etc.)
      socket.on('thread_updated', (data) => {
        const { thread, groupId } = data;
        
        if (groupId) {
          socket.to(`group:${groupId}`).emit('thread_updated', thread);
        } else {
          this.io.emit('thread_updated', thread);
        }
      });

      // Handle new notifications
      socket.on('new_notification', (notification) => {
        const userId = this.connectedUsers.get(socket.id);
        if (userId) {
          socket.to(`user:${userId}`).emit('notification_received', notification);
        }
      });

      // Handle notification messages from client
      socket.on('notification', (data) => {
        const { userId, notification } = data;
        if (userId) {
          // Send notification to specific user
          this.io.to(`user:${userId}`).emit('notification_received', notification);
          console.log(`📨 Notification sent to user ${userId}:`, notification.message);
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
        const userId = this.connectedUsers.get(socket.id);
        if (userId) {
          console.log(`User ${userId} disconnected`);
          this.connectedUsers.delete(socket.id);
        }
      });
    });
  }

  // Method to broadcast notifications
  broadcastNotification(userId, notification) {
    this.io.to(`user:${userId}`).emit('notification_received', notification);
  }

  // Method to broadcast thread updates
  broadcastThreadUpdate(thread, groupId = null) {
    if (groupId) {
      this.io.to(`group:${groupId}`).emit('thread_updated', thread);
    } else {
      this.io.emit('thread_updated', thread);
    }
  }

  // Method to broadcast new threads
  broadcastNewThread(thread, groupId = null) {
    if (groupId) {
      this.io.to(`group:${groupId}`).emit('thread_created', thread);
    } else {
      this.io.emit('thread_created', thread);
    }
  }
}

module.exports = WebSocketServer;

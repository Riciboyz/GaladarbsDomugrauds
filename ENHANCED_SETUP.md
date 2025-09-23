# Enhanced Threads App Setup

This document describes the enhanced setup with 100% working WebSocket functionality and database integration.

## 🚀 Quick Start

### Option 1: Enhanced Startup (Recommended)
```bash
npm run start:enhanced
```

This will:
- Initialize the database if it doesn't exist
- Start the Next.js development server
- Start the enhanced WebSocket server
- Set up real-time chat functionality

### Option 2: Manual Setup
```bash
# 1. Initialize enhanced database
npm run db:init-enhanced

# 2. Start both servers
npm run dev:full-enhanced
```

## 🔧 What's Enhanced

### WebSocket Server (`websocket-server-enhanced.js`)
- **Real-time messaging**: Instant message delivery via WebSocket
- **User authentication**: JWT token verification
- **Group management**: Join/leave group functionality
- **Typing indicators**: Real-time typing status
- **Database integration**: Messages saved to SQLite
- **Error handling**: Robust error management
- **Connection management**: Proper cleanup on disconnect

### Database (`database/init-enhanced.js`)
- **Complete schema**: All tables with proper relationships
- **Sample data**: Pre-populated with test users and groups
- **Indexes**: Optimized for performance
- **Foreign keys**: Data integrity enforcement

### Frontend (`app/hooks/useWebSocket.ts`)
- **WebSocket hook**: Easy integration with React components
- **Auto-reconnection**: Automatic reconnection on disconnect
- **Message handling**: Type-safe message processing
- **Connection status**: Real-time connection monitoring

### Group Chat (`app/components/GroupChat.tsx`)
- **Real-time messaging**: WebSocket-powered chat
- **Typing indicators**: See who's typing
- **Connection status**: Visual connection indicator
- **Fallback support**: API fallback if WebSocket fails
- **File uploads**: Image and file sharing

## 📊 Database Schema

The enhanced database includes these tables:
- `users` - User accounts and profiles
- `groups` - Chat groups
- `group_messages` - Real-time chat messages
- `group_invitations` - Group invitation system
- `notifications` - User notifications
- `user_sessions` - Authentication sessions
- `threads` - Main app threads
- `topic_days` - Daily topics
- `topic_submissions` - Topic submissions

## 🔌 WebSocket API

### Connection
```javascript
const ws = new WebSocket('ws://localhost:3001');
```

### Authentication
```javascript
ws.send(JSON.stringify({
  type: 'authenticate',
  data: { token: 'your-jwt-token' }
}));
```

### Join Group
```javascript
ws.send(JSON.stringify({
  type: 'join_group',
  data: { groupId: 'group_123' }
}));
```

### Send Message
```javascript
ws.send(JSON.stringify({
  type: 'group_message',
  data: {
    groupId: 'group_123',
    content: 'Hello world!',
    messageType: 'text'
  }
}));
```

### Typing Indicators
```javascript
// Start typing
ws.send(JSON.stringify({
  type: 'typing',
  data: { groupId: 'group_123' }
}));

// Stop typing
ws.send(JSON.stringify({
  type: 'stop_typing',
  data: { groupId: 'group_123' }
}));
```

## 🧪 Testing

### Test WebSocket Server
```bash
# Start WebSocket server
npm run dev:ws-enhanced

# In another terminal, test connection
node test-websocket.js
```

### Test Database
```bash
# Check database tables
sqlite3 threads_app.db ".tables"

# Check sample data
sqlite3 threads_app.db "SELECT * FROM users;"
sqlite3 threads_app.db "SELECT * FROM groups;"
sqlite3 threads_app.db "SELECT * FROM group_messages;"
```

## 🐛 Troubleshooting

### WebSocket Connection Issues
1. Check if port 3001 is available
2. Verify WebSocket server is running
3. Check browser console for errors
4. Ensure JWT token is valid

### Database Issues
1. Check if `threads_app.db` exists
2. Verify database permissions
3. Run `npm run db:init-enhanced` to reset
4. Check SQLite installation

### Frontend Issues
1. Clear browser cache
2. Check browser console for errors
3. Verify WebSocket connection status
4. Check authentication token

## 📝 Available Scripts

- `npm run start:enhanced` - Complete enhanced setup
- `npm run dev:ws-enhanced` - Enhanced WebSocket server only
- `npm run dev:full-enhanced` - Both servers (manual)
- `npm run db:init-enhanced` - Initialize enhanced database
- `npm run db:reset-enhanced` - Reset database with sample data

## 🎯 Features

### Real-time Chat
- ✅ Instant message delivery
- ✅ Typing indicators
- ✅ Connection status
- ✅ Message history
- ✅ File uploads
- ✅ User avatars

### Database
- ✅ SQLite for easy setup
- ✅ Complete schema
- ✅ Sample data
- ✅ Performance indexes
- ✅ Data integrity

### WebSocket
- ✅ Authentication
- ✅ Group management
- ✅ Message broadcasting
- ✅ Error handling
- ✅ Auto-reconnection
- ✅ Connection cleanup

## 🚀 Production Deployment

For production, you'll need to:
1. Set up a proper database (PostgreSQL/MySQL)
2. Configure environment variables
3. Set up SSL/TLS for WebSocket
4. Use a process manager (PM2)
5. Configure reverse proxy (Nginx)

The enhanced setup provides a solid foundation for production deployment!

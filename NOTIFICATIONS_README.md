# Real-time Notifications System

Production-ready Socket.IO notifications with JWT auth, DB persistence, and real-time delivery.

## Quick Start

1. **Start Socket.IO server:**
   ```bash
   node scripts/notifications-server.js
   ```
   Server runs on http://localhost:4001

2. **Start your Next.js app:**
   ```bash
   npm run dev
   ```

3. **Test notifications:**
   - Open browser, log in
   - You should see "Notifications" widget in the right sidebar
   - Open browser console to see Socket.IO connection logs

## API Endpoints

### Send Notification
```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H 'Content-Type: application/json' \
  --cookie 'auth-token=YOUR_TOKEN' \
  -d '{
    "type": "like",
    "fromUserId": "userA",
    "toUserId": "userB", 
    "data": {"postId": "123"},
    "message": "UserA liked your post"
  }'
```

### Get Notifications
```bash
curl -X GET http://localhost:3000/api/notifications \
  --cookie 'auth-token=YOUR_TOKEN'
```

### Webhook (for testing)
```bash
curl -X POST http://localhost:4001/webhook/notify \
  -H 'Content-Type: application/json' \
  -d '{
    "toUserId": "USER_ID",
    "notification": {
      "id": "test_1",
      "type": "group_invite", 
      "message": "Test notification",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  }'
```

## Socket.IO Events

**Client → Server:**
- `register` { token: "JWT..." } or { userId: "user123" }

**Server → Client:**
- `notification` { id, type, message, fromUserId, toUserId, createdAt, payload }
- `registered` { userId }
- `auth_error` { message }

## Components

- `NotificationsWidget` - Dropdown with badge counter
- `useRealtimeNotifications` - Hook for Socket.IO connection
- Socket.IO server at `scripts/notifications-server.js`

## Database Schema

```sql
CREATE TABLE notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  related_id VARCHAR(36),
  is_read BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Scaling with Redis

Uncomment Redis adapter in `scripts/notifications-server.js`:

```javascript
const { createAdapter } = require('@socket.io/redis-adapter')
const { createClient } = require('redis')

// Enable Redis adapter
const pubClient = createClient({ url: process.env.REDIS_URL })
const subClient = pubClient.duplicate()
await Promise.all([pubClient.connect(), subClient.connect()])
io.adapter(createAdapter(pubClient, subClient))
```

## Testing Multiple Clients

Use `wscat` to test Socket.IO:

```bash
npm install -g wscat
wscat -c ws://localhost:4001/socket.io/?EIO=4&transport=websocket

# Send register event
{"type":"register","data":{"userId":"test_user"}}
```

## Troubleshooting

1. **No notifications appearing:**
   - Check browser console for Socket.IO connection errors
   - Ensure you're logged in (auth-token cookie present)
   - Verify Socket.IO server is running on port 4001

2. **Connection refused:**
   - Install dependencies: `npm install express cors socket.io`
   - Check port 4001 is not in use

3. **Auth errors:**
   - Ensure JWT token is valid
   - Check auth-token cookie is set

## Environment Variables

- `NEXT_PUBLIC_NOTIF_WS` - Socket.IO server URL (default: http://localhost:4001)
- `NOTIF_WS_HTTP` - Webhook URL for backend (default: http://localhost:4001/webhook/notify)
- `SOCKETIO_PORT` - Socket.IO server port (default: 4001)
- `FRONTEND_URL` - CORS origin (default: http://localhost:3000)


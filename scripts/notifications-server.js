// Production-ready minimal Socket.IO notification server
// - Express + Socket.IO v4
// - JWT auth on register
// - userId -> socket rooms mapping (supports multi-device)
// - On register, emits unread notifications from DB
// - Listens for internal 'server_notify' events and forwards to recipient room
// - Optional Redis adapter (commented)

const express = require('express')
const http = require('http')
const cors = require('cors')
const { Server } = require('socket.io')
// const { createAdapter } = require('@socket.io/redis-adapter')
// const { createClient } = require('redis')

// Reuse existing auth/token verification and DB access from app
const authDb = require('../app/api/auth/db')

const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const dbPath = path.join(process.cwd(), 'threads_app.db')

const PORT = process.env.SOCKETIO_PORT ? Number(process.env.SOCKETIO_PORT) : 4001
const ORIGIN = process.env.FRONTEND_URL || 'http://localhost:3000'

const app = express()
app.use(cors({ origin: ORIGIN }))
app.use(express.json())

const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: ORIGIN, methods: ['GET', 'POST'] },
})

// Optional Redis scaling
// async function attachRedisAdapter() {
//   const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' })
//   const subClient = pubClient.duplicate()
//   await Promise.all([pubClient.connect(), subClient.connect()])
//   io.adapter(createAdapter(pubClient, subClient))
//   console.log('🔌 Socket.IO using Redis adapter')
// }
// attachRedisAdapter().catch(err => console.warn('Redis adapter disabled:', err.message))

// Helpers
function getDb() {
  return new sqlite3.Database(dbPath)
}

function listUnreadNotifications(userId, limit = 50) {
  return new Promise((resolve, reject) => {
    const db = getDb()
    db.all(
      `SELECT id, user_id as toUserId, type, message, related_id as relatedId, is_read as read, created_at as createdAt
       FROM notifications WHERE user_id = ? AND COALESCE(is_read, 0) = 0
       ORDER BY created_at DESC LIMIT ?`,
      [userId, limit],
      (err, rows) => {
        db.close()
        if (err) return reject(err)
        resolve(rows || [])
      }
    )
  })
}

// Socket logic
io.on('connection', (socket) => {
  console.log('🔌 [io] client connected', socket.id)

  // Client registers its identity with JWT or userId
  socket.on('register', async (payload) => {
    try {
      console.log('📝 Register request:', payload)
      const token = payload?.token
      let userId = payload?.userId
      
      if (token && !userId) {
        try {
          const decoded = authDb.verifyToken(token)
          if (!decoded) {
            socket.emit('auth_error', { message: 'Invalid token' })
            return
          }
          userId = decoded.id
        } catch (err) {
          console.error('Token verification error:', err)
          socket.emit('auth_error', { message: 'Token verification failed' })
          return
        }
      }
      
      if (!userId) {
        socket.emit('auth_error', { message: 'Missing userId' })
        return
      }
      
      socket.data.userId = userId
      socket.join(`user:${userId}`)
      socket.emit('registered', { userId })
      console.log(`✅ [io] registered user ${userId} on ${socket.id}`)

      // Deliver unread notifications immediately
      try {
        const unread = await listUnreadNotifications(userId)
        console.log(`📬 Delivering ${unread.length} unread notifications to user ${userId}`)
        unread.forEach(n => {
          socket.emit('notification', {
            id: n.id,
            type: n.type,
            fromUserId: n.fromUserId,
            toUserId: userId,
            message: n.message,
            payload: { relatedId: n.relatedId },
            createdAt: n.createdAt,
          })
        })
      } catch (err) {
        console.warn('⚠️ failed to load unread notifications', err.message)
      }
    } catch (err) {
      console.error('register error', err)
      socket.emit('auth_error', { message: 'Registration failed' })
    }
  })

  // Internal server-to-server emit to notify recipient(s)
  socket.on('server_notify', (data) => {
    const { toUserId, notification } = data || {}
    if (!toUserId || !notification) return
    io.to(`user:${toUserId}`).emit('notification', notification)
  })

  socket.on('disconnect', () => {
    console.log('🔌 [io] client disconnected', socket.id)
  })
})

// Health and basic admin webhook
app.get('/health', (req, res) => res.json({ ok: true }))

// Optional REST webhook to push notification (useful for testing)
app.post('/webhook/notify', (req, res) => {
  const { toUserId, notification } = req.body || {}
  if (!toUserId || !notification) return res.status(400).json({ ok: false, error: 'toUserId and notification required' })
  io.to(`user:${toUserId}`).emit('notification', notification)
  res.json({ ok: true })
})

server.listen(PORT, () => {
  console.log(`🚀 Socket.IO notifications server listening on http://localhost:${PORT}`)
})



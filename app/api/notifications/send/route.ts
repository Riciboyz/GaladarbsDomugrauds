import { NextRequest, NextResponse } from 'next/server'
const authDb = require('../../auth/db')

interface SavedNotification {
  id: string
  toUserId: string
  fromUserId: string
  type: string
  message: string
  payload: any
  read: boolean
  createdAt: string
}

async function saveNotification({ toUserId, fromUserId, type, message, payload }: { toUserId: string, fromUserId: string, type: string, message: string, payload: any }): Promise<SavedNotification> {
  const sqlite3 = require('sqlite3').verbose()
  const path = require('path')
  const dbPath = path.join(process.cwd(), 'threads_app.db')
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath)
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
    const createdAt = new Date().toISOString()
    
    // For now, let's use the simple approach without from_user_id column
    const query = `INSERT INTO notifications (id, user_id, type, title, message, related_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
    const params = [id, toUserId, type, message, message, payload?.relatedId || null, createdAt]
    
    console.log('🔍 Saving notification with query:', query)
    console.log('🔍 Params:', params)
    
    db.run(query, params, function(err: any) {
      db.close()
      if (err) {
        console.error('❌ Error saving notification to DB:', err)
        return reject(err)
      }
      console.log('✅ Notification saved to DB with ID:', id)
      resolve({ id, toUserId, fromUserId, type, message, payload, read: false, createdAt })
    })
  })
}

function buildDefaultMessage(type: string, data?: any): string {
  const fromUsername = data?.fromUsername || data?.username || 'Someone'
  
  switch (type) {
    case 'like':
      return `${fromUsername} liked your thread`
    case 'dislike':
      return `${fromUsername} disliked your thread`
    case 'comment':
      return `${fromUsername} commented on your thread`
    case 'follow':
      return `${fromUsername} started following you`
    case 'group_invite':
      return data?.groupName ? `${fromUsername} invited you to "${data.groupName}"` : `${fromUsername} invited you to a group`
    default:
      return `${fromUsername} sent you a notification`
  }
}

// POST /api/notifications/send
// Body: { type: 'like'|'comment'|'follow'|'group_invite', fromUserId: string, toUserId: string, data?: any, message?: string }
export async function POST(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token')?.value
    if (!authToken) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }
    const decoded = authDb.verifyToken(authToken)
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 })
    }

    const body = await request.json()
    const { type, fromUserId, toUserId, data, message } = body || {}

    if (!type || !fromUserId || !toUserId) {
      return NextResponse.json({ success: false, error: 'type, fromUserId, toUserId required' }, { status: 400 })
    }

    const composedMessage = message || buildDefaultMessage(type, data)
    console.log('🔔 Creating notification:', { type, fromUserId, toUserId, message: composedMessage })
    
    const saved = await saveNotification({
      toUserId,
      fromUserId,
      type,
      message: composedMessage,
      payload: data || null,
    })
    
    console.log('🔔 Notification saved to DB:', saved)

    // Send real-time notification via WebSocket server
    try {
      const wsUrl = 'http://localhost:3001'
      const webhookPayload = {
        type: 'notification',
        userId: toUserId,
        notification: {
          id: saved.id,
          type: saved.type,
          message: saved.message,
          userId: toUserId,
          read: false,
          createdAt: saved.createdAt,
          relatedId: saved.payload?.relatedId || null
        }
      }
      
      console.log('🔔 Sending notification to WebSocket server:', wsUrl, webhookPayload)
      
      const webhookResponse = await fetch(wsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      })
      
      if (webhookResponse.ok) {
        console.log('✅ Notification sent to WebSocket server successfully')
      } else {
        console.error('❌ WebSocket server response failed:', webhookResponse.status)
      }
    } catch (webhookError) {
      console.error('❌ WebSocket server error:', webhookError)
    }

    return NextResponse.json({ success: true, notification: saved })
  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}




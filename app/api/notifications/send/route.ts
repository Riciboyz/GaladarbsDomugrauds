import { NextRequest, NextResponse } from 'next/server'
const authDb = require('../../auth/db')

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

    // Fire-and-forget push to Socket.IO notifications server (webhook)
    try {
      const wsUrl = process.env.NOTIF_WS_HTTP || 'http://localhost:4001/webhook/notify'
      const webhookPayload = {
        toUserId,
        notification: {
          id: saved.id,
          type: saved.type,
          message: saved.message,
          fromUserId,
          toUserId,
          createdAt: saved.createdAt,
          payload: saved.payload,
        }
      }
      
      console.log('🔔 Sending webhook to Socket.IO:', wsUrl, webhookPayload)
      
      const webhookResponse = await fetch(wsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      })
      
      if (webhookResponse.ok) {
        console.log('✅ Webhook sent successfully')
      } else {
        console.error('❌ Webhook failed:', webhookResponse.status)
      }
    } catch (webhookError) {
      console.error('❌ Webhook error:', webhookError)
    }

    return NextResponse.json({ success: true, notification: saved })
  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

function buildDefaultMessage(type: string, data?: any): string {
  switch (type) {
    case 'like':
      return 'Someone liked your post'
    case 'comment':
      return 'Someone commented on your post'
    case 'follow':
      return 'You have a new follower'
    case 'group_invite':
      return data?.groupName ? `You have been invited to "${data.groupName}"` : 'You have been invited to a group'
    default:
      return 'You have a new notification'
  }
}

async function saveNotification({ toUserId, fromUserId, type, message, payload }: { toUserId: string, fromUserId: string, type: string, message: string, payload: any }) {
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




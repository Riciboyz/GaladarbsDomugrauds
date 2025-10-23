import { NextRequest, NextResponse } from 'next/server'

// POST /api/test-notification
// Test endpoint to send notifications without authentication
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { toUserId, type, message } = body || {}

    if (!toUserId || !type || !message) {
      return NextResponse.json({ success: false, error: 'toUserId, type, message required' }, { status: 400 })
    }

    console.log('🔔 Test notification:', { toUserId, type, message })

    // Send real-time notification via WebSocket server
    try {
      const wsUrl = 'http://localhost:3001'
      const webhookPayload = {
        type: 'notification',
        userId: toUserId,
        notification: {
          id: 'test-' + Date.now(),
          type: type,
          message: message,
          userId: toUserId,
          read: false,
          createdAt: new Date().toISOString(),
          relatedId: null
        }
      }
      
      console.log('🔔 Sending test notification to WebSocket server:', wsUrl, webhookPayload)
      
      const webhookResponse = await fetch(wsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      })
      
      if (webhookResponse.ok) {
        console.log('✅ Test notification sent to WebSocket server successfully')
        return NextResponse.json({ success: true, message: 'Test notification sent' })
      } else {
        console.error('❌ WebSocket server response failed:', webhookResponse.status)
        return NextResponse.json({ success: false, error: 'WebSocket server error' }, { status: 500 })
      }
    } catch (webhookError) {
      console.error('❌ WebSocket server error:', webhookError)
      return NextResponse.json({ success: false, error: 'WebSocket server error' }, { status: 500 })
    }

  } catch (error) {
    console.error('Error sending test notification:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

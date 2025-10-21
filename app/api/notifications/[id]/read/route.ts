import { NextRequest, NextResponse } from 'next/server'
const authDb = require('../../../auth/db')

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authToken = request.cookies.get('auth-token')?.value
    if (!authToken) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const decoded = authDb.verifyToken(authToken)
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 })
    }

    const notificationId = params.id
    const userId = decoded.id

    console.log('🔔 Marking notification as read:', { notificationId, userId })

    // Use sqlite3 directly like other API endpoints
    const sqlite3 = require('sqlite3').verbose()
    const db = new sqlite3.Database('threads_app.db')

    return new Promise((resolve) => {
      const query = 'UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?'
      
      db.run(query, [notificationId, userId], function(err: any) {
        db.close()
        
        if (err) {
          console.error('❌ Database error:', err)
          resolve(NextResponse.json({ success: false, error: 'Database error' }, { status: 500 }))
          return
        }

        if (this.changes === 0) {
          console.log('⚠️ Notification not found or already marked as read')
          resolve(NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 }))
          return
        }

        console.log('✅ Notification marked as read successfully')
        resolve(NextResponse.json({ success: true }))
      })
    })
  } catch (error) {
    console.error('❌ Error marking notification as read:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

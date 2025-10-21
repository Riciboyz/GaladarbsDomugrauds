import { NextRequest, NextResponse } from 'next/server'
const authDb = require('../../auth/db')

export async function PUT(request: NextRequest) {
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

    const userId = decoded.id

    console.log('🔔 Marking all notifications as read for user:', userId)

    // Use sqlite3 directly like other API endpoints
    const sqlite3 = require('sqlite3').verbose()
    const db = new sqlite3.Database('threads_app.db')

    return new Promise((resolve) => {
      const query = 'UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0'
      
      db.run(query, [userId], function(err: any) {
        db.close()
        
        if (err) {
          console.error('❌ Database error:', err)
          resolve(NextResponse.json({ success: false, error: 'Database error' }, { status: 500 }))
          return
        }

        console.log('✅ All notifications marked as read successfully:', this.changes, 'notifications updated')
        resolve(NextResponse.json({ success: true, updated: this.changes }))
      })
    })
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

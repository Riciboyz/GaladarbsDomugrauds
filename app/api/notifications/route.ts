import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../auth/db');

// GET - Get notifications for a user
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authToken = request.cookies.get('auth-token')?.value;
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = authDb.verifyToken(authToken);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || decoded.id;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get notifications from database
    const notifications = await getNotificationsFromDB(userId, limit, offset);

    return NextResponse.json({
      success: true,
      notifications: notifications
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new notification
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authToken = request.cookies.get('auth-token')?.value;
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = authDb.verifyToken(authToken);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, type, message, relatedId } = body;

    // Validation
    if (!userId || !type || !message) {
      return NextResponse.json(
        { success: false, error: 'userId, type, and message are required' },
        { status: 400 }
      );
    }

    // Create notification
    const notification = await createNotificationInDB({
      userId,
      type,
      message,
      relatedId: relatedId || null
    });

    return NextResponse.json({
      success: true,
      notification: notification
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Mark notification as read
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const authToken = request.cookies.get('auth-token')?.value;
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = authDb.verifyToken(authToken);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'notificationId is required' },
        { status: 400 }
      );
    }

    // Mark notification as read
    await markNotificationAsRead(notificationId);

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get notifications from database
async function getNotificationsFromDB(userId: string, limit: number, offset: number) {
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database('threads_app.db');

  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    db.all(query, [userId, limit, offset], (err: any, rows: any[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
      db.close();
    });
  });
}

// Helper function to create notification in database
async function createNotificationInDB(notification: {
  userId: string;
  type: string;
  message: string;
  relatedId: string | null;
}) {
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database('threads_app.db');

  return new Promise((resolve, reject) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const query = `
      INSERT INTO notifications (id, user_id, type, message, related_id, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      id,
      notification.userId,
      notification.type,
      notification.message,
      notification.relatedId,
      false,
      new Date().toISOString()
    ];

    db.run(query, values, function(err: any) {
      if (err) {
        reject(err);
      } else {
        resolve({
          id,
          userId: notification.userId,
          type: notification.type,
          message: notification.message,
          relatedId: notification.relatedId,
          read: false,
          createdAt: new Date().toISOString()
        });
      }
      db.close();
    });
  });
}

// Helper function to mark notification as read
async function markNotificationAsRead(notificationId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database('threads_app.db');

  return new Promise((resolve, reject) => {
    const query = `UPDATE notifications SET is_read = true WHERE id = ?`;
    
    db.run(query, [notificationId], function(err: any) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
      db.close();
    });
  });
}

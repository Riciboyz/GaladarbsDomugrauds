import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../../auth/db');

// GET - Get group chat messages
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
    const groupId = searchParams.get('groupId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: 'Group ID is required' },
        { status: 400 }
      );
    }

    // Check if user is member of the group
    const group = await getGroupFromDB(groupId);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    const members = JSON.parse(group.members || '[]');
    if (!members.includes(decoded.id)) {
      return NextResponse.json(
        { success: false, error: 'You are not a member of this group' },
        { status: 403 }
      );
    }

    // Get messages
    const messages = await getGroupMessages(groupId, limit, offset);

    return NextResponse.json({
      success: true,
      messages
    });

  } catch (error) {
    console.error('Error fetching group messages:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Send group chat message
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
    const { groupId, content, messageType = 'text', attachmentUrl } = body;

    if (!groupId || !content) {
      return NextResponse.json(
        { success: false, error: 'Group ID and content are required' },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Message content must be 1000 characters or less' },
        { status: 400 }
      );
    }

    // Check if user is member of the group
    const group = await getGroupFromDB(groupId);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    const members = JSON.parse(group.members || '[]');
    if (!members.includes(decoded.id)) {
      return NextResponse.json(
        { success: false, error: 'You are not a member of this group' },
        { status: 403 }
      );
    }

    // Create message
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const message = await createGroupMessage({
      id: messageId,
      groupId,
      senderId: decoded.id,
      content: content.trim(),
      messageType,
      attachmentUrl
    });

    // Create notifications for other group members
    await createGroupMessageNotifications(groupId, decoded.id, content);

    return NextResponse.json({
      success: true,
      message,
      messageId
    });

  } catch (error) {
    console.error('Error sending group message:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete group message
export async function DELETE(request: NextRequest) {
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
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { success: false, error: 'Message ID is required' },
        { status: 400 }
      );
    }

    // Get message
    const message = await getMessageById(messageId);
    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    // Check if user is the sender or group creator
    const group = await getGroupFromDB(message.group_id);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    const isSender = message.sender_id === decoded.id;
    const isCreator = group.created_by === decoded.id;

    if (!isSender && !isCreator) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to delete this message' },
        { status: 403 }
      );
    }

    // Delete message (soft delete)
    await deleteMessage(messageId);

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get group from database
async function getGroupFromDB(groupId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = 'SELECT * FROM groups WHERE id = ? AND is_deleted = 0';
    
    db.get(query, [groupId], (err: any, row: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(row);
    });
  });
}

// Helper function to get group messages
async function getGroupMessages(groupId: string, limit: number, offset: number) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = `
      SELECT 
        gm.id, gm.group_id, gm.sender_id, gm.content, gm.message_type, 
        gm.attachment_url, gm.created_at, gm.updated_at,
        u.username, u.display_name, u.avatar
      FROM group_messages gm
      JOIN users u ON gm.sender_id = u.id
      WHERE gm.group_id = ? AND gm.is_deleted = 0
      ORDER BY gm.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    db.all(query, [groupId, limit, offset], (err: any, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(rows);
    });
  });
}

// Helper function to create group message
async function createGroupMessage(messageData: any) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = `
      INSERT INTO group_messages (id, group_id, sender_id, content, message_type, attachment_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    db.run(query, [
      messageData.id,
      messageData.groupId,
      messageData.senderId,
      messageData.content,
      messageData.messageType,
      messageData.attachmentUrl
    ], function(err: any) {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(this.lastID);
    });
  });
}

// Helper function to get message by ID
async function getMessageById(messageId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = 'SELECT * FROM group_messages WHERE id = ?';
    
    db.get(query, [messageId], (err: any, row: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(row);
    });
  });
}

// Helper function to delete message
async function deleteMessage(messageId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = 'UPDATE group_messages SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    db.run(query, [messageId], function(err: any) {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(this.changes);
    });
  });
}

// Helper function to create group message notifications
async function createGroupMessageNotifications(groupId: string, senderId: string, content: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    // Get all group members except the sender
    const getMembersQuery = 'SELECT members FROM groups WHERE id = ?';
    
    db.get(getMembersQuery, [groupId], (err: any, group: any) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      
      const members = JSON.parse(group.members || '[]');
      const otherMembers = members.filter((id: string) => id !== senderId);
      
      if (otherMembers.length === 0) {
        db.close();
        resolve([]);
        return;
      }
      
      // Create notifications for all other members
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const insertQuery = `
        INSERT INTO notifications (id, user_id, type, message, related_id, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      let completed = 0;
      const total = otherMembers.length;
      
      otherMembers.forEach((memberId: string) => {
        const message = `New message in group: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`;
        db.run(insertQuery, [notificationId + '_' + memberId, memberId, 'group_message', message, groupId], (err: any) => {
          if (err) {
            console.error('Error creating notification:', err);
          }
          
          completed++;
          if (completed === total) {
            db.close();
            resolve(completed);
          }
        });
      });
    });
  });
}

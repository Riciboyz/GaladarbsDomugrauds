import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../../auth/db');

// POST - Join group
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
    const { groupId } = body;

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: 'Group ID is required' },
        { status: 400 }
      );
    }

    // Get group from database
    const group = await getGroupFromDB(groupId);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    const members = JSON.parse(group.members || '[]');
    
    // Check if user is already a member
    if (members.includes(decoded.id)) {
      return NextResponse.json(
        { success: false, error: 'You are already a member of this group' },
        { status: 400 }
      );
    }

    // For private groups, check if user has pending invitation
    if (group.is_private) {
      const invitation = await getGroupInvitation(groupId, decoded.id);
      if (!invitation || invitation.status !== 'accepted') {
        return NextResponse.json(
          { success: false, error: 'You need an invitation to join this private group' },
          { status: 403 }
        );
      }
    }

    // Add user to group
    members.push(decoded.id);
    await updateGroupMembers(groupId, members);

    // Create notification for group members
    await createGroupNotification(groupId, decoded.id, 'group_join', 
      `A new member joined the group`);

    return NextResponse.json({
      success: true,
      message: 'Successfully joined group'
    });

  } catch (error) {
    console.error('Error joining group:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Leave group
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
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: 'Group ID is required' },
        { status: 400 }
      );
    }

    // Get group from database
    const group = await getGroupFromDB(groupId);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    const members = JSON.parse(group.members || '[]');
    
    // Check if user is a member
    if (!members.includes(decoded.id)) {
      return NextResponse.json(
        { success: false, error: 'You are not a member of this group' },
        { status: 400 }
      );
    }

    // Check if user is the creator
    if (group.created_by === decoded.id) {
      return NextResponse.json(
        { success: false, error: 'Group creator cannot leave the group. Delete the group instead.' },
        { status: 400 }
      );
    }

    // Remove user from group
    const updatedMembers = members.filter((id: string) => id !== decoded.id);
    await updateGroupMembers(groupId, updatedMembers);

    // Create notification for group members
    await createGroupNotification(groupId, decoded.id, 'group_leave', 
      `A member left the group`);

    return NextResponse.json({
      success: true,
      message: 'Successfully left group'
    });

  } catch (error) {
    console.error('Error leaving group:', error);
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

// Helper function to update group members
async function updateGroupMembers(groupId: string, members: string[]) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = 'UPDATE groups SET members = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    db.run(query, [JSON.stringify(members), groupId], function(err: any) {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(this.changes);
    });
  });
}

// Helper function to get group invitation
async function getGroupInvitation(groupId: string, userId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = 'SELECT * FROM group_invitations WHERE group_id = ? AND invitee_id = ?';
    
    db.get(query, [groupId, userId], (err: any, row: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(row);
    });
  });
}

// Helper function to create group notification
async function createGroupNotification(groupId: string, userId: string, type: string, message: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    // Get all group members except the user who performed the action
    const getMembersQuery = 'SELECT members FROM groups WHERE id = ?';
    
    db.get(getMembersQuery, [groupId], (err: any, group: any) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      
      const members = JSON.parse(group.members || '[]');
      const otherMembers = members.filter((id: string) => id !== userId);
      
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
        db.run(insertQuery, [notificationId + '_' + memberId, memberId, type, message, groupId], (err: any) => {
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

import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../../auth/db');

// POST - Send group invitation
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
    const { groupId, inviteeId } = body;

    if (!groupId || !inviteeId) {
      return NextResponse.json(
        { success: false, error: 'Group ID and invitee ID are required' },
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
    
    // Check if user is group creator or member
    const isCreator = group.created_by === decoded.id;
    const isMember = members.includes(decoded.id);

    if (!isCreator && !isMember) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to invite users to this group' },
        { status: 403 }
      );
    }

    // Check if invitee is already a member
    if (members.includes(inviteeId)) {
      return NextResponse.json(
        { success: false, error: 'User is already a member of this group' },
        { status: 400 }
      );
    }

    // For private groups, check mutual follow
    if (group.is_private) {
      const mutualFollow = await checkMutualFollow(decoded.id, inviteeId);
      if (!mutualFollow) {
        return NextResponse.json(
          { success: false, error: 'You can only invite users who follow you back' },
          { status: 400 }
        );
      }
    }

    // Check if invitation already exists
    const existingInvitation = await getGroupInvitation(groupId, inviteeId);
    if (existingInvitation) {
      if (existingInvitation.status === 'pending') {
        return NextResponse.json(
          { success: false, error: 'Invitation already sent' },
          { status: 400 }
        );
      } else if (existingInvitation.status === 'accepted') {
        return NextResponse.json(
          { success: false, error: 'User has already accepted an invitation to this group' },
          { status: 400 }
        );
      }
    }

    // Create invitation
    const invitationId = `invite_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    await createGroupInvitation({
      id: invitationId,
      groupId,
      inviterId: decoded.id,
      inviteeId,
      status: 'pending'
    });

    // Create notification for invitee
    await createNotification(inviteeId, 'group_invite', 
      `You've been invited to join "${group.name}"`, groupId);

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Respond to group invitation
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
    const { invitationId, status } = body;

    if (!invitationId || !status) {
      return NextResponse.json(
        { success: false, error: 'Invitation ID and status are required' },
        { status: 400 }
      );
    }

    if (!['accepted', 'declined'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status must be either "accepted" or "declined"' },
        { status: 400 }
      );
    }

    // Get invitation
    const invitation = await getInvitationById(invitationId);
    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if user is the invitee
    if (invitation.invitee_id !== decoded.id) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to respond to this invitation' },
        { status: 403 }
      );
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Invitation has already been responded to' },
        { status: 400 }
      );
    }

    // Update invitation status
    await updateInvitationStatus(invitationId, status);

    if (status === 'accepted') {
      // Add user to group
      const group = await getGroupFromDB(invitation.group_id);
      if (group) {
        const members = JSON.parse(group.members || '[]');
        if (!members.includes(decoded.id)) {
          members.push(decoded.id);
          await updateGroupMembers(invitation.group_id, members);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Invitation ${status} successfully`
    });

  } catch (error) {
    console.error('Error responding to invitation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get user's group invitations
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

    // Get user's pending invitations
    const invitations = await getUserInvitations(decoded.id);

    return NextResponse.json({
      success: true,
      invitations
    });

  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to check mutual follow
async function checkMutualFollow(userId1: string, userId2: string): Promise<boolean> {
  const user1 = await authDb.getUserById(userId1);
  const user2 = await authDb.getUserById(userId2);
  
  if (!user1 || !user2) return false;
  
  const user1Following = JSON.parse(user1.following || '[]');
  const user2Following = JSON.parse(user2.following || '[]');
  
  return user1Following.includes(userId2) && user2Following.includes(userId1);
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

// Helper function to create group invitation
async function createGroupInvitation(invitationData: any) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = `
      INSERT INTO group_invitations (id, group_id, inviter_id, invitee_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    db.run(query, [
      invitationData.id,
      invitationData.groupId,
      invitationData.inviterId,
      invitationData.inviteeId,
      invitationData.status
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

// Helper function to get invitation by ID
async function getInvitationById(invitationId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = 'SELECT * FROM group_invitations WHERE id = ?';
    
    db.get(query, [invitationId], (err: any, row: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(row);
    });
  });
}

// Helper function to update invitation status
async function updateInvitationStatus(invitationId: string, status: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = 'UPDATE group_invitations SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    db.run(query, [status, invitationId], function(err: any) {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(this.changes);
    });
  });
}

// Helper function to get user invitations
async function getUserInvitations(userId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = `
      SELECT 
        gi.id, gi.group_id, gi.inviter_id, gi.status, gi.created_at,
        g.name as group_name, g.description as group_description,
        u.username as inviter_username, u.display_name as inviter_display_name
      FROM group_invitations gi
      JOIN groups g ON gi.group_id = g.id
      JOIN users u ON gi.inviter_id = u.id
      WHERE gi.invitee_id = ? AND gi.status = 'pending'
      ORDER BY gi.created_at DESC
    `;
    
    db.all(query, [userId], (err: any, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(rows);
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

// Helper function to create notification
async function createNotification(userId: string, type: string, message: string, relatedId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const query = `
      INSERT INTO notifications (id, user_id, type, message, related_id, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    db.run(query, [notificationId, userId, type, message, relatedId], function(err: any) {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(this.lastID);
    });
  });
}

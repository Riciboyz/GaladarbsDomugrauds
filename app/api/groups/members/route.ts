import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../../auth/db');

// POST - Add member to group
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
    const { groupId, userId } = body;

    if (!groupId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Group ID and User ID are required' },
        { status: 400 }
      );
    }

    // Check if user is group creator or member
    const group = await getGroupFromDB(groupId);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    const members = JSON.parse(group.members || '[]');
    const isCreator = group.created_by === decoded.id;
    const isMember = members.includes(decoded.id);

    if (!isCreator && !isMember) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to add members to this group' },
        { status: 403 }
      );
    }

    // For private groups, check mutual follow
    if (group.is_private && !isCreator) {
      const mutualFollow = await checkMutualFollow(decoded.id, userId);
      if (!mutualFollow) {
        return NextResponse.json(
          { success: false, error: 'You can only invite users who follow you back' },
          { status: 400 }
        );
      }
    }

    // Add user to group
    if (!members.includes(userId)) {
      members.push(userId);
      await updateGroupMembers(groupId, members);
    }

    return NextResponse.json({
      success: true,
      message: 'User added to group successfully'
    });

  } catch (error) {
    console.error('Error adding member to group:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove member from group
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
    const userId = searchParams.get('userId');

    if (!groupId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Group ID and User ID are required' },
        { status: 400 }
      );
    }

    // Check if user is group creator or the user being removed
    const group = await getGroupFromDB(groupId);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    const members = JSON.parse(group.members || '[]');
    const isCreator = group.created_by === decoded.id;
    const isRemovingSelf = userId === decoded.id;

    if (!isCreator && !isRemovingSelf) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to remove this member' },
        { status: 403 }
      );
    }

    // Remove user from group
    const updatedMembers = members.filter((id: string) => id !== userId);
    await updateGroupMembers(groupId, updatedMembers);

    return NextResponse.json({
      success: true,
      message: 'User removed from group successfully'
    });

  } catch (error) {
    console.error('Error removing member from group:', error);
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
    
    const query = 'SELECT * FROM groups WHERE id = ?';
    
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

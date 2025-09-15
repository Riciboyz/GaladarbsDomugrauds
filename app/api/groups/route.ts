import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../auth/db');

// GET - Get all groups (public only for non-members, all for members)
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authToken = request.cookies.get('auth-token')?.value;
    let currentUserId = null;
    
    if (authToken) {
      const decoded = authDb.verifyToken(authToken);
      if (decoded) {
        currentUserId = decoded.id;
      }
    }

    // Get groups from database
    const groups = await getGroupsFromDB(currentUserId);

    return NextResponse.json({
      success: true,
      groups: groups
    });

  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new group
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
    const { name, description, isPrivate = false } = body;

    // Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Group name is required' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Group name must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Create group
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const members = [decoded.id]; // Creator is automatically a member

    await createGroupInDB({
      id: groupId,
      name: name.trim(),
      description: description?.trim() || '',
      isPrivate: isPrivate,
      createdBy: decoded.id,
      members: members
    });

    const newGroup = {
      id: groupId,
      name: name.trim(),
      description: description?.trim() || '',
      isPrivate: isPrivate,
      createdBy: decoded.id,
      members: members,
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      group: newGroup,
      message: 'Group created successfully'
    });

  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get groups from database
async function getGroupsFromDB(currentUserId: string | null) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    let query = `
      SELECT 
        g.id, g.name, g.description, g.avatar, g.created_by, g.members, 
        g.is_private, g.created_at, g.updated_at,
        u.username, u.display_name, u.avatar as creator_avatar
      FROM groups g
      JOIN users u ON g.created_by = u.id
      ORDER BY g.created_at DESC
    `;
    
    db.all(query, [], (err: any, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      const groups = rows.map(group => {
        const members = JSON.parse(group.members || '[]');
        const isMember = currentUserId ? members.includes(currentUserId) : false;
        
        // For private groups, only show to members
        if (group.is_private && !isMember) {
          return null;
        }
        
        return {
          id: group.id,
          name: group.name,
          description: group.description,
          avatar: group.avatar,
          isPrivate: group.is_private,
          createdBy: group.created_by,
          members: members,
          memberCount: members.length,
          isMember: isMember,
          createdAt: group.created_at,
          updatedAt: group.updated_at,
          creator: {
            id: group.created_by,
            username: group.username,
            displayName: group.display_name,
            avatar: group.creator_avatar
          }
        };
      }).filter(group => group !== null);
      
      db.close();
      resolve(groups);
    });
  });
}

// Helper function to create group in database
async function createGroupInDB(groupData: any) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = `
      INSERT INTO groups (id, name, description, is_private, created_by, members, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    db.run(query, [
      groupData.id,
      groupData.name,
      groupData.description,
      groupData.isPrivate ? 1 : 0,
      groupData.createdBy,
      JSON.stringify(groupData.members)
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

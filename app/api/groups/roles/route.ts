import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../../auth/db');

// GET - Get group member roles
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

    // Get member roles
    const memberRoles = await getGroupMemberRoles(groupId);

    return NextResponse.json({
      success: true,
      memberRoles
    });

  } catch (error) {
    console.error('Error fetching member roles:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Assign role to member
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
    const { groupId, userId, role } = body;

    if (!groupId || !userId || !role) {
      return NextResponse.json(
        { success: false, error: 'Group ID, User ID, and role are required' },
        { status: 400 }
      );
    }

    if (!['admin', 'moderator', 'member'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be admin, moderator, or member' },
        { status: 400 }
      );
    }

    // Check if user has permission to assign roles
    const userRole = await getUserGroupRole(groupId, decoded.id);
    if (!['admin'].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Only admins can assign roles' },
        { status: 403 }
      );
    }

    // Check if target user is member of the group
    const group = await getGroupFromDB(groupId);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    const members = JSON.parse(group.members || '[]');
    if (!members.includes(userId)) {
      return NextResponse.json(
        { success: false, error: 'User is not a member of this group' },
        { status: 400 }
      );
    }

    // Prevent demoting group creator
    if (group.created_by === userId && role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Cannot change role of group creator' },
        { status: 400 }
      );
    }

    // Assign role
    await assignMemberRole(groupId, userId, role, decoded.id);

    // Broadcast to WebSocket server for real-time updates
    try {
      const wsPayload = {
        group_id: groupId,
        user_id: userId,
        role: role,
        assigned_by: decoded.id
      };
      
      await fetch('http://localhost:3001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'group_role_assigned', data: wsPayload })
      });
    } catch (wsError) {
      console.log('WS broadcast for role assignment failed (non-critical):', (wsError as any).message || wsError);
    }

    return NextResponse.json({
      success: true,
      message: 'Role assigned successfully'
    });

  } catch (error) {
    console.error('Error assigning role:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove member role (demote to member)
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

    // Check if user has permission to remove roles
    const userRole = await getUserGroupRole(groupId, decoded.id);
    if (!['admin'].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Only admins can remove roles' },
        { status: 403 }
      );
    }

    // Prevent demoting group creator
    const group = await getGroupFromDB(groupId);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    if (group.created_by === userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot change role of group creator' },
        { status: 400 }
      );
    }

    // Remove role (set to member)
    await removeMemberRole(groupId, userId);

    // Broadcast to WebSocket server for real-time updates
    try {
      const wsPayload = {
        group_id: groupId,
        user_id: userId,
        role: 'member',
        assigned_by: decoded.id
      };
      
      await fetch('http://localhost:3001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'group_role_assigned', data: wsPayload })
      });
    } catch (wsError) {
      console.log('WS broadcast for role removal failed (non-critical):', (wsError as any).message || wsError);
    }

    return NextResponse.json({
      success: true,
      message: 'Role removed successfully'
    });

  } catch (error) {
    console.error('Error removing role:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
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

async function getGroupMemberRoles(groupId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = `
      SELECT 
        gmr.user_id, gmr.role, gmr.assigned_by, gmr.assigned_at,
        u.username, u.display_name, u.avatar,
        assigner.username as assigned_by_username, assigner.display_name as assigned_by_display_name
      FROM group_member_roles gmr
      JOIN users u ON gmr.user_id = u.id
      LEFT JOIN users assigner ON gmr.assigned_by = assigner.id
      WHERE gmr.group_id = ?
      ORDER BY gmr.assigned_at ASC
    `;
    
    db.all(query, [groupId], (err: any, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(rows);
    });
  });
}

async function getUserGroupRole(groupId: string, userId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    // Check if user is group creator
    const creatorQuery = 'SELECT created_by FROM groups WHERE id = ?';
    db.get(creatorQuery, [groupId], (err: any, group: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (group && group.created_by === userId) {
        db.close();
        resolve('admin');
        return;
      }
      
      // Check role in group_member_roles table
      const roleQuery = 'SELECT role FROM group_member_roles WHERE group_id = ? AND user_id = ?';
      db.get(roleQuery, [groupId, userId], (err: any, roleRow: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        db.close();
        resolve(roleRow ? roleRow.role : 'member');
      });
    });
  });
}

async function assignMemberRole(groupId: string, userId: string, role: string, assignedBy: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    // First, try to update existing role
    const updateQuery = 'UPDATE group_member_roles SET role = ?, assigned_by = ?, assigned_at = CURRENT_TIMESTAMP WHERE group_id = ? AND user_id = ?';
    
    db.run(updateQuery, [role, assignedBy, groupId, userId], function(err: any) {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      
      // If no rows were updated, insert new role
      if (this.changes === 0) {
        const roleId = `role_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        const insertQuery = `
          INSERT INTO group_member_roles (id, group_id, user_id, role, assigned_by, assigned_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        db.run(insertQuery, [roleId, groupId, userId, role, assignedBy], function(err: any) {
          if (err) {
            reject(err);
            return;
          }
          
          db.close();
          resolve(this.lastID);
        });
      } else {
        db.close();
        resolve(this.changes);
      }
    });
  });
}

async function removeMemberRole(groupId: string, userId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = 'DELETE FROM group_member_roles WHERE group_id = ? AND user_id = ?';
    
    db.run(query, [groupId, userId], function(err: any) {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(this.changes);
    });
  });
}

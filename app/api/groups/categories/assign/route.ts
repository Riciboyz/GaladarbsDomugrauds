import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../../auth/db');

// POST - Assign category to group
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
    const { groupId, categoryId } = body;

    if (!groupId || !categoryId) {
      return NextResponse.json(
        { success: false, error: 'Group ID and Category ID are required' },
        { status: 400 }
      );
    }

    // Check if user is group creator or admin
    const group = await getGroupFromDB(groupId);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    const isCreator = group.created_by === decoded.id;
    const userRole = await getUserGroupRole(groupId, decoded.id);
    const canManage = isCreator || ['admin'].includes(userRole);

    if (!canManage) {
      return NextResponse.json(
        { success: false, error: 'Only group creators and admins can assign categories' },
        { status: 403 }
      );
    }

    // Check if category exists
    const category = await getCategoryById(categoryId);
    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    // Assign category to group
    await assignCategoryToGroup(groupId, categoryId);

    return NextResponse.json({
      success: true,
      message: 'Category assigned successfully'
    });

  } catch (error) {
    console.error('Error assigning category to group:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove category from group
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
    const categoryId = searchParams.get('categoryId');

    if (!groupId || !categoryId) {
      return NextResponse.json(
        { success: false, error: 'Group ID and Category ID are required' },
        { status: 400 }
      );
    }

    // Check if user is group creator or admin
    const group = await getGroupFromDB(groupId);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    const isCreator = group.created_by === decoded.id;
    const userRole = await getUserGroupRole(groupId, decoded.id);
    const canManage = isCreator || ['admin'].includes(userRole);

    if (!canManage) {
      return NextResponse.json(
        { success: false, error: 'Only group creators and admins can remove categories' },
        { status: 403 }
      );
    }

    // Remove category from group
    await removeCategoryFromGroup(groupId, categoryId);

    return NextResponse.json({
      success: true,
      message: 'Category removed successfully'
    });

  } catch (error) {
    console.error('Error removing category from group:', error);
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

async function getCategoryById(categoryId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = 'SELECT * FROM group_categories WHERE id = ?';
    
    db.get(query, [categoryId], (err: any, row: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(row);
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

async function assignCategoryToGroup(groupId: string, categoryId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const assignmentId = `assign_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const query = `
      INSERT OR IGNORE INTO group_category_assignments (id, group_id, category_id)
      VALUES (?, ?, ?)
    `;
    
    db.run(query, [assignmentId, groupId, categoryId], function(err: any) {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(this.lastID);
    });
  });
}

async function removeCategoryFromGroup(groupId: string, categoryId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = 'DELETE FROM group_category_assignments WHERE group_id = ? AND category_id = ?';
    
    db.run(query, [groupId, categoryId], function(err: any) {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(this.changes);
    });
  });
}

import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../../auth/db');

// GET - Get all group categories
export async function GET(request: NextRequest) {
  try {
    const categories = await getAllGroupCategories();
    
    return NextResponse.json({
      success: true,
      categories
    });

  } catch (error) {
    console.error('Error fetching group categories:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new group category (admin only)
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

    // TODO: Add admin check here when admin system is implemented
    // For now, allow any authenticated user to create categories

    const body = await request.json();
    const { name, description, color, icon } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Category name must be 50 characters or less' },
        { status: 400 }
      );
    }

    // Create category
    const categoryId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const category = await createGroupCategory({
      id: categoryId,
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '#3B82F6',
      icon: icon || '📁'
    });

    return NextResponse.json({
      success: true,
      category
    });

  } catch (error) {
    console.error('Error creating group category:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update group category (admin only)
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

    // TODO: Add admin check here when admin system is implemented

    const body = await request.json();
    const { categoryId, name, description, color, icon } = body;

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }

    // Check if category exists
    const existingCategory = await getCategoryById(categoryId);
    if (!existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    // Update category
    await updateGroupCategory(categoryId, {
      name: name?.trim(),
      description: description?.trim(),
      color,
      icon
    });

    return NextResponse.json({
      success: true,
      message: 'Category updated successfully'
    });

  } catch (error) {
    console.error('Error updating group category:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete group category (admin only)
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

    // TODO: Add admin check here when admin system is implemented

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }

    // Check if category exists
    const existingCategory = await getCategoryById(categoryId);
    if (!existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if category is in use
    const groupsUsingCategory = await getGroupsUsingCategory(categoryId);
    if (groupsUsingCategory.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete category that is in use by groups' },
        { status: 400 }
      );
    }

    // Delete category
    await deleteGroupCategory(categoryId);

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting group category:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
async function getAllGroupCategories() {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = `
      SELECT 
        gc.id, gc.name, gc.description, gc.color, gc.icon, gc.created_at,
        COUNT(gca.group_id) as group_count
      FROM group_categories gc
      LEFT JOIN group_category_assignments gca ON gc.id = gca.category_id
      GROUP BY gc.id
      ORDER BY gc.name ASC
    `;
    
    db.all(query, [], (err: any, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(rows);
    });
  });
}

async function createGroupCategory(categoryData: any) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = `
      INSERT INTO group_categories (id, name, description, color, icon, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    db.run(query, [
      categoryData.id,
      categoryData.name,
      categoryData.description,
      categoryData.color,
      categoryData.icon
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

async function updateGroupCategory(categoryId: string, updates: any) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const fields = [];
    const values = [];
    
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?');
      values.push(updates.icon);
    }
    
    values.push(categoryId);
    
    const query = `UPDATE group_categories SET ${fields.join(', ')} WHERE id = ?`;
    
    db.run(query, values, function(err: any) {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(this.changes);
    });
  });
}

async function getGroupsUsingCategory(categoryId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = 'SELECT group_id FROM group_category_assignments WHERE category_id = ?';
    
    db.all(query, [categoryId], (err: any, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(rows);
    });
  });
}

async function deleteGroupCategory(categoryId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = 'DELETE FROM group_categories WHERE id = ?';
    
    db.run(query, [categoryId], function(err: any) {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(this.changes);
    });
  });
}

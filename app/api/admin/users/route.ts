import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../../auth/db');

// GET - Get all users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const authToken = request.cookies.get('auth-token')?.value;
    if (!authToken) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const decoded = authDb.verifyToken(authToken);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const user = await authDb.getUserById(decoded.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const db = require('../../../../database/db');
    let users;
    if (q) {
      const like = `%${q}%`;
      users = await db.query(
        `SELECT id, username, display_name, email, role, created_at
         FROM users
         WHERE username LIKE ? OR display_name LIKE ? OR email LIKE ?
         ORDER BY created_at DESC`,
        [like, like, like]
      );
    } else {
      users = await db.query(`
        SELECT id, username, display_name, email, role, created_at
        FROM users
        ORDER BY created_at DESC
      `);
    }

    return NextResponse.json({ success: true, users: users.rows || [] });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}

// DELETE - Delete user
export async function DELETE(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token')?.value;
    if (!authToken) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const decoded = authDb.verifyToken(authToken);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const user = await authDb.getUserById(decoded.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (userId === decoded.id) {
      return NextResponse.json({ success: false, error: 'Cannot delete your own account' }, { status: 400 });
    }

    const db = require('../../../../database/db');
    
    // Check if user exists and is not admin
    const targetUser = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!targetUser.rows || targetUser.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (targetUser.rows[0].role === 'admin') {
      return NextResponse.json({ success: false, error: 'Cannot delete admin users' }, { status: 400 });
    }

    // Delete user - ON DELETE CASCADE will remove related rows (threads, sessions, settings, notifications, topics, submissions)
    await db.query('DELETE FROM users WHERE id = ?', [userId]);

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 });
  }
}

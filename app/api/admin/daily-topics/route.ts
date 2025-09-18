import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
const authDb = require('../../auth/db');

// GET - Get all daily topics
export async function GET(request: NextRequest) {
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

    const db = require('../../../../database/db');
    const topics = await db.query(`
      SELECT dt.*, u.username as created_by_username, u.display_name as created_by_display_name
      FROM daily_topics dt
      LEFT JOIN users u ON dt.created_by = u.id
      ORDER BY dt.created_at DESC
    `);

    return NextResponse.json({ success: true, topics: topics.rows || [] });
  } catch (error) {
    console.error('Error fetching daily topics:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch topics' }, { status: 500 });
  }
}

// POST - Create new daily topic
export async function POST(request: NextRequest) {
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

    const { title, description, is_active, scheduled_date } = await request.json();

    if (!title?.trim()) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const db = require('../../../../database/db');
    const topicId = uuidv4();

    // If setting as active, deactivate all other topics first
    if (is_active) {
      await db.query('UPDATE daily_topics SET is_active = FALSE');
    }

    await db.query(`
      INSERT INTO daily_topics (id, title, description, is_active, scheduled_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      topicId,
      title.trim(),
      description?.trim() || '',
      is_active || false,
      scheduled_date ? String(scheduled_date).slice(0, 10) : null,
      decoded.id
    ]);

    return NextResponse.json({ 
      success: true, 
      message: 'Daily topic created successfully',
      topic: { id: topicId, title, description, is_active, scheduled_date: scheduled_date ? String(scheduled_date).slice(0,10) : null }
    });
  } catch (error) {
    console.error('Error creating daily topic:', error);
    return NextResponse.json({ success: false, error: 'Failed to create topic' }, { status: 500 });
  }
}

// PUT - Update daily topic
export async function PUT(request: NextRequest) {
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

    const { id, title, description, is_active, scheduled_date } = await request.json();

    if (!id || !title?.trim()) {
      return NextResponse.json({ success: false, error: 'ID and title are required' }, { status: 400 });
    }

    const db = require('../../../../database/db');

    // If setting as active, deactivate all other topics first
    if (is_active) {
      await db.query('UPDATE daily_topics SET is_active = FALSE');
    }

    await db.query(`
      UPDATE daily_topics 
      SET title = ?, description = ?, is_active = ?, scheduled_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title.trim(),
      description?.trim() || '',
      is_active || false,
      scheduled_date ? String(scheduled_date).slice(0, 10) : null,
      id
    ]);

    return NextResponse.json({ 
      success: true, 
      message: 'Daily topic updated successfully' 
    });
  } catch (error) {
    console.error('Error updating daily topic:', error);
    return NextResponse.json({ success: false, error: 'Failed to update topic' }, { status: 500 });
  }
}

// DELETE - Delete daily topic
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
    const topicId = searchParams.get('id');

    if (!topicId) {
      return NextResponse.json({ success: false, error: 'Topic ID is required' }, { status: 400 });
    }

    const db = require('../../../../database/db');
    
    // Delete topic submissions first (cascade should handle this, but being explicit)
    await db.query('DELETE FROM topic_submissions WHERE topic_id = ?', [topicId]);
    
    // Delete the topic
    await db.query('DELETE FROM daily_topics WHERE id = ?', [topicId]);

    return NextResponse.json({ 
      success: true, 
      message: 'Daily topic deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting daily topic:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete topic' }, { status: 500 });
  }
}

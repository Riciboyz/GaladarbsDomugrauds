import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
const authDb = require('../auth/db');

// GET - Get submissions for a topic
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topicId');

    if (!topicId) {
      return NextResponse.json({ success: false, error: 'Topic ID is required' }, { status: 400 });
    }

    const db = require('../../../database/db');
    const submissions = await db.query(`
      SELECT ts.*, u.username, u.display_name, u.avatar
      FROM topic_submissions ts
      LEFT JOIN users u ON ts.user_id = u.id
      WHERE ts.topic_id = ?
      ORDER BY ts.created_at DESC
    `, [topicId]);

    return NextResponse.json({ success: true, submissions: submissions.rows || [] });
  } catch (error) {
    console.error('Error fetching topic submissions:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch submissions' }, { status: 500 });
  }
}

// POST - Create new topic submission
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

    const { topicId, content, imageUrl } = await request.json();

    if (!topicId) {
      return NextResponse.json({ success: false, error: 'Topic ID is required' }, { status: 400 });
    }

    if (!content?.trim() && !imageUrl) {
      return NextResponse.json({ success: false, error: 'Content or image is required' }, { status: 400 });
    }

    // Check if topic exists and is valid for today (either active or scheduled for today)
    const db = require('../../../database/db');
    const now = new Date();
    const localYear = now.getFullYear();
    const localMonth = String(now.getMonth() + 1).padStart(2, '0');
    const localDay = String(now.getDate()).padStart(2, '0');
    const effectiveDate = `${localYear}-${localMonth}-${localDay}`;

    const topic = await db.query(
      `SELECT * FROM daily_topics 
       WHERE id = ? AND (
         is_active = TRUE OR scheduled_date = ?
       )`,
      [topicId, effectiveDate]
    );
    
    if (!topic.rows || topic.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Topic not found or not available today' }, { status: 404 });
    }

    // Check if user already submitted for this topic
    const existingSubmission = await db.query(
      'SELECT id FROM topic_submissions WHERE topic_id = ? AND user_id = ?', 
      [topicId, decoded.id]
    );

    if (existingSubmission.rows && existingSubmission.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'You have already submitted for this topic' }, { status: 400 });
    }

    const submissionId = uuidv4();
    await db.query(`
      INSERT INTO topic_submissions (id, topic_id, user_id, content, image_url)
      VALUES (?, ?, ?, ?, ?)
    `, [submissionId, topicId, decoded.id, content?.trim() || '', imageUrl || '']);

    return NextResponse.json({ 
      success: true, 
      message: 'Submission created successfully',
      submission: { id: submissionId, topicId, content, imageUrl }
    });
  } catch (error) {
    console.error('Error creating topic submission:', error);
    return NextResponse.json({ success: false, error: 'Failed to create submission' }, { status: 500 });
  }
}

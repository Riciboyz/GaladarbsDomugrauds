import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../auth/db');

// GET - Get current active daily topic
export async function GET(request: NextRequest) {
  try {
    const db = require('../../../database/db');
    // Determine effective date (local server date) or preview override
    const { searchParams } = new URL(request.url);
    const previewDate = searchParams.get('previewDate');
    const now = new Date();
    const localYear = now.getFullYear();
    const localMonth = String(now.getMonth() + 1).padStart(2, '0');
    const localDay = String(now.getDate()).padStart(2, '0');
    const effectiveDate = previewDate || `${localYear}-${localMonth}-${localDay}`;

    // 1) Try to get today's scheduled topic (scheduled_date = effective local date)
    const todayScheduled = await db.query(
      `
      SELECT dt.*, u.username as created_by_username, u.display_name as created_by_display_name
      FROM daily_topics dt
      LEFT JOIN users u ON dt.created_by = u.id
      WHERE dt.scheduled_date = ?
      ORDER BY dt.created_at DESC
      LIMIT 1
    `,
      [effectiveDate]
    );

    if (todayScheduled.rows && todayScheduled.rows.length > 0) {
      return NextResponse.json({ success: true, topic: todayScheduled.rows[0] });
    }

    // 2) Fallback to current active topic
    const activeTopics = await db.query(`
      SELECT dt.*, u.username as created_by_username, u.display_name as created_by_display_name
      FROM daily_topics dt
      LEFT JOIN users u ON dt.created_by = u.id
      WHERE dt.is_active = TRUE
      ORDER BY dt.created_at DESC
      LIMIT 1
    `);

    if (activeTopics.rows && activeTopics.rows.length > 0) {
      return NextResponse.json({ success: true, topic: activeTopics.rows[0] });
    }

    return NextResponse.json({ success: true, topic: null });
  } catch (error) {
    console.error('Error fetching active daily topic:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch topic' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
const threadsDb = require('../db');

// GET - Search threads
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        success: true,
        threads: [],
        message: 'Please provide a search query'
      });
    }

    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        threads: [],
        message: 'Search query must be at least 2 characters long'
      });
    }

    const threads = await threadsDb.searchThreads(query.trim(), {
      limit,
      offset
    });

    return NextResponse.json({
      success: true,
      threads: threads,
      query: query.trim(),
      count: threads.length
    });

  } catch (error) {
    console.error('Error searching threads:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

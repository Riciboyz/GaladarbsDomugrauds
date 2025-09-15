import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../../auth/db');

// GET - Search users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        success: true,
        users: [],
        message: 'Please provide a search query'
      });
    }

    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        users: [],
        message: 'Search query must be at least 2 characters long'
      });
    }

    // Search users by username, display name, or email
    const users = await authDb.searchUsers(query.trim(), {
      limit,
      offset
    });

    // Remove sensitive information
    const safeUsers = users.map((user: any) => ({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      following: JSON.parse(user.following || '[]'),
      followers: JSON.parse(user.followers || '[]'),
      createdAt: user.created_at
    }));

    return NextResponse.json({
      success: true,
      users: safeUsers,
      query: query.trim(),
      count: safeUsers.length
    });

  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../../auth/db');

// GET - Get following for a user
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

    // Get userId from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user to get following list
    const user = await authDb.getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse following array
    const followingIds = JSON.parse(user.following || '[]');
    
    if (followingIds.length === 0) {
      return NextResponse.json({
        success: true,
        following: []
      });
    }

    // Get following user details
    const following = await Promise.all(
      followingIds.map(async (followingId: string) => {
        const followingUser = await authDb.getUserById(followingId);
        if (followingUser) {
          return {
            id: followingUser.id,
            username: followingUser.username,
            displayName: followingUser.display_name,
            avatar: followingUser.avatar,
            bio: followingUser.bio,
            isVerified: followingUser.is_verified || false,
            createdAt: followingUser.created_at
          };
        }
        return null;
      })
    );

    // Filter out null values (deleted users)
    const validFollowing = following.filter(user => user !== null);

    return NextResponse.json({
      success: true,
      following: validFollowing
    });

  } catch (error) {
    console.error('Error fetching following:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
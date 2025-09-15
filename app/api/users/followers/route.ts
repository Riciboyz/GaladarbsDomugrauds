import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../../auth/db');

// GET - Get followers for a user
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

    // Get user to get followers list
    const user = await authDb.getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse followers array
    const followerIds = JSON.parse(user.followers || '[]');
    
    if (followerIds.length === 0) {
      return NextResponse.json({
        success: true,
        followers: []
      });
    }

    // Get follower user details
    const followers = await Promise.all(
      followerIds.map(async (followerId: string) => {
        const follower = await authDb.getUserById(followerId);
        if (follower) {
          return {
            id: follower.id,
            username: follower.username,
            displayName: follower.display_name,
            avatar: follower.avatar,
            bio: follower.bio,
            isVerified: follower.is_verified || false,
            createdAt: follower.created_at
          };
        }
        return null;
      })
    );

    // Filter out null values (deleted users)
    const validFollowers = followers.filter(follower => follower !== null);

    return NextResponse.json({
      success: true,
      followers: validFollowers
    });

  } catch (error) {
    console.error('Error fetching followers:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
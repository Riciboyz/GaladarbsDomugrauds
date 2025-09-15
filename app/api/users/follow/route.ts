import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../../auth/db');

// POST - Follow/Unfollow user
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
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: 'User ID and action are required' },
        { status: 400 }
      );
    }

    if (userId === decoded.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot follow yourself' },
        { status: 400 }
      );
    }

    // Get current user and target user
    const currentUser = await authDb.getUserById(decoded.id);
    const targetUser = await authDb.getUserById(userId);

    if (!currentUser || !targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    let currentUserFollowing = JSON.parse(currentUser.following || '[]');
    let targetUserFollowers = JSON.parse(targetUser.followers || '[]');

    if (action === 'follow') {
      // Add to following/followers if not already present
      if (!currentUserFollowing.includes(userId)) {
        currentUserFollowing.push(userId);
      }
      if (!targetUserFollowers.includes(decoded.id)) {
        targetUserFollowers.push(decoded.id);
      }
    } else if (action === 'unfollow') {
      // Remove from following/followers
      currentUserFollowing = currentUserFollowing.filter((id: string) => id !== userId);
      targetUserFollowers = targetUserFollowers.filter((id: string) => id !== decoded.id);
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use: follow or unfollow' },
        { status: 400 }
      );
    }

    // Update both users
    await authDb.updateUser(decoded.id, {
      following: JSON.stringify(currentUserFollowing)
    });

    await authDb.updateUser(userId, {
      followers: JSON.stringify(targetUserFollowers)
    });

    // Get updated users
    const updatedCurrentUser = await authDb.getUserById(decoded.id);
    const updatedTargetUser = await authDb.getUserById(userId);

    return NextResponse.json({
      success: true,
      currentUser: {
        id: updatedCurrentUser.id,
        username: updatedCurrentUser.username,
        displayName: updatedCurrentUser.display_name,
        email: updatedCurrentUser.email,
        avatar: updatedCurrentUser.avatar,
        bio: updatedCurrentUser.bio,
        following: JSON.parse(updatedCurrentUser.following || '[]'),
        followers: JSON.parse(updatedCurrentUser.followers || '[]'),
        createdAt: updatedCurrentUser.created_at
      },
      targetUser: {
        id: updatedTargetUser.id,
        username: updatedTargetUser.username,
        displayName: updatedTargetUser.display_name,
        email: updatedTargetUser.email,
        avatar: updatedTargetUser.avatar,
        bio: updatedTargetUser.bio,
        following: JSON.parse(updatedTargetUser.following || '[]'),
        followers: JSON.parse(updatedTargetUser.followers || '[]'),
        createdAt: updatedTargetUser.created_at
      },
      message: `Successfully ${action}ed user`
    });

  } catch (error) {
    console.error('Error following/unfollowing user:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

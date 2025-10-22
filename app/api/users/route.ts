import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../auth/db');

// GET - Get all users
export async function GET(request: NextRequest) {
  try {
    const users = await authDb.getAllUsers();

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
      users: safeUsers
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update user profile
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

    const body = await request.json();
    const { username, displayName, email, avatar, bio } = body;

    // Validation
    if (username && username.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Username must be at least 3 characters long' },
        { status: 400 }
      );
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid email address' },
          { status: 400 }
        );
      }
    }

    // Update user
    const updatedUser = await authDb.updateUser(decoded.id, {
      username,
      displayName,
      email,
      avatar,
      bio
    });

    // Send real-time notification to followers about profile update
    try {
      const user = await authDb.getUserById(decoded.id);
      const followers = JSON.parse(user?.followers || '[]');
      
      if (followers.length > 0) {
        const wsResponse = await fetch('http://localhost:3001', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'profile_updated',
            userId: decoded.id,
            data: {
              userId: decoded.id,
              username: updatedUser.username,
              displayName: updatedUser.display_name || updatedUser.displayName,
              avatar: updatedUser.avatar,
              followers: followers,
              changes: {
                username: username ? 'updated' : 'unchanged',
                displayName: displayName ? 'updated' : 'unchanged',
                avatar: avatar ? 'updated' : 'unchanged',
                bio: bio ? 'updated' : 'unchanged'
              }
            }
          })
        });
        
        if (wsResponse.ok) {
          console.log('✅ Real-time profile update notification sent to followers via WebSocket');
        }
      }
    } catch (wsError) {
      console.error('❌ Error sending real-time profile update notification:', wsError);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.display_name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        bio: updatedUser.bio,
        following: JSON.parse(updatedUser.following || '[]'),
        followers: JSON.parse(updatedUser.followers || '[]'),
        createdAt: updatedUser.created_at
      },
      message: 'Profile updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating user:', error);
    
    if (error.message && (error.message.includes('already taken') || error.message.includes('already exists'))) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

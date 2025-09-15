import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../db');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, displayName, email, password, bio, avatar } = body;

    // Validation
    if (!username || !displayName || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Username, display name, email, and password are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Password validation
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Username validation
    if (username.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Username must be at least 3 characters long' },
        { status: 400 }
      );
    }

    // Create user
    const user = await authDb.createUser({
      username,
      displayName,
      email,
      password,
      bio,
      avatar
    });

    // Generate JWT token
    const token = authDb.generateToken(user);

    // Create session
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    await authDb.createSession(user.id, token, ipAddress, userAgent);

    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        following: JSON.parse(user.following || '[]'),
        followers: JSON.parse(user.followers || '[]'),
        createdAt: user.created_at
      },
      message: 'Registration successful'
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return response;

  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.message && (error.message.includes('already exists') || error.message.includes('already taken'))) {
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

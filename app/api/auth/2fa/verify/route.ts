import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
const authDb = require('../../db');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body || {};

    if (!email || !code) {
      return NextResponse.json({ success: false, error: 'Email and code are required' }, { status: 400 });
    }

    const user = await authDb.getUserByEmail(email);
    if (!user) {
      // Avoid leaking which emails exist
      return NextResponse.json({ success: false, error: 'Invalid code' }, { status: 400 });
    }

    const result = await authDb.verifyAndConsumeEmailOtp(user.id, 'login', String(code));
    if (!result.ok) {
      return NextResponse.json({ success: false, error: 'Invalid or expired code' }, { status: 400 });
    }

    // Create session now
    const token = authDb.generateToken(user);
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    await authDb.createSession(user.id, token, ipAddress, userAgent);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role || 'user',
        following: JSON.parse(user.following || '[]'),
        followers: JSON.parse(user.followers || '[]'),
        createdAt: user.created_at
      },
      message: 'Login successful'
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return response;
  } catch (error) {
    console.error('2FA verify error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}



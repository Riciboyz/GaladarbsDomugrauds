import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
const authDb = require('../db');
const { sendEmailOtp } = require('../mailer');

console.log('2FA flag at runtime (login):', process.env.TWO_FA_EMAIL_ENABLED);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Verify user credentials
    const user = await authDb.verifyUserPassword(email, password);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const twoFaEnabled = (process.env.TWO_FA_EMAIL_ENABLED || 'false').toLowerCase() === 'true';
    if (twoFaEnabled) {
      // Step 1: Generate and send OTP, do not create session yet
      const code = Math.floor(100000 + Math.random() * 900000);
      const ttlSeconds = parseInt(process.env.TWO_FA_EMAIL_TTL_SECONDS || '600', 10);
      await authDb.createEmailOtp(user.id, 'login', String(code), ttlSeconds);
      const mailResult = await sendEmailOtp(user.email, String(code));
      console.log('2FA mailer result:', mailResult);

      const devShowCode = (process.env.TWO_FA_DEV_SHOW_CODE || 'false').toLowerCase() === 'true';
      return NextResponse.json({
        success: true,
        twoFactorRequired: true,
        userHint: { email: user.email.replace(/(^.).+(@.*$)/, '$1***$2') },
        message: 'Verification code sent to email',
        ...(devShowCode ? { devCode: String(code) } : {})
      });
    }

    // 2FA disabled: proceed with normal session creation
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
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

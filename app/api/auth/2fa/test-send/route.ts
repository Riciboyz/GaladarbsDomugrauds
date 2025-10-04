import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
const { sendEmailOtp } = require('../../mailer');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body || {};
    if (!email) {
      return NextResponse.json({ success: false, error: 'email required' }, { status: 400 });
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const result = await sendEmailOtp(email, code);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error('test-send error:', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}



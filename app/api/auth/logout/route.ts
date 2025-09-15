import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../db');

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value;
    
    if (token) {
      // Delete session from database
      await authDb.deleteSession(token);
    }

    // Clear cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    response.cookies.delete('auth-token');

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if there's an error, clear the cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    response.cookies.delete('auth-token');
    return response;
  }
}

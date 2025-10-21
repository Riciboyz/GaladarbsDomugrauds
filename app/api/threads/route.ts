import { NextRequest, NextResponse } from 'next/server';
const threadsDb = require('./db');
const authDb = require('../auth/db');

// GET - Get all threads
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const userId = searchParams.get('userId');
    const feedType = searchParams.get('feedType');

    // If requesting following feed, identify current user from cookie
    let followingOnlyForUserId: string | null = null;
    if (feedType === 'following') {
      const authToken = request.cookies.get('auth-token')?.value;
      if (authToken) {
        const decoded = authDb.verifyToken(authToken);
        if (decoded) followingOnlyForUserId = decoded.id;
      }
    }

    const threads = await threadsDb.getAllThreads({
      limit,
      offset,
      userId: userId || null,
      followingOnlyForUserId
    });

    return NextResponse.json({
      success: true,
      threads: threads
    });

  } catch (error) {
    console.error('Error fetching threads:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new thread or reply
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
    const { content, visibility, attachments, parentId, groupId, topicDayId } = body;

    // Validation
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Content must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Create thread or reply
    const newThread = await threadsDb.createThread({
      authorId: decoded.id,
      content: content.trim(),
      visibility: visibility || 'public',
      parentId: parentId || null,
      attachments: attachments || [],
      groupId: groupId || null,
      topicDayId: topicDayId || null
    });

    // If this is a reply (comment), create notification for the original thread author
    if (parentId) {
      try {
        const parentThread = await threadsDb.getThreadById(parentId);
        if (parentThread && parentThread.author_id !== decoded.id) {
          // Get current user info
          const currentUser = await authDb.getUserById(decoded.id);
          
          // Create notification for the original thread author
          const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'comment',
              fromUserId: decoded.id,
              toUserId: parentThread.author_id,
              data: { 
                fromUsername: currentUser?.display_name || currentUser?.username || 'Someone',
                relatedId: parentId
              }
            })
          });
        }
      } catch (notificationError) {
        console.error('Error creating comment notification:', notificationError);
      }
    }

    // Broadcast new thread via WebSocket
    try {
      const wsResponse = await fetch('http://localhost:3001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_thread',
          data: newThread
        })
      });
    } catch (wsError) {
      console.log('WebSocket broadcast failed (server might not be running):', (wsError as Error).message);
    }

    return NextResponse.json({
      success: true,
      thread: newThread,
      message: parentId ? 'Reply created successfully' : 'Thread created successfully'
    });

  } catch (error) {
    console.error('Error creating thread:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Like/Unlike thread
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
    const { threadId, action } = body;

    if (!threadId || !action) {
      return NextResponse.json(
        { success: false, error: 'Thread ID and action are required' },
        { status: 400 }
      );
    }

    let result;
    switch (action) {
      case 'like':
        result = await threadsDb.likeThread(threadId, decoded.id);
        
        // Create notification for thread author if someone liked their thread
        if (result && result.author_id !== decoded.id) {
          try {
            const currentUser = await authDb.getUserById(decoded.id);
            
            const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'like',
                fromUserId: decoded.id,
                toUserId: result.author_id,
                data: { 
                  fromUsername: currentUser?.display_name || currentUser?.username || 'Someone',
                  relatedId: threadId
                }
              })
            });
          } catch (notificationError) {
            console.error('Error creating like notification:', notificationError);
          }
        }
        break;
      case 'unlike':
        result = await threadsDb.unlikeThread(threadId, decoded.id);
        break;
      case 'dislike':
        result = await threadsDb.dislikeThread(threadId, decoded.id);
        
        // Create notification for thread author if someone disliked their thread
        if (result && result.author_id !== decoded.id) {
          try {
            const currentUser = await authDb.getUserById(decoded.id);
            
            const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'dislike',
                fromUserId: decoded.id,
                toUserId: result.author_id,
                data: { 
                  fromUsername: currentUser?.display_name || currentUser?.username || 'Someone',
                  relatedId: threadId
                }
              })
            });
          } catch (notificationError) {
            console.error('Error creating dislike notification:', notificationError);
          }
        }
        break;
      case 'undislike':
        result = await threadsDb.undislikeThread(threadId, decoded.id);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: like, unlike, dislike, or undislike' },
          { status: 400 }
        );
    }

    // Broadcast thread update via WebSocket
    try {
      const wsResponse = await fetch('http://localhost:3001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'thread_updated',
          data: result
        })
      });
    } catch (wsError) {
      console.log('WebSocket broadcast failed (server might not be running):', (wsError as Error).message);
    }

    return NextResponse.json({
      success: true,
      thread: result,
      message: `Thread ${action}d successfully`
    });

  } catch (error) {
    console.error('Error updating thread:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete thread
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('id');

    if (!threadId) {
      return NextResponse.json(
        { success: false, error: 'Thread ID is required' },
        { status: 400 }
      );
    }

    // Check if user owns the thread
    const thread = await threadsDb.getThreadById(threadId);
    if (!thread) {
      return NextResponse.json(
        { success: false, error: 'Thread not found' },
        { status: 404 }
      );
    }

    if (thread.author_id !== decoded.id) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own threads' },
        { status: 403 }
      );
    }

    await threadsDb.deleteThread(threadId);

    // Broadcast thread deletion via WebSocket
    try {
      const wsResponse = await fetch('http://localhost:3001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'thread_deleted',
          data: { threadId }
        })
      });
    } catch (wsError) {
      console.log('WebSocket broadcast failed (server might not be running):', (wsError as Error).message);
    }

    return NextResponse.json({
      success: true,
      message: 'Thread deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting thread:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

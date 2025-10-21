import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../../auth/db');

// POST - Add or update reaction
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
    const { postId, commentId, reactionType } = body;

    if (!reactionType || !['like', 'love', 'laugh', 'wow', 'sad', 'angry'].includes(reactionType)) {
      return NextResponse.json(
        { success: false, error: 'Valid reaction type is required' },
        { status: 400 }
      );
    }

    if (!postId && !commentId) {
      return NextResponse.json(
        { success: false, error: 'Either post ID or comment ID is required' },
        { status: 400 }
      );
    }

    // Check if user has access to the post/comment
    let groupId = null;
    if (postId) {
      const post = await getPostById(postId);
      if (!post) {
        return NextResponse.json(
          { success: false, error: 'Post not found' },
          { status: 404 }
        );
      }
      groupId = post.group_id;
    } else if (commentId) {
      const comment = await getCommentById(commentId);
      if (!comment) {
        return NextResponse.json(
          { success: false, error: 'Comment not found' },
          { status: 404 }
        );
      }
      const post = await getPostById(comment.post_id);
      if (!post) {
        return NextResponse.json(
          { success: false, error: 'Post not found' },
          { status: 404 }
        );
      }
      groupId = post.group_id;
    }

    // Check if user is member of the group
    const group = await getGroupFromDB(groupId);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    const members = JSON.parse(group.members || '[]');
    if (!members.includes(decoded.id)) {
      return NextResponse.json(
        { success: false, error: 'You are not a member of this group' },
        { status: 403 }
      );
    }

    // Add or update reaction
    const reactionId = `reaction_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    await upsertReaction({
      id: reactionId,
      postId,
      commentId,
      userId: decoded.id,
      reactionType
    });

    // Get updated reaction counts
    const reactionCounts = postId 
      ? await getPostReactionCounts(postId)
      : await getCommentReactionCounts(commentId);

    // Broadcast to WebSocket server for real-time updates
    try {
      const wsPayload = {
        post_id: postId,
        comment_id: commentId,
        group_id: groupId,
        user_id: decoded.id,
        reaction_type: reactionType,
        reaction_counts: reactionCounts
      };
      
      await fetch('http://localhost:3001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'group_post_reaction', data: wsPayload })
      });
    } catch (wsError) {
      console.log('WS broadcast for reaction failed (non-critical):', (wsError as any).message || wsError);
    }

    return NextResponse.json({
      success: true,
      reactionType,
      reactionCounts
    });

  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove reaction
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
    const postId = searchParams.get('postId');
    const commentId = searchParams.get('commentId');

    if (!postId && !commentId) {
      return NextResponse.json(
        { success: false, error: 'Either post ID or comment ID is required' },
        { status: 400 }
      );
    }

    // Remove reaction
    await removeReaction(decoded.id, postId, commentId);

    // Get updated reaction counts
    const reactionCounts = postId 
      ? await getPostReactionCounts(postId)
      : await getCommentReactionCounts(commentId);

    // Get group ID for WebSocket broadcast
    let groupId = null;
    if (postId) {
      const post = await getPostById(postId);
      groupId = post?.group_id;
    } else if (commentId) {
      const comment = await getCommentById(commentId);
      if (comment) {
        const post = await getPostById(comment.post_id);
        groupId = post?.group_id;
      }
    }

    // Broadcast to WebSocket server for real-time updates
    if (groupId) {
      try {
        const wsPayload = {
          post_id: postId,
          comment_id: commentId,
          group_id: groupId,
          user_id: decoded.id,
          reaction_type: null, // null indicates removal
          reaction_counts: reactionCounts
        };
        
        await fetch('http://localhost:3001', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'group_post_reaction', data: wsPayload })
        });
      } catch (wsError) {
        console.log('WS broadcast for reaction removal failed (non-critical):', (wsError as any).message || wsError);
      }
    }

    return NextResponse.json({
      success: true,
      reactionCounts
    });

  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
async function getPostById(postId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = 'SELECT * FROM group_posts WHERE id = ? AND is_deleted = 0';
    
    db.get(query, [postId], (err: any, row: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(row);
    });
  });
}

async function getCommentById(commentId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = 'SELECT * FROM group_post_comments WHERE id = ? AND is_deleted = 0';
    
    db.get(query, [commentId], (err: any, row: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(row);
    });
  });
}

async function getGroupFromDB(groupId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = 'SELECT * FROM groups WHERE id = ? AND is_deleted = 0';
    
    db.get(query, [groupId], (err: any, row: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(row);
    });
  });
}

async function upsertReaction(reactionData: any) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    // First, try to update existing reaction
    let updateQuery = '';
    let updateParams = [];
    
    if (reactionData.postId) {
      updateQuery = 'UPDATE group_post_reactions SET reaction_type = ? WHERE post_id = ? AND user_id = ?';
      updateParams = [reactionData.reactionType, reactionData.postId, reactionData.userId];
    } else {
      updateQuery = 'UPDATE group_post_reactions SET reaction_type = ? WHERE comment_id = ? AND user_id = ?';
      updateParams = [reactionData.reactionType, reactionData.commentId, reactionData.userId];
    }
    
    db.run(updateQuery, updateParams, function(err: any) {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      
      // If no rows were updated, insert new reaction
      if (this.changes === 0) {
        const insertQuery = `
          INSERT INTO group_post_reactions (id, post_id, comment_id, user_id, reaction_type, created_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        db.run(insertQuery, [
          reactionData.id,
          reactionData.postId,
          reactionData.commentId,
          reactionData.userId,
          reactionData.reactionType
        ], function(err: any) {
          if (err) {
            reject(err);
            return;
          }
          
          db.close();
          resolve(this.lastID);
        });
      } else {
        db.close();
        resolve(this.changes);
      }
    });
  });
}

async function removeReaction(userId: string, postId?: string, commentId?: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    let query = '';
    let params = [];
    
    if (postId) {
      query = 'DELETE FROM group_post_reactions WHERE post_id = ? AND user_id = ?';
      params = [postId, userId];
    } else {
      query = 'DELETE FROM group_post_reactions WHERE comment_id = ? AND user_id = ?';
      params = [commentId, userId];
    }
    
    db.run(query, params, function(err: any) {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(this.changes);
    });
  });
}

async function getPostReactionCounts(postId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = `
      SELECT reaction_type, COUNT(*) as count
      FROM group_post_reactions
      WHERE post_id = ?
      GROUP BY reaction_type
    `;
    
    db.all(query, [postId], (err: any, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      const counts: any = {};
      rows.forEach((row: any) => {
        counts[row.reaction_type] = row.count;
      });
      
      db.close();
      resolve(counts);
    });
  });
}

async function getCommentReactionCounts(commentId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = `
      SELECT reaction_type, COUNT(*) as count
      FROM group_post_reactions
      WHERE comment_id = ?
      GROUP BY reaction_type
    `;
    
    db.all(query, [commentId], (err: any, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      const counts: any = {};
      rows.forEach((row: any) => {
        counts[row.reaction_type] = row.count;
      });
      
      db.close();
      resolve(counts);
    });
  });
}

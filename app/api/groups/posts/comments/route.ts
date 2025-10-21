import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../../auth/db');

// GET - Get post comments with pagination
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

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      );
    }

    // Check if user has access to the post (is member of the group)
    const post = await getPostById(postId);
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    const group = await getGroupFromDB(post.group_id);
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

    // Get comments with author info and reaction counts
    const comments = await getPostComments(postId, limit, offset);

    return NextResponse.json({
      success: true,
      comments
    });

  } catch (error) {
    console.error('Error fetching post comments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new comment
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
    const { postId, content, parentId, mediaUrls = [] } = body;

    if (!postId || !content) {
      return NextResponse.json(
        { success: false, error: 'Post ID and content are required' },
        { status: 400 }
      );
    }

    // Check if user has access to the post
    const post = await getPostById(postId);
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    const group = await getGroupFromDB(post.group_id);
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

    // Validate parent comment if provided
    if (parentId) {
      const parentComment = await getCommentById(parentId);
      if (!parentComment || parentComment.post_id !== postId) {
        return NextResponse.json(
          { success: false, error: 'Invalid parent comment' },
          { status: 400 }
        );
      }
    }

    // Create comment
    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const comment = await createPostComment({
      id: commentId,
      postId,
      authorId: decoded.id,
      content: content.trim(),
      parentId,
      mediaUrls
    });

    // Broadcast to WebSocket server for real-time updates
    try {
      const author = await authDb.getUserById(decoded.id);
      const wsPayload = {
        id: commentId,
        post_id: postId,
        group_id: post.group_id,
        author_id: decoded.id,
        content: content.trim(),
        parent_id: parentId,
        media_urls: mediaUrls,
        created_at: new Date().toISOString(),
        username: author?.username,
        display_name: author?.displayName || author?.display_name,
        avatar: author?.avatar || null,
        reaction_counts: {}
      };
      
      await fetch('http://localhost:3001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'group_post_comment', data: wsPayload })
      });
    } catch (wsError) {
      console.log('WS broadcast for comment failed (non-critical):', (wsError as any).message || wsError);
    }

    // Create notifications for post author and other commenters
    await createCommentNotifications(postId, decoded.id, content.substring(0, 50));

    return NextResponse.json({
      success: true,
      comment,
      commentId
    });

  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update comment
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
    const { commentId, content, mediaUrls } = body;

    if (!commentId) {
      return NextResponse.json(
        { success: false, error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    // Get comment and check permissions
    const comment = await getCommentById(commentId);
    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    const isAuthor = comment.author_id === decoded.id;
    const userRole = await getUserGroupRole(comment.post_id, decoded.id);
    const canModerate = ['admin', 'moderator'].includes(userRole);

    if (!isAuthor && !canModerate) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to edit this comment' },
        { status: 403 }
      );
    }

    // Update comment
    await updateComment(commentId, {
      content: content?.trim(),
      mediaUrls
    });

    return NextResponse.json({
      success: true,
      message: 'Comment updated successfully'
    });

  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete comment
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
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json(
        { success: false, error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    // Get comment and check permissions
    const comment = await getCommentById(commentId);
    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    const isAuthor = comment.author_id === decoded.id;
    const userRole = await getUserGroupRole(comment.post_id, decoded.id);
    const canModerate = ['admin', 'moderator'].includes(userRole);

    if (!isAuthor && !canModerate) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to delete this comment' },
        { status: 403 }
      );
    }

    // Soft delete comment
    await deleteComment(commentId);

    // Broadcast deletion to WebSocket
    try {
      await fetch('http://localhost:3001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'group_post_comment_deleted', 
          data: { commentId, postId: comment.post_id } 
        })
      });
    } catch (wsError) {
      console.log('WS broadcast for comment deletion failed (non-critical):', (wsError as any).message || wsError);
    }

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting comment:', error);
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

async function getPostComments(postId: string, limit: number, offset: number) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = `
      SELECT 
        gpc.id, gpc.post_id, gpc.author_id, gpc.content, gpc.parent_id,
        gpc.media_urls, gpc.created_at, gpc.updated_at,
        u.username, u.display_name, u.avatar
      FROM group_post_comments gpc
      JOIN users u ON gpc.author_id = u.id
      WHERE gpc.post_id = ? AND gpc.is_deleted = 0
      ORDER BY gpc.created_at ASC
      LIMIT ? OFFSET ?
    `;
    
    db.all(query, [postId, limit, offset], async (err: any, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Get reaction counts for each comment
      const commentsWithReactions = await Promise.all(rows.map(async (comment) => {
        const reactionCounts = await getCommentReactionCounts(comment.id);
        return {
          ...comment,
          media_urls: JSON.parse(comment.media_urls || '[]'),
          reaction_counts: reactionCounts
        };
      }));
      
      db.close();
      resolve(commentsWithReactions);
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

async function createPostComment(commentData: any) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = `
      INSERT INTO group_post_comments (id, post_id, author_id, content, parent_id, media_urls, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    db.run(query, [
      commentData.id,
      commentData.postId,
      commentData.authorId,
      commentData.content,
      commentData.parentId,
      JSON.stringify(commentData.mediaUrls)
    ], function(err: any) {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(this.lastID);
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

async function updateComment(commentId: string, updates: any) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const fields = [];
    const values = [];
    
    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.mediaUrls !== undefined) {
      fields.push('media_urls = ?');
      values.push(JSON.stringify(updates.mediaUrls));
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(commentId);
    
    const query = `UPDATE group_post_comments SET ${fields.join(', ')} WHERE id = ?`;
    
    db.run(query, values, function(err: any) {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(this.changes);
    });
  });
}

async function deleteComment(commentId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = 'UPDATE group_post_comments SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    db.run(query, [commentId], function(err: any) {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(this.changes);
    });
  });
}

async function getUserGroupRole(postId: string, userId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    // First get the group_id from the post
    const postQuery = 'SELECT group_id FROM group_posts WHERE id = ?';
    db.get(postQuery, [postId], (err: any, post: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!post) {
        db.close();
        resolve('member');
        return;
      }
      
      // Check if user is group creator
      const creatorQuery = 'SELECT created_by FROM groups WHERE id = ?';
      db.get(creatorQuery, [post.group_id], (err: any, group: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (group && group.created_by === userId) {
          db.close();
          resolve('admin');
          return;
        }
        
        // Check role in group_member_roles table
        const roleQuery = 'SELECT role FROM group_member_roles WHERE group_id = ? AND user_id = ?';
        db.get(roleQuery, [post.group_id, userId], (err: any, roleRow: any) => {
          if (err) {
            reject(err);
            return;
          }
          
          db.close();
          resolve(roleRow ? roleRow.role : 'member');
        });
      });
    });
  });
}

async function createCommentNotifications(postId: string, authorId: string, content: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    // Get post author and group members
    const getPostQuery = `
      SELECT gp.author_id, gp.group_id, g.members
      FROM group_posts gp
      JOIN groups g ON gp.group_id = g.id
      WHERE gp.id = ?
    `;
    
    db.get(getPostQuery, [postId], (err: any, post: any) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      
      if (!post) {
        db.close();
        resolve([]);
        return;
      }
      
      const members = JSON.parse(post.members || '[]');
      const postAuthor = post.author_id;
      
      // Notify post author (if different from comment author)
      const notifyUsers = [];
      if (postAuthor !== authorId) {
        notifyUsers.push(postAuthor);
      }
      
      // Notify other group members who have commented on this post
      const getCommentersQuery = `
        SELECT DISTINCT author_id
        FROM group_post_comments
        WHERE post_id = ? AND author_id != ? AND author_id != ?
      `;
      
      db.all(getCommentersQuery, [postId, authorId, postAuthor], (err: any, commenters: any[]) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }
        
        commenters.forEach(commenter => {
          if (!notifyUsers.includes(commenter.author_id)) {
            notifyUsers.push(commenter.author_id);
          }
        });
        
        if (notifyUsers.length === 0) {
          db.close();
          resolve([]);
          return;
        }
        
        // Create notifications
        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        const insertQuery = `
          INSERT INTO notifications (id, user_id, type, message, related_id, created_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        let completed = 0;
        const total = notifyUsers.length;
        
        notifyUsers.forEach((userId: string) => {
          const message = `New comment on post: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`;
          db.run(insertQuery, [notificationId + '_' + userId, userId, 'group_post_comment', message, postId], (err: any) => {
            if (err) {
              console.error('Error creating notification:', err);
            }
            
            completed++;
            if (completed === total) {
              db.close();
              resolve(completed);
            }
          });
        });
      });
    });
  });
}

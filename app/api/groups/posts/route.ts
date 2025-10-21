import { NextRequest, NextResponse } from 'next/server';
const authDb = require('../../auth/db');

// GET - Get group posts with pagination
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
    const groupId = searchParams.get('groupId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const postType = searchParams.get('type'); // Optional filter by post type

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: 'Group ID is required' },
        { status: 400 }
      );
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

    // Get posts with author info and reaction counts
    const posts = await getGroupPosts(groupId, limit, offset, postType);

    return NextResponse.json({
      success: true,
      posts
    });

  } catch (error) {
    console.error('Error fetching group posts:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new group post
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
    const { 
      groupId, 
      title, 
      content, 
      postType = 'text', 
      mediaUrls = [], 
      linkUrl, 
      linkPreview,
      pollOptions = [],
      pollEndDate,
      eventStartDate,
      eventEndDate,
      eventLocation,
      isPinned = false,
      isAnnouncement = false
    } = body;

    if (!groupId || !content) {
      return NextResponse.json(
        { success: false, error: 'Group ID and content are required' },
        { status: 400 }
      );
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

    // Check permissions for pinned/announcement posts
    if (isPinned || isAnnouncement) {
      const userRole = await getUserGroupRole(groupId, decoded.id);
      if (!['admin', 'moderator'].includes(userRole)) {
        return NextResponse.json(
          { success: false, error: 'Only admins and moderators can create pinned/announcement posts' },
          { status: 403 }
        );
      }
    }

    // Create post
    const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const post = await createGroupPost({
      id: postId,
      groupId,
      authorId: decoded.id,
      title: title?.trim(),
      content: content.trim(),
      postType,
      mediaUrls,
      linkUrl,
      linkPreview,
      pollOptions,
      pollEndDate,
      eventStartDate,
      eventEndDate,
      eventLocation,
      isPinned,
      isAnnouncement
    });

    // Broadcast to WebSocket server for real-time updates
    try {
      const author = await authDb.getUserById(decoded.id);
      const wsPayload = {
        id: postId,
        group_id: groupId,
        author_id: decoded.id,
        title: title?.trim(),
        content: content.trim(),
        post_type: postType,
        media_urls: mediaUrls,
        link_url: linkUrl,
        link_preview: linkPreview,
        poll_options: pollOptions,
        poll_end_date: pollEndDate,
        event_start_date: eventStartDate,
        event_end_date: eventEndDate,
        event_location: eventLocation,
        is_pinned: isPinned,
        is_announcement: isAnnouncement,
        created_at: new Date().toISOString(),
        username: author?.username,
        display_name: author?.displayName || author?.display_name,
        avatar: author?.avatar || null,
        reaction_counts: {},
        comment_count: 0
      };
      
      await fetch('http://localhost:3001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'group_post_created', data: wsPayload })
      });
    } catch (wsError) {
      console.log('WS broadcast for group post failed (non-critical):', (wsError as any).message || wsError);
    }

    // Create notifications for group members
    await createGroupPostNotifications(groupId, decoded.id, title || content.substring(0, 50));

    return NextResponse.json({
      success: true,
      post,
      postId
    });

  } catch (error) {
    console.error('Error creating group post:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update group post
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
    const { postId, title, content, mediaUrls, linkUrl, linkPreview } = body;

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      );
    }

    // Get post and check permissions
    const post = await getPostById(postId);
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    const isAuthor = post.author_id === decoded.id;
    const userRole = await getUserGroupRole(post.group_id, decoded.id);
    const canModerate = ['admin', 'moderator'].includes(userRole);

    if (!isAuthor && !canModerate) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to edit this post' },
        { status: 403 }
      );
    }

    // Update post
    await updateGroupPost(postId, {
      title: title?.trim(),
      content: content?.trim(),
      mediaUrls,
      linkUrl,
      linkPreview
    });

    return NextResponse.json({
      success: true,
      message: 'Post updated successfully'
    });

  } catch (error) {
    console.error('Error updating group post:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete group post
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

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      );
    }

    // Get post and check permissions
    const post = await getPostById(postId);
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    const isAuthor = post.author_id === decoded.id;
    const userRole = await getUserGroupRole(post.group_id, decoded.id);
    const canModerate = ['admin', 'moderator'].includes(userRole);

    if (!isAuthor && !canModerate) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to delete this post' },
        { status: 403 }
      );
    }

    // Soft delete post
    await deleteGroupPost(postId);

    // Broadcast deletion to WebSocket
    try {
      await fetch('http://localhost:3001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'group_post_deleted', 
          data: { postId, groupId: post.group_id } 
        })
      });
    } catch (wsError) {
      console.log('WS broadcast for post deletion failed (non-critical):', (wsError as any).message || wsError);
    }

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting group post:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
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

async function getGroupPosts(groupId: string, limit: number, offset: number, postType?: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    let query = `
      SELECT 
        gp.id, gp.group_id, gp.author_id, gp.title, gp.content, gp.post_type,
        gp.media_urls, gp.link_url, gp.link_preview, gp.poll_options, gp.poll_end_date,
        gp.event_start_date, gp.event_end_date, gp.event_location,
        gp.is_pinned, gp.is_announcement, gp.created_at, gp.updated_at,
        u.username, u.display_name, u.avatar,
        (SELECT COUNT(*) FROM group_post_comments gpc WHERE gpc.post_id = gp.id AND gpc.is_deleted = 0) as comment_count
      FROM group_posts gp
      JOIN users u ON gp.author_id = u.id
      WHERE gp.group_id = ? AND gp.is_deleted = 0
    `;
    
    const params = [groupId];
    
    if (postType) {
      query += ' AND gp.post_type = ?';
      params.push(postType);
    }
    
    query += ' ORDER BY gp.is_pinned DESC, gp.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    db.all(query, params, async (err: any, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Get reaction counts for each post
      const postsWithReactions = await Promise.all(rows.map(async (post) => {
        const reactionCounts = await getPostReactionCounts(post.id);
        return {
          ...post,
          media_urls: JSON.parse(post.media_urls || '[]'),
          link_preview: post.link_preview ? JSON.parse(post.link_preview) : null,
          poll_options: JSON.parse(post.poll_options || '[]'),
          reaction_counts: reactionCounts,
          comment_count: post.comment_count || 0
        };
      }));
      
      db.close();
      resolve(postsWithReactions);
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

async function createGroupPost(postData: any) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = `
      INSERT INTO group_posts (
        id, group_id, author_id, title, content, post_type, media_urls,
        link_url, link_preview, poll_options, poll_end_date, event_start_date,
        event_end_date, event_location, is_pinned, is_announcement, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    db.run(query, [
      postData.id,
      postData.groupId,
      postData.authorId,
      postData.title,
      postData.content,
      postData.postType,
      JSON.stringify(postData.mediaUrls),
      postData.linkUrl,
      postData.linkPreview ? JSON.stringify(postData.linkPreview) : null,
      JSON.stringify(postData.pollOptions),
      postData.pollEndDate,
      postData.eventStartDate,
      postData.eventEndDate,
      postData.eventLocation,
      postData.isPinned ? 1 : 0,
      postData.isAnnouncement ? 1 : 0
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

async function updateGroupPost(postId: string, updates: any) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const fields = [];
    const values = [];
    
    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.mediaUrls !== undefined) {
      fields.push('media_urls = ?');
      values.push(JSON.stringify(updates.mediaUrls));
    }
    if (updates.linkUrl !== undefined) {
      fields.push('link_url = ?');
      values.push(updates.linkUrl);
    }
    if (updates.linkPreview !== undefined) {
      fields.push('link_preview = ?');
      values.push(updates.linkPreview ? JSON.stringify(updates.linkPreview) : null);
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(postId);
    
    const query = `UPDATE group_posts SET ${fields.join(', ')} WHERE id = ?`;
    
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

async function deleteGroupPost(postId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = 'UPDATE group_posts SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    db.run(query, [postId], function(err: any) {
      if (err) {
        reject(err);
        return;
      }
      
      db.close();
      resolve(this.changes);
    });
  });
}

async function getUserGroupRole(groupId: string, userId: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    // Check if user is group creator
    const creatorQuery = 'SELECT created_by FROM groups WHERE id = ?';
    db.get(creatorQuery, [groupId], (err: any, group: any) => {
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
      db.get(roleQuery, [groupId, userId], (err: any, roleRow: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        db.close();
        resolve(roleRow ? roleRow.role : 'member');
      });
    });
  });
}

async function createGroupPostNotifications(groupId: string, authorId: string, content: string) {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'threads_app.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    // Get all group members except the author
    const getMembersQuery = 'SELECT members FROM groups WHERE id = ?';
    
    db.get(getMembersQuery, [groupId], (err: any, group: any) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      
      const members = JSON.parse(group.members || '[]');
      const otherMembers = members.filter((id: string) => id !== authorId);
      
      if (otherMembers.length === 0) {
        db.close();
        resolve([]);
        return;
      }
      
      // Create notifications for all other members
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const insertQuery = `
        INSERT INTO notifications (id, user_id, type, message, related_id, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      let completed = 0;
      const total = otherMembers.length;
      
      otherMembers.forEach((memberId: string) => {
        const message = `New post in group: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`;
        db.run(insertQuery, [notificationId + '_' + memberId, memberId, 'group_post', message, groupId], (err: any) => {
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
}

const db = require('../../../database/db');
const crypto = require('crypto');

// Thread functions
const createThread = async (threadData) => {
  const { authorId, content, visibility, parentId, attachments, groupId, topicDayId } = threadData;
  
  try {
    const threadId = crypto.randomUUID();
    
    await db.query(`
      INSERT INTO threads (id, author_id, content, parent_id, group_id, topic_day_id, visibility, attachments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      threadId, 
      authorId, 
      content, 
      parentId || null, 
      groupId || null, 
      topicDayId || null, 
      visibility || 'public', 
      JSON.stringify(attachments || [])
    ]);
    
    return await getThreadById(threadId);
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
};

const getThreadById = async (id) => {
  try {
    const result = await db.get(`
      SELECT 
        t.id, t.author_id, t.content, t.parent_id, t.group_id, t.topic_day_id,
        t.visibility, t.attachments, t.likes, t.dislikes, t.created_at, t.updated_at,
        u.username, u.display_name, u.avatar
      FROM threads t
      JOIN users u ON t.author_id = u.id
      WHERE t.id = ?
    `, [id]);
    
    if (!result.rows[0]) {
      return null;
    }
    
    const thread = result.rows[0];
    return {
      ...thread,
      likes: JSON.parse(thread.likes || '[]'),
      dislikes: JSON.parse(thread.dislikes || '[]'),
      attachments: JSON.parse(thread.attachments || '[]'),
      author: {
        id: thread.author_id,
        username: thread.username,
        displayName: thread.display_name,
        avatar: thread.avatar
      }
    };
  } catch (error) {
    console.error('Error getting thread by ID:', error);
    throw error;
  }
};

const getAllThreads = async (options = {}) => {
  const { limit = 50, offset = 0, userId = null } = options;
  
  try {
    let query = `
      SELECT 
        t.id, t.author_id, t.content, t.parent_id, t.group_id, t.topic_day_id,
        t.visibility, t.attachments, t.likes, t.dislikes, t.created_at, t.updated_at,
        u.username, u.display_name, u.avatar
      FROM threads t
      JOIN users u ON t.author_id = u.id
      WHERE t.parent_id IS NULL
    `;
    
    const params = [];
    
    if (userId) {
      query += ' AND t.author_id = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    
    const threads = result.rows.map(thread => ({
      ...thread,
      likes: JSON.parse(thread.likes || '[]'),
      dislikes: JSON.parse(thread.dislikes || '[]'),
      attachments: JSON.parse(thread.attachments || '[]'),
      author: {
        id: thread.author_id,
        username: thread.username,
        displayName: thread.display_name,
        avatar: thread.avatar
      },
      replies: [],
      comments: []
    }));
    
    // Get replies for each thread
    for (const thread of threads) {
      const replies = await getThreadReplies(thread.id);
      thread.replies = replies;
    }
    
    return threads;
  } catch (error) {
    console.error('Error getting all threads:', error);
    throw error;
  }
};

const getThreadReplies = async (parentId) => {
  try {
    const result = await db.query(`
      SELECT 
        t.id, t.author_id, t.content, t.parent_id, t.group_id, t.topic_day_id,
        t.visibility, t.attachments, t.likes, t.dislikes, t.created_at, t.updated_at,
        u.username, u.display_name, u.avatar
      FROM threads t
      JOIN users u ON t.author_id = u.id
      WHERE t.parent_id = ?
      ORDER BY t.created_at ASC
    `, [parentId]);
    
    return result.rows.map(thread => ({
      ...thread,
      likes: JSON.parse(thread.likes || '[]'),
      dislikes: JSON.parse(thread.dislikes || '[]'),
      attachments: JSON.parse(thread.attachments || '[]'),
      author: {
        id: thread.author_id,
        username: thread.username,
        displayName: thread.display_name,
        avatar: thread.avatar
      }
    }));
  } catch (error) {
    console.error('Error getting thread replies:', error);
    throw error;
  }
};

const updateThread = async (id, updateData) => {
  try {
    const { content, visibility, attachments } = updateData;
    
    await db.query(`
      UPDATE threads 
      SET content = COALESCE(?, content),
          visibility = COALESCE(?, visibility),
          attachments = COALESCE(?, attachments),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [content, visibility, attachments ? JSON.stringify(attachments) : null, id]);
    
    return await getThreadById(id);
  } catch (error) {
    console.error('Error updating thread:', error);
    throw error;
  }
};

const deleteThread = async (id) => {
  try {
    await db.query('DELETE FROM threads WHERE id = ?', [id]);
    await db.query('DELETE FROM threads WHERE parent_id = ?', [id]); // Delete replies
    return true;
  } catch (error) {
    console.error('Error deleting thread:', error);
    throw error;
  }
};

const likeThread = async (threadId, userId) => {
  try {
    const thread = await getThreadById(threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }
    
    let likes = thread.likes || [];
    let dislikes = thread.dislikes || [];
    
    // Remove from dislikes if present
    dislikes = dislikes.filter(id => id !== userId);
    
    // Add to likes if not already present
    if (!likes.includes(userId)) {
      likes.push(userId);
    }
    
    await db.query(`
      UPDATE threads 
      SET likes = ?, dislikes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [JSON.stringify(likes), JSON.stringify(dislikes), threadId]);
    
    return await getThreadById(threadId);
  } catch (error) {
    console.error('Error liking thread:', error);
    throw error;
  }
};

const unlikeThread = async (threadId, userId) => {
  try {
    const thread = await getThreadById(threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }
    
    let likes = thread.likes || [];
    
    // Remove from likes
    likes = likes.filter(id => id !== userId);
    
    await db.query(`
      UPDATE threads 
      SET likes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [JSON.stringify(likes), threadId]);
    
    return await getThreadById(threadId);
  } catch (error) {
    console.error('Error unliking thread:', error);
    throw error;
  }
};

const dislikeThread = async (threadId, userId) => {
  try {
    const thread = await getThreadById(threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }
    
    let likes = thread.likes || [];
    let dislikes = thread.dislikes || [];
    
    // Remove from likes if present
    likes = likes.filter(id => id !== userId);
    
    // Add to dislikes if not already present
    if (!dislikes.includes(userId)) {
      dislikes.push(userId);
    }
    
    await db.query(`
      UPDATE threads 
      SET likes = ?, dislikes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [JSON.stringify(likes), JSON.stringify(dislikes), threadId]);
    
    return await getThreadById(threadId);
  } catch (error) {
    console.error('Error disliking thread:', error);
    throw error;
  }
};

const undislikeThread = async (threadId, userId) => {
  try {
    const thread = await getThreadById(threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }
    
    let dislikes = thread.dislikes || [];
    
    // Remove from dislikes
    dislikes = dislikes.filter(id => id !== userId);
    
    await db.query(`
      UPDATE threads 
      SET dislikes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [JSON.stringify(dislikes), threadId]);
    
    return await getThreadById(threadId);
  } catch (error) {
    console.error('Error undisliking thread:', error);
    throw error;
  }
};

const searchThreads = async (query, options = {}) => {
  const { limit = 50, offset = 0 } = options;
  
  try {
    const result = await db.query(`
      SELECT 
        t.id, t.author_id, t.content, t.parent_id, t.group_id, t.topic_day_id,
        t.visibility, t.attachments, t.likes, t.dislikes, t.created_at, t.updated_at,
        u.username, u.display_name, u.avatar
      FROM threads t
      JOIN users u ON t.author_id = u.id
      WHERE t.content LIKE ? AND t.parent_id IS NULL
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `, [`%${query}%`, limit, offset]);
    
    return result.rows.map(thread => ({
      ...thread,
      likes: JSON.parse(thread.likes || '[]'),
      dislikes: JSON.parse(thread.dislikes || '[]'),
      attachments: JSON.parse(thread.attachments || '[]'),
      author: {
        id: thread.author_id,
        username: thread.username,
        displayName: thread.display_name,
        avatar: thread.avatar
      },
      replies: [],
      comments: []
    }));
  } catch (error) {
    console.error('Error searching threads:', error);
    throw error;
  }
};

module.exports = {
  createThread,
  getThreadById,
  getAllThreads,
  getThreadReplies,
  updateThread,
  deleteThread,
  likeThread,
  unlikeThread,
  dislikeThread,
  undislikeThread,
  searchThreads
};

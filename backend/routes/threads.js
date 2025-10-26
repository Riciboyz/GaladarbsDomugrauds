const express = require('express');
const router = express.Router();
const threadsDb = require('../database/threads/db');
const authDb = require('../database/auth/db');

/**
 * @swagger
 * components:
 *   schemas:
 *     Thread:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         content:
 *           type: string
 *         author_id:
 *           type: string
 *         visibility:
 *           type: string
 *         parent_id:
 *           type: string
 *         group_id:
 *           type: string
 *         topic_day_id:
 *           type: string
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *         likes_count:
 *           type: integer
 *         dislikes_count:
 *           type: integer
 *         comments_count:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/threads:
 *   get:
 *     summary: Get all threads
 *     tags: [Threads]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of threads to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of threads to skip
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter threads by user ID
 *       - in: query
 *         name: feedType
 *         schema:
 *           type: string
 *           enum: [following, all]
 *         description: Type of feed to return
 *     responses:
 *       200:
 *         description: List of threads
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 threads:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Thread'
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, userId, feedType } = req.query;

    // If requesting following feed, identify current user from token
    let followingOnlyForUserId = null;
    if (feedType === 'following') {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (token) {
        const decoded = authDb.verifyToken(token);
        if (decoded) followingOnlyForUserId = decoded.id;
      }
    }

    const threads = await threadsDb.getAllThreads({
      limit: parseInt(limit),
      offset: parseInt(offset),
      userId: userId || null,
      followingOnlyForUserId
    });

    res.json({
      success: true,
      threads: threads
    });

  } catch (error) {
    console.error('Error fetching threads:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/threads:
 *   post:
 *     summary: Create new thread or reply
 *     tags: [Threads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *               visibility:
 *                 type: string
 *                 enum: [public, private, followers]
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *               parentId:
 *                 type: string
 *               groupId:
 *                 type: string
 *               topicDayId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Thread created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 thread:
 *                   $ref: '#/components/schemas/Thread'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', async (req, res) => {
  try {
    const { content, visibility, attachments, parentId, groupId, topicDayId } = req.body;

    // Validation
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    if (content.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Content must be 500 characters or less'
      });
    }

    // Create thread or reply
    const newThread = await threadsDb.createThread({
      authorId: req.user.id,
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
        if (parentThread && parentThread.author_id !== req.user.id) {
          // Get current user info
          const currentUser = await authDb.getUserById(req.user.id);
          
          // Create notification for the original thread author
          const notificationResponse = await fetch(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/notifications/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'comment',
              fromUserId: req.user.id,
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
    if (global.broadcastNewThread) {
      global.broadcastNewThread(newThread, groupId);
    }

    res.json({
      success: true,
      thread: newThread,
      message: parentId ? 'Reply created successfully' : 'Thread created successfully'
    });

  } catch (error) {
    console.error('Error creating thread:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/threads/{id}:
 *   put:
 *     summary: Like/Unlike thread
 *     tags: [Threads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Thread ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [like, unlike, dislike, undislike]
 *     responses:
 *       200:
 *         description: Thread updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', async (req, res) => {
  try {
    const { id: threadId } = req.params;
    const { action } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required'
      });
    }

    let result;
    switch (action) {
      case 'like':
        result = await threadsDb.likeThread(threadId, req.user.id);
        
        // Create notification for thread author if someone liked their thread
        if (result && result.author_id !== req.user.id) {
          try {
            const currentUser = await authDb.getUserById(req.user.id);
            
            const notificationResponse = await fetch(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/notifications/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'like',
                fromUserId: req.user.id,
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
        result = await threadsDb.unlikeThread(threadId, req.user.id);
        break;
      case 'dislike':
        result = await threadsDb.dislikeThread(threadId, req.user.id);
        
        // Create notification for thread author if someone disliked their thread
        if (result && result.author_id !== req.user.id) {
          try {
            const currentUser = await authDb.getUserById(req.user.id);
            
            const notificationResponse = await fetch(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/notifications/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'dislike',
                fromUserId: req.user.id,
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
        result = await threadsDb.undislikeThread(threadId, req.user.id);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Use: like, unlike, dislike, or undislike'
        });
    }

    // Broadcast thread update via WebSocket
    if (global.broadcastThreadUpdate) {
      global.broadcastThreadUpdate(result, result?.group_id);
    }

    res.json({
      success: true,
      thread: result,
      message: `Thread ${action}d successfully`
    });

  } catch (error) {
    console.error('Error updating thread:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/threads/{id}:
 *   delete:
 *     summary: Delete thread
 *     tags: [Threads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Thread ID
 *     responses:
 *       200:
 *         description: Thread deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Thread not found
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id: threadId } = req.params;

    // Check if user owns the thread
    const thread = await threadsDb.getThreadById(threadId);
    if (!thread) {
      return res.status(404).json({
        success: false,
        error: 'Thread not found'
      });
    }

    if (thread.author_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own threads'
      });
    }

    await threadsDb.deleteThread(threadId);

    // Broadcast thread deletion via WebSocket
    if (global.io) {
      global.io.emit('thread_deleted', { threadId });
    }

    res.json({
      success: true,
      message: 'Thread deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting thread:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;

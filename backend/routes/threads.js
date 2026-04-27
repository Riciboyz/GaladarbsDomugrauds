const { Router } = require('express');
const crypto = require('crypto');
const {
  authenticateToken,
  optionalAuth,
  currentUserId,
  requireAdmin,
  assertUserCanCreateContent,
} = require('../middleware/auth');
const { rowToThread, safeJsonParse } = require('../helpers/utils');
const { logAudit, touchLastActive } = require('../helpers/audit');
const { INPUT_LIMITS, validateRequiredTrimmed } = require('../helpers/inputValidation');

const THREAD_SELECT = `SELECT t.*, u.id as user_id, u.username, u.display_name, u.avatar as avatar_url
     FROM threads t JOIN users u ON t.author_id = u.id`;

const THREAD_FEED_FILTER = ` AND u.deleted_at IS NULL AND (COALESCE(t.visibility, 'public') != 'hidden')`;

module.exports = function (db, io) {
  const router = Router();

  router.get('/', optionalAuth, (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const feedType = req.query.feedType || 'all';
    const viewerId = currentUserId(req);

    let sql = `${THREAD_SELECT} WHERE (t.parent_id IS NULL OR t.parent_id = '')${THREAD_FEED_FILTER}`;
    const params = [];

    if (feedType === 'following') {
      sql += ` AND t.author_id IN (SELECT following_id FROM followers WHERE follower_id = ?)`;
      params.push(viewerId);
    }
    sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      const parents = rows.map(rowToThread);
      const parentIds = parents.map((t) => t.id).filter(Boolean);

      if (parentIds.length === 0) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        return res.json({ success: true, threads: parents });
      }

      const placeholders = parentIds.map(() => '?').join(',');
      const repliesSql = `${THREAD_SELECT} WHERE t.parent_id IN (${placeholders})${THREAD_FEED_FILTER} ORDER BY t.created_at ASC`;

      db.all(repliesSql, parentIds, (repliesErr, replyRows) => {
        if (repliesErr) {
          return res.status(500).json({ error: 'Database error', details: repliesErr.message });
        }

        const repliesByParentId = new Map();
        for (const row of replyRows || []) {
          const reply = rowToThread(row);
          const pid = reply.parentId;
          if (!pid) continue;
          const list = repliesByParentId.get(pid);
          if (list) list.push(reply);
          else repliesByParentId.set(pid, [reply]);
        }

        const withReplies = parents.map((p) => ({
          ...p,
          replies: repliesByParentId.get(p.id) || [],
        }));

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.json({ success: true, threads: withReplies });
      });
    });
  });

  router.get('/search', (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ success: true, threads: [] });
    db.all(
      `${THREAD_SELECT} WHERE t.content LIKE ? AND (t.parent_id IS NULL OR t.parent_id = '')${THREAD_FEED_FILTER} ORDER BY t.created_at DESC LIMIT 50`,
      [`%${q}%`],
      (err, rows) => {
        if (err) return res.status(500).json({ success: false, threads: [] });
        res.json({ success: true, threads: rows.map(rowToThread) });
      }
    );
  });

  router.post('/', optionalAuth, assertUserCanCreateContent(db), (req, res) => {
    const body = req.body || {};
    const content = body.content;
    const parent_id = body.parent_id ?? body.parentId ?? null;
    const group_id = body.group_id ?? body.groupId ?? null;
    const topic_day_id = body.topic_day_id ?? body.topicDayId ?? null;
    const visibility = body.visibility || 'public';
    const attachments = body.attachments;
    const userId = currentUserId(req);

    const validContent = validateRequiredTrimmed(content, {
      field: 'Content',
      maxLength: INPUT_LIMITS.THREAD_CONTENT,
    });
    if (!validContent.ok) return res.status(400).json({ error: validContent.error });

    const threadId = crypto.randomUUID();
    const attachmentsJson = attachments ? JSON.stringify(attachments) : '[]';

    db.run(
      `INSERT INTO threads (id, author_id, content, parent_id, group_id, topic_day_id, visibility, attachments, likes, dislikes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', datetime('now'), datetime('now'))`,
      [threadId, userId, validContent.value, parent_id, group_id, topic_day_id, visibility, attachmentsJson],
      function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        touchLastActive(db, userId, () => {});
        db.get(`${THREAD_SELECT} WHERE t.id = ?`, [threadId], (e, row) => {
          if (e || !row) return res.status(500).json({ error: 'Database error' });
          const thread = rowToThread(row);
          io.emit('thread_created', thread);
          res.json({ success: true, thread });
        });
      }
    );
  });

  router.patch('/:id/moderation', requireAdmin(db), (req, res) => {
    const threadId = req.params.id;
    const action = (req.body && req.body.action) || '';
    const actorId = req.user.id;
    if (!['hide', 'unhide'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action must be hide or unhide' });
    }
    const visibility = action === 'hide' ? 'hidden' : 'public';
    db.run(
      'UPDATE threads SET visibility = ?, updated_at = datetime("now") WHERE id = ?',
      [visibility, threadId],
      function (err) {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });
        if (!this.changes) return res.status(404).json({ success: false, error: 'Thread not found' });
        logAudit(
          db,
          {
            actorId,
            action: action === 'hide' ? 'thread.hide' : 'thread.unhide',
            entityType: 'thread',
            entityId: threadId,
            metadata: { visibility }
          },
          () => {
            db.get(`${THREAD_SELECT} WHERE t.id = ?`, [threadId], (e2, row) => {
              if (!e2 && row) {
                const thread = rowToThread(row);
                io.emit('thread_updated', thread);
              }
              res.json({ success: true });
            });
          }
        );
      }
    );
  });

  router.delete('/admin/:threadId', requireAdmin(db), (req, res) => {
    const threadId = req.params.threadId;
    const actorId = req.user.id;
    db.get('SELECT id, parent_id, content FROM threads WHERE id = ?', [threadId], (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!row) return res.status(404).json({ error: 'Thread not found' });
      db.run('DELETE FROM threads WHERE id = ? OR parent_id = ?', [threadId, threadId], function (delErr) {
        if (delErr) return res.status(500).json({ error: 'Database error' });
        logAudit(
          db,
          {
            actorId,
            action: 'thread.admin_delete',
            entityType: 'thread',
            entityId: threadId,
            metadata: { parentId: row.parent_id, snippet: String(row.content || '').slice(0, 200) }
          },
          () => {
            io.emit('thread_deleted', { threadId });
            res.json({ success: true });
          }
        );
      });
    });
  });

  router.put('/', authenticateToken, (req, res) => {
    const { threadId, action } = req.body;
    const userId = currentUserId(req);
    if (!threadId || !userId || !action) return res.status(400).json({ error: 'Missing required fields' });

    db.get('SELECT * FROM threads WHERE id = ?', [threadId], (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!row) return res.status(404).json({ error: 'Thread not found' });

      let likes = safeJsonParse(row.likes, []);
      let dislikes = safeJsonParse(row.dislikes, []);
      if (!Array.isArray(likes)) likes = [];
      if (!Array.isArray(dislikes)) dislikes = [];

      if (action === 'like') {
        if (!likes.includes(userId)) {
          likes.push(userId);
          dislikes = dislikes.filter((id) => id !== userId);
        }
      } else if (action === 'unlike') {
        likes = likes.filter((id) => id !== userId);
      } else if (action === 'dislike') {
        if (!dislikes.includes(userId)) {
          dislikes.push(userId);
          likes = likes.filter((id) => id !== userId);
        }
      } else if (action === 'undislike') {
        dislikes = dislikes.filter((id) => id !== userId);
      }

      db.run(
        'UPDATE threads SET likes = ?, dislikes = ?, updated_at = datetime("now") WHERE id = ?',
        [JSON.stringify(likes), JSON.stringify(dislikes), threadId],
        (e) => {
          if (e) return res.status(500).json({ error: 'Database error' });
          db.get(`${THREAD_SELECT} WHERE t.id = ?`, [threadId], (e2, updatedRow) => {
            if (e2 || !updatedRow) return res.status(500).json({ error: 'Database error' });
            const thread = rowToThread(updatedRow);
            io.emit('thread_updated', thread);
            res.json({ success: true, thread });
          });
        }
      );
    });
  });

  router.delete('/', optionalAuth, (req, res) => {
    const threadId = req.query.id;
    if (!threadId) return res.status(400).json({ error: 'Thread id required' });
    const userId = currentUserId(req);
    db.get('SELECT author_id FROM threads WHERE id = ?', [threadId], (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!row) return res.status(404).json({ error: 'Thread not found' });
      if (row.author_id !== userId) return res.status(403).json({ error: 'Not allowed to delete this thread' });
      db.run('DELETE FROM threads WHERE id = ? OR parent_id = ?', [threadId, threadId], function (delErr) {
        if (delErr) return res.status(500).json({ error: 'Database error' });
        io.emit('thread_deleted', { threadId });
        res.json({ success: true });
      });
    });
  });

  router.post('/:id/like', optionalAuth, (req, res) => {
    const threadId = req.params.id;
    const userId = currentUserId(req);
    db.get('SELECT likes FROM threads WHERE id = ?', [threadId], (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!row) return res.status(404).json({ error: 'Thread not found' });
      const likes = safeJsonParse(row.likes, []);
      const isLiked = likes.includes(userId);
      const newLikes = isLiked ? likes.filter((id) => id !== userId) : [...likes, userId];
      db.run('UPDATE threads SET likes = ? WHERE id = ?', [JSON.stringify(newLikes), threadId], (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, liked: !isLiked, likes: newLikes });
      });
    });
  });

  return router;
};

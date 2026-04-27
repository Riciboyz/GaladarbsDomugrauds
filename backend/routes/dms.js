const { Router } = require('express');
const crypto = require('crypto');
const { authenticateToken, currentUserId, loadAuthUser, assertUserCanCreateContent } = require('../middleware/auth');
const { toIsoUtc, safeJsonParse } = require('../helpers/utils');
const dmCore = require('../helpers/dmCore');

module.exports = function (db, io) {
  const router = Router();

  const auth = [authenticateToken, loadAuthUser(db)];
  const authCreate = [...auth, assertUserCanCreateContent(db)];

  function mapErr(res, err) {
    const code = err && err.message;
    if (code === 'empty' || code === 'too_long') return res.status(400).json({ success: false, error: 'Invalid message' });
    if (code === 'rate_limited') return res.status(429).json({ success: false, error: 'Too many messages — try again shortly' });
    if (code === 'not_found') return res.status(404).json({ success: false, error: 'Conversation not found' });
    if (code === 'forbidden') return res.status(403).json({ success: false, error: 'Forbidden' });
    if (code === 'blocked') return res.status(403).json({ success: false, error: 'Cannot message this user' });
    if (code === 'invalid_attachment') return res.status(400).json({ success: false, error: 'Invalid attachment' });
    if (code === 'invalid_reply') return res.status(400).json({ success: false, error: 'Invalid reply' });
    if (code === 'reply_unsupported') return res.status(400).json({ success: false, error: 'Reply not available — refresh the app' });
    return res.status(500).json({ success: false, error: 'Server error' });
  }

  /** GET /api/dms/conversations */
  router.get('/conversations', ...auth, (req, res) => {
    const uid = currentUserId(req);
    const sql = `
      SELECT c.id, c.user_a, c.user_b, c.updated_at, c.created_at,
             cr.last_read_at AS my_last_read,
             lm.id AS last_message_id,
             lm.content AS last_message_content,
             lm.sender_id AS last_message_sender_id,
             lm.created_at AS last_message_created_at,
             lm.attachments AS last_message_attachments,
             ou.id AS other_user_id,
             ou.username AS other_username,
             ou.display_name AS other_display_name,
             ou.avatar AS other_avatar
      FROM dm_conversations c
      JOIN users ou ON ou.id = CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END
      LEFT JOIN dm_conversation_reads cr ON cr.conversation_id = c.id AND cr.user_id = ?
      LEFT JOIN dm_messages lm ON lm.id = (
        SELECT id FROM dm_messages WHERE conversation_id = c.id ORDER BY datetime(created_at) DESC LIMIT 1
      )
      WHERE c.user_a = ? OR c.user_b = ?
      ORDER BY datetime(c.updated_at) DESC
    `;
    db.all(sql, [uid, uid, uid, uid], (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: 'Database error' });
      const conversations = (rows || []).map((r) => {
        const lastAt = r.last_message_created_at;
        const readAt = r.my_last_read;
        const unread =
          !!r.last_message_id &&
          r.last_message_sender_id !== uid &&
          (!readAt || String(lastAt || '') > String(readAt || ''));
        let lastMessage = null;
        if (r.last_message_id) {
          const att = safeJsonParse(r.last_message_attachments, { messageType: 'text', attachmentUrl: '' });
          const messageType = att.messageType === 'image' || att.messageType === 'file' ? att.messageType : 'text';
          const attachmentUrl = typeof att.attachmentUrl === 'string' ? att.attachmentUrl.trim() : '';
          const rawContent = r.last_message_content || '';
          const preview =
            attachmentUrl && messageType === 'image'
              ? (String(rawContent).trim() || '📷 Attēls')
              : attachmentUrl
                ? '📎 Fails'
                : rawContent;
          lastMessage = {
            id: r.last_message_id,
            content: r.last_message_content,
            senderId: r.last_message_sender_id,
            createdAt: toIsoUtc(r.last_message_created_at),
            messageType,
            attachmentUrl,
            preview
          };
        }
        return {
          id: r.id,
          updatedAt: toIsoUtc(r.updated_at),
          createdAt: toIsoUtc(r.created_at),
          otherUser: {
            id: r.other_user_id,
            username: r.other_username,
            displayName: r.other_display_name,
            avatar: r.other_avatar
          },
          lastMessage,
          unread
        };
      });
      res.json({ success: true, conversations });
    });
  });

  /** POST /api/dms/conversations { otherUserId } */
  router.post('/conversations', ...auth, (req, res) => {
    const uid = currentUserId(req);
    const { otherUserId } = req.body || {};
    if (!otherUserId || otherUserId === uid) {
      return res.status(400).json({ success: false, error: 'otherUserId required' });
    }
    db.get(
      `SELECT id FROM users WHERE id = ? AND deleted_at IS NULL`,
      [otherUserId],
      (e1, other) => {
        if (e1) return res.status(500).json({ success: false, error: 'Database error' });
        if (!other) return res.status(404).json({ success: false, error: 'User not found' });
        dmCore.checkBlockedPair(db, uid, otherUserId, (bErr, blocked) => {
          if (bErr) return res.status(500).json({ success: false, error: 'Database error' });
          if (blocked) return res.status(403).json({ success: false, error: 'Cannot start conversation' });
          const [userA, userB] = dmCore.normalizePair(uid, otherUserId);
          const id = crypto.randomUUID();
          db.run(
            `INSERT OR IGNORE INTO dm_conversations (id, user_a, user_b, updated_at, created_at)
             VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
            [id, userA, userB],
            function (insErr) {
              if (insErr) return res.status(500).json({ success: false, error: 'Database error' });
              db.get(
                `SELECT * FROM dm_conversations WHERE user_a = ? AND user_b = ?`,
                [userA, userB],
                (e2, row) => {
                  if (e2 || !row) return res.status(500).json({ success: false, error: 'Conversation missing' });
                  res.json({
                    success: true,
                    conversation: {
                      id: row.id,
                      userA: row.user_a,
                      userB: row.user_b,
                      updatedAt: toIsoUtc(row.updated_at),
                      createdAt: toIsoUtc(row.created_at)
                    }
                  });
                }
              );
            }
          );
        });
      }
    );
  });

  /** GET /api/dms/conversations/:conversationId/messages */
  router.get('/conversations/:conversationId/messages', ...auth, (req, res) => {
    const uid = currentUserId(req);
    const { conversationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const before = (req.query.before || '').trim();
    db.get(
      `SELECT id, user_a, user_b FROM dm_conversations WHERE id = ? AND (user_a = ? OR user_b = ?)`,
      [conversationId, uid, uid],
      (err, conv) => {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });
        if (!conv) return res.status(404).json({ success: false, error: 'Not found' });
        let sql = `${dmCore.DM_SELECT_WITH_REPLY} WHERE m.conversation_id = ?`;
        const params = [conversationId];
        if (before) {
          sql += ` AND datetime(m.created_at) < datetime((SELECT created_at FROM dm_messages WHERE id = ?))`;
          params.push(before);
        }
        sql += ` ORDER BY datetime(m.created_at) DESC LIMIT ?`;
        params.push(limit);
        db.all(sql, params, (e2, rows) => {
          if (e2) return res.status(500).json({ success: false, error: 'Database error' });
          const messages = (rows || []).reverse().map((r) => dmCore.formatDmMessageRow(r));
          res.json({ success: true, messages });
        });
      }
    );
  });

  /** POST /api/dms/conversations/:conversationId/messages */
  router.post('/conversations/:conversationId/messages', ...authCreate, (req, res) => {
    const uid = currentUserId(req);
    const { conversationId } = req.params;
    const { content, messageType, attachmentUrl, replyToMessageId } = req.body || {};
    dmCore.insertDmMessage(
      db,
      io,
      {
        conversationId,
        senderId: uid,
        content,
        messageType: messageType || 'text',
        attachmentUrl: attachmentUrl || '',
        replyToMessageId: replyToMessageId || '',
        skipNotification: !!req.body?.skipNotification
      },
      (err, payload) => {
        if (err) return mapErr(res, err);
        res.json({ success: true, message: payload });
      }
    );
  });

  /** POST /api/dms/conversations/:conversationId/read */
  router.post('/conversations/:conversationId/read', ...auth, (req, res) => {
    const uid = currentUserId(req);
    const { conversationId } = req.params;
    db.get(
      `SELECT id FROM dm_conversations WHERE id = ? AND (user_a = ? OR user_b = ?)`,
      [conversationId, uid, uid],
      (err, conv) => {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });
        if (!conv) return res.status(404).json({ success: false, error: 'Not found' });
        db.run(
          `INSERT INTO dm_conversation_reads (conversation_id, user_id, last_read_at)
           VALUES (?, ?, datetime('now'))
           ON CONFLICT(conversation_id, user_id) DO UPDATE SET last_read_at = datetime('now')`,
          [conversationId, uid],
          (e2) => {
            if (e2) return res.status(500).json({ success: false, error: 'Database error' });
            res.json({ success: true });
          }
        );
      }
    );
  });

  /** POST /api/dms/blocks { blockedId } */
  router.post('/blocks', ...auth, (req, res) => {
    const uid = currentUserId(req);
    const { blockedId } = req.body || {};
    if (!blockedId || blockedId === uid) {
      return res.status(400).json({ success: false, error: 'blockedId required' });
    }
    db.get(`SELECT id FROM users WHERE id = ? AND deleted_at IS NULL`, [blockedId], (e1, u) => {
      if (e1) return res.status(500).json({ success: false, error: 'Database error' });
      if (!u) return res.status(404).json({ success: false, error: 'User not found' });
      db.run(
        `INSERT OR IGNORE INTO user_blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, datetime('now'))`,
        [uid, blockedId],
        (e2) => {
          if (e2) return res.status(500).json({ success: false, error: 'Database error' });
          res.json({ success: true });
        }
      );
    });
  });

  /** DELETE /api/dms/blocks/:blockedId */
  router.delete('/blocks/:blockedId', ...auth, (req, res) => {
    const uid = currentUserId(req);
    const { blockedId } = req.params;
    db.run(`DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?`, [uid, blockedId], function (e) {
      if (e) return res.status(500).json({ success: false, error: 'Database error' });
      res.json({ success: true });
    });
  });

  /** POST /api/dms/messages/:messageId/report */
  router.post('/messages/:messageId/report', ...auth, (req, res) => {
    const uid = currentUserId(req);
    const { messageId } = req.params;
    const reason = req.body?.reason ? String(req.body.reason).slice(0, 500) : '';
    db.get(
      `SELECT m.id, m.conversation_id, c.user_a, c.user_b
       FROM dm_messages m
       JOIN dm_conversations c ON c.id = m.conversation_id
       WHERE m.id = ?`,
      [messageId],
      (err, row) => {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });
        if (!row) return res.status(404).json({ success: false, error: 'Message not found' });
        if (row.user_a !== uid && row.user_b !== uid) {
          return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const id = crypto.randomUUID();
        db.run(
          `INSERT INTO dm_reports (id, reporter_id, message_id, reason, status, created_at)
           VALUES (?, ?, ?, ?, 'open', datetime('now'))`,
          [id, uid, messageId, reason],
          (e2) => {
            if (e2) return res.status(500).json({ success: false, error: 'Database error' });
            res.json({ success: true, id });
          }
        );
      }
    );
  });

  return router;
};

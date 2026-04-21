const crypto = require('crypto');
const { toIsoUtc, safeJsonParse } = require('./utils');

const MAX_CONTENT = 5000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;

const dmSendBuckets = new Map();

function normalizePair(id1, id2) {
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

function isRateLimited(senderId) {
  const now = Date.now();
  let arr = dmSendBuckets.get(senderId) || [];
  arr = arr.filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) return true;
  arr.push(now);
  dmSendBuckets.set(senderId, arr);
  return false;
}

function checkBlockedPair(db, u1, u2, cb) {
  db.get(
    `SELECT 1 AS x FROM user_blocks
     WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1`,
    [u1, u2, u2, u1],
    (err, row) => cb(err, !!row)
  );
}

function parseAttachments(row) {
  const raw = row.attachments;
  const parsed = safeJsonParse(raw, { messageType: 'text', attachmentUrl: '' });
  const messageType = parsed.messageType === 'image' || parsed.messageType === 'file' ? parsed.messageType : 'text';
  let attachmentUrl = typeof parsed.attachmentUrl === 'string' ? parsed.attachmentUrl.trim() : '';
  if (attachmentUrl && !attachmentUrl.startsWith('/uploads/')) attachmentUrl = '';
  return { messageType, attachmentUrl };
}

function mapMessageRow(row) {
  const { messageType, attachmentUrl } = parseAttachments(row);
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    createdAt: toIsoUtc(row.created_at),
    username: row.username,
    displayName: row.display_name,
    avatar: row.avatar,
    messageType,
    attachmentUrl
  };
}

function notificationPreview(text, messageType, attachmentUrl) {
  if (attachmentUrl && messageType === 'image') {
    const cap = text && String(text).trim() ? String(text).trim() : 'Attēls';
    return cap.length > 80 ? `${cap.slice(0, 80)}…` : cap;
  }
  if (attachmentUrl) return '📎 Fails';
  const t = String(text || '').trim();
  return t.length > 80 ? `${t.slice(0, 80)}…` : t;
}

/**
 * Insert DM after validation; emit to both participants; optional in-app notification for recipient.
 * @param {{ skipNotification?: boolean, messageType?: string, attachmentUrl?: string }} opts
 */
function insertDmMessage(
  db,
  io,
  { conversationId, senderId, content, messageType = 'text', attachmentUrl = '', skipNotification = false },
  cb
) {
  const text = String(content || '').trim();
  const attUrl = String(attachmentUrl || '').trim();
  if (attUrl && !attUrl.startsWith('/uploads/')) return cb(new Error('invalid_attachment'));
  const mt = attUrl ? (messageType === 'file' ? 'file' : 'image') : 'text';
  const attachmentsJson = JSON.stringify({ messageType: mt, attachmentUrl: attUrl });
  if (!text && !attUrl) return cb(new Error('empty'));
  if (text.length > MAX_CONTENT) return cb(new Error('too_long'));
  if (isRateLimited(senderId)) return cb(new Error('rate_limited'));

  db.get(
    `SELECT id, user_a, user_b FROM dm_conversations WHERE id = ?`,
    [conversationId],
    (err, conv) => {
      if (err) return cb(err);
      if (!conv) return cb(new Error('not_found'));
      if (conv.user_a !== senderId && conv.user_b !== senderId) return cb(new Error('forbidden'));
      const otherId = conv.user_a === senderId ? conv.user_b : conv.user_a;

      checkBlockedPair(db, senderId, otherId, (bErr, blocked) => {
        if (bErr) return cb(bErr);
        if (blocked) return cb(new Error('blocked'));

        const id = crypto.randomUUID();
        const contentStored = text || '';
        db.run(
          `INSERT INTO dm_messages (id, conversation_id, sender_id, content, attachments, created_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`,
          [id, conversationId, senderId, contentStored, attachmentsJson],
          (insErr) => {
            if (insErr) return cb(insErr);
            db.run(
              `UPDATE dm_conversations SET updated_at = datetime('now') WHERE id = ?`,
              [conversationId],
              () => {
                db.get(
                  `SELECT m.*, u.username, u.display_name, u.avatar
                   FROM dm_messages m
                   JOIN users u ON u.id = m.sender_id
                   WHERE m.id = ?`,
                  [id],
                  (fErr, row) => {
                    if (fErr || !row) return cb(fErr || new Error('fetch_failed'));
                    const payload = mapMessageRow(row);
                    if (io) {
                      io.to(`user:${senderId}`).emit('dm_message', payload);
                      io.to(`user:${otherId}`).emit('dm_message', payload);
                    }
                    const done = () => cb(null, payload);
                    if (skipNotification || !io) return done();
                    db.get(
                      `SELECT display_name, username FROM users WHERE id = ?`,
                      [senderId],
                      (uErr, urow) => {
                        const name = urow?.display_name || urow?.username || 'Someone';
                        const preview = notificationPreview(text, mt, attUrl);
                        const notificationId = crypto.randomUUID();
                        const type = 'dm';
                        const title = type;
                        const message = `${name}: ${preview}`;
                        const dataJson = JSON.stringify({ relatedId: conversationId, fromUserId: senderId });
                        db.run(
                          `INSERT INTO notifications (id, user_id, type, title, message, read, data, created_at)
                           VALUES (?, ?, ?, ?, ?, 0, ?, datetime('now'))`,
                          [notificationId, otherId, type, title, message, dataJson],
                          (nErr) => {
                            if (!nErr) {
                              io.to(`user:${otherId}`).emit('new_notification', {
                                id: notificationId,
                                userId: otherId,
                                type,
                                title,
                                message,
                                read: false,
                                createdAt: new Date().toISOString(),
                                relatedId: conversationId
                              });
                            }
                            done();
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    }
  );
}

module.exports = {
  normalizePair,
  checkBlockedPair,
  insertDmMessage,
  parseAttachments,
  dmSendBuckets,
  MAX_CONTENT
};

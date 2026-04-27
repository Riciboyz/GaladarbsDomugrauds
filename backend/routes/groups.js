const { Router } = require('express');
const crypto = require('crypto');
const { authenticateToken, optionalAuth, currentUserId } = require('../middleware/auth');
const { safeJsonParse, getMembersArray, toIsoUtc } = require('../helpers/utils');
const {
  INPUT_LIMITS,
  validateRequiredTrimmed,
  validateOptionalTrimmed,
} = require('../helpers/inputValidation');

module.exports = function (db, io) {
  const router = Router();
  const groupRoomName = (groupId) => `group:${groupId}`;

  function rowVisibility(row) {
    return row.visibility && String(row.visibility).toLowerCase() === 'private' ? 'private' : 'public';
  }

  function canSeeGroup(row, viewerId) {
    if (rowVisibility(row) !== 'private') return true;
    if (!viewerId) return false;
    return getMembersArray(row.members).includes(viewerId);
  }

  function isGroupMember(row, viewerId) {
    return !!(viewerId && getMembersArray(row.members).includes(viewerId));
  }

  function normalizeVisibility(v) {
    return v && String(v).toLowerCase() === 'private' ? 'private' : 'public';
  }

  function mapGroupRow(row, viewerId) {
    const members = getMembersArray(row.members);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      avatar: row.avatar,
      members,
      admins: members.length ? [row.created_by] : [],
      createdBy: row.created_by,
      memberCount: members.length,
      isMember: viewerId ? members.includes(viewerId) : false,
      visibility: rowVisibility(row),
      createdAt: toIsoUtc(row.created_at),
      threads: []
    };
  }

  function mapGroupPostRow(row) {
    const att = safeJsonParse(row.attachments, {});
    return {
      id: row.id,
      group_id: row.group_id,
      sender_id: row.author_id,
      content: row.content,
      message_type: att.messageType || 'text',
      attachment_url: att.attachmentUrl || att.url || '',
      created_at: toIsoUtc(row.created_at),
      username: row.username,
      display_name: row.display_name,
      avatar: row.avatar
    };
  }

  // ---- CRUD ----
  router.get('/', optionalAuth, (req, res) => {
    const viewerId = currentUserId(req);
    db.all('SELECT * FROM groups ORDER BY created_at DESC', (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      const filtered = (rows || []).filter((r) => canSeeGroup(r, viewerId));
      res.json({ success: true, groups: filtered.map((r) => mapGroupRow(r, viewerId)) });
    });
  });

  function filterMutualUserIds(dbConn, creatorId, requestedIds, cb) {
    const uniq = [...new Set((requestedIds || []).filter(Boolean))];
    if (!uniq.length) return cb(null, []);
    const ph = uniq.map(() => '?').join(',');
    const sql = `
      SELECT u.id FROM users u
      INNER JOIN followers f1 ON f1.follower_id = ? AND f1.following_id = u.id
      INNER JOIN followers f2 ON f2.follower_id = u.id AND f2.following_id = ?
      WHERE u.deleted_at IS NULL AND u.id IN (${ph})
    `;
    dbConn.all(sql, [creatorId, creatorId, ...uniq], (err, rows) => {
      if (err) return cb(err);
      cb(null, (rows || []).map((r) => r.id));
    });
  }

  function finalizeNewGroup(groupId, userId, res) {
    db.get('SELECT * FROM groups WHERE id = ?', [groupId], (e, row) => {
      if (e || !row) return res.status(500).json({ error: 'Database error' });
      const group = mapGroupRow(row, userId);
      if (io) io.emit('group_created', { group });
      res.json({ success: true, group });
    });
  }

  function applyInitialPrivateMembers(groupId, creatorId, requestedIds, res) {
    filterMutualUserIds(db, creatorId, requestedIds, (ferr, validIds) => {
      if (ferr) return res.status(500).json({ error: 'Database error' });
      const invalid = requestedIds.filter((id) => !validIds.includes(id));
      if (invalid.length) {
        return res.status(400).json({
          error: 'Var pievienot tikai lietotājus, ar kuriem ir savstarpēja sekošana',
          invalidUserIds: invalid
        });
      }
      if (!validIds.length) return finalizeNewGroup(groupId, creatorId, res);
      db.get('SELECT * FROM groups WHERE id = ?', [groupId], (gerr, row) => {
        if (gerr || !row) return res.status(500).json({ error: 'Database error' });
        const members = getMembersArray(row.members);
        validIds.forEach((id) => {
          if (id && !members.includes(id)) members.push(id);
        });
        db.run(
          'UPDATE groups SET members = ?, updated_at = datetime("now") WHERE id = ?',
          [JSON.stringify(members), groupId],
          (uErr) => {
            if (uErr) return res.status(500).json({ error: 'Database error' });
            finalizeNewGroup(groupId, creatorId, res);
          }
        );
      });
    });
  }

  router.post('/', authenticateToken, (req, res) => {
    const rawAdd = req.body?.addUserIds;
    const addUserIds = Array.isArray(rawAdd) ? rawAdd.filter(Boolean) : [];
    const { name, description } = req.body || {};
    const userId = currentUserId(req);
    const validName = validateRequiredTrimmed(name, {
      field: 'Group name',
      maxLength: INPUT_LIMITS.GROUP_NAME,
    });
    if (!validName.ok) return res.status(400).json({ error: validName.error });
    const validDesc = validateOptionalTrimmed(description, {
      maxLength: INPUT_LIMITS.GROUP_DESCRIPTION,
    });
    if (!validDesc.ok) return res.status(400).json({ error: 'Description too long' });
    const visibility = normalizeVisibility(req.body?.visibility);
    const groupId = crypto.randomUUID();
    const members = JSON.stringify([userId]);
    db.run(
      `INSERT INTO groups (id, name, description, avatar, created_by, members, visibility, created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, ?, ?, datetime('now'), datetime('now'))`,
      [groupId, validName.value, validDesc.value || '', userId, members, visibility],
      function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (visibility === 'private' && addUserIds.length) {
          return applyInitialPrivateMembers(groupId, userId, addUserIds, res);
        }
        finalizeNewGroup(groupId, userId, res);
      }
    );
  });

  router.put('/', authenticateToken, (req, res) => {
    const { groupId, name, description, avatar, visibility } = req.body || {};
    if (!groupId) return res.status(400).json({ error: 'groupId required' });
    const uid = currentUserId(req);
    db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Group not found' });
      const members = getMembersArray(row.members);
      if (row.created_by !== uid && !members.includes(uid)) return res.status(403).json({ error: 'Forbidden' });
      const updates = [];
      const vals = [];
      if (name !== undefined) {
        const validName = validateRequiredTrimmed(name, {
          field: 'Group name',
          maxLength: INPUT_LIMITS.GROUP_NAME,
        });
        if (!validName.ok) return res.status(400).json({ error: validName.error });
        updates.push('name = ?');
        vals.push(validName.value);
      }
      if (description !== undefined) {
        const validDesc = validateOptionalTrimmed(description, {
          maxLength: INPUT_LIMITS.GROUP_DESCRIPTION,
        });
        if (!validDesc.ok) return res.status(400).json({ error: 'Description too long' });
        updates.push('description = ?');
        vals.push(validDesc.value);
      }
      if (avatar !== undefined) { updates.push('avatar = ?'); vals.push(avatar); }
      if (visibility !== undefined) {
        if (row.created_by !== uid) return res.status(403).json({ error: 'Only the creator can change visibility' });
        updates.push('visibility = ?');
        vals.push(normalizeVisibility(visibility));
      }
      if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
      vals.push(groupId);
      db.run(`UPDATE groups SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`, vals, (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        db.get('SELECT * FROM groups WHERE id = ?', [groupId], (e2, r) => {
          const group = mapGroupRow(r, uid);
          if (io) {
            const updateFields = {};
            if (name !== undefined) updateFields.name = name;
            if (description !== undefined) updateFields.description = description;
            if (avatar !== undefined) updateFields.avatar = avatar;
            if (visibility !== undefined) updateFields.visibility = normalizeVisibility(visibility);
            io.emit('group_updated', { groupId, updates: updateFields, group });
          }
          res.json({ success: true, group });
        });
      });
    });
  });

  router.delete('/', authenticateToken, (req, res) => {
    const groupId = req.query.groupId;
    if (!groupId) return res.status(400).json({ error: 'groupId required' });
    const uid = currentUserId(req);
    db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Group not found' });
      if (row.created_by !== uid) return res.status(403).json({ error: 'Only creator can delete' });
      db.run('DELETE FROM groups WHERE id = ?', [groupId], (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        if (io) io.emit('group_deleted', { groupId });
        res.json({ success: true });
      });
    });
  });

  // ---- Join / Leave ----
  function joinGroup(groupId, uid, res) {
    if (!groupId) return res.status(400).json({ error: 'groupId required' });
    db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Group not found' });
      if (rowVisibility(row) === 'private') {
        return res.status(403).json({ error: 'Private group — ask a member to add you' });
      }
      const members = getMembersArray(row.members);
      if (members.includes(uid)) return res.status(400).json({ error: 'Already a member' });
      members.push(uid);
      db.run('UPDATE groups SET members = ?, updated_at = datetime("now") WHERE id = ?', [JSON.stringify(members), groupId], (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        if (io) io.emit('group_member_joined', { groupId, userId: uid, members });
        res.json({ success: true, message: 'Joined group successfully' });
      });
    });
  }

  function leaveGroup(groupId, uid, res) {
    if (!groupId) return res.status(400).json({ error: 'groupId required' });
    db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Group not found' });
      const members = getMembersArray(row.members).filter((id) => id !== uid);
      db.run('UPDATE groups SET members = ?, updated_at = datetime("now") WHERE id = ?', [JSON.stringify(members), groupId], (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        if (io) io.emit('group_member_left', { groupId, userId: uid, members });
        res.json({ success: true, message: 'Left group successfully' });
      });
    });
  }

  router.post('/join', authenticateToken, (req, res) => {
    joinGroup(req.body?.groupId || req.body?.group_id, currentUserId(req), res);
  });

  router.delete('/join', authenticateToken, (req, res) => {
    leaveGroup(req.query.groupId, currentUserId(req), res);
  });

  router.post('/:id/join', authenticateToken, (req, res) => {
    joinGroup(req.params.id, currentUserId(req), res);
  });

  router.post('/:id/leave', authenticateToken, (req, res) => {
    leaveGroup(req.params.id, currentUserId(req), res);
  });

  // ---- Members ----
  router.get('/members', optionalAuth, (req, res) => {
    const groupId = req.query.groupId;
    const viewerId = currentUserId(req);
    if (!groupId) return res.status(400).json({ error: 'groupId required' });
    db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Group not found' });
      if (rowVisibility(row) === 'private' && !isGroupMember(row, viewerId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const ids = getMembersArray(row.members);
      if (!ids.length) return res.json({ success: true, members: [] });
      const placeholders = ids.map(() => '?').join(',');
      db.all(
        `SELECT id, username, display_name, avatar FROM users WHERE deleted_at IS NULL AND id IN (${placeholders})`,
        ids,
        (e, users) => {
          if (e) return res.status(500).json({ error: 'Database error' });
          res.json({ success: true, members: users || [] });
        }
      );
    });
  });

  router.post('/members', authenticateToken, (req, res) => {
    const uid = currentUserId(req);
    const { groupId, userId: newMemberId } = req.body || {};
    if (!groupId || !newMemberId) return res.status(400).json({ error: 'groupId and userId required' });
    db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Group not found' });
      const members = getMembersArray(row.members);
      if (!members.includes(uid) && row.created_by !== uid) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const pushMember = () => {
        if (!members.includes(newMemberId)) members.push(newMemberId);
        db.run('UPDATE groups SET members = ?, updated_at = datetime("now") WHERE id = ?', [JSON.stringify(members), groupId], (e) => {
          if (e) return res.status(500).json({ error: 'Database error' });
          if (io) io.emit('group_member_joined', { groupId, userId: newMemberId, members });
          res.json({ success: true });
        });
      };
      if (rowVisibility(row) === 'private') {
        db.get(
          'SELECT 1 AS ok FROM followers WHERE follower_id = ? AND following_id = ?',
          [uid, newMemberId],
          (e1, r1) => {
            if (e1) return res.status(500).json({ error: 'Database error' });
            db.get(
              'SELECT 1 AS ok FROM followers WHERE follower_id = ? AND following_id = ?',
              [newMemberId, uid],
              (e2, r2) => {
                if (e2) return res.status(500).json({ error: 'Database error' });
                if (!r1 || !r2) {
                  return res.status(403).json({ error: 'Privātā grupā var pievienot tikai savstarpējos sekotājus' });
                }
                pushMember();
              }
            );
          }
        );
      } else {
        pushMember();
      }
    });
  });

  router.delete('/members', authenticateToken, (req, res) => {
    const uid = currentUserId(req);
    const { groupId, userId: removeId } = req.query;
    if (!groupId || !removeId) return res.status(400).json({ error: 'groupId and userId required' });
    db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Group not found' });
      if (removeId !== uid && row.created_by !== uid) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const members = getMembersArray(row.members).filter((id) => id !== removeId);
      db.run('UPDATE groups SET members = ?, updated_at = datetime("now") WHERE id = ?', [JSON.stringify(members), groupId], (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        if (io) io.emit('group_member_left', { groupId, userId: removeId, members });
        res.json({ success: true });
      });
    });
  });

  // ---- Chat ----
  router.get('/chat', optionalAuth, (req, res) => {
    const groupId = req.query.groupId;
    const viewerId = currentUserId(req);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    if (!groupId) return res.status(400).json({ error: 'groupId required' });
    db.get('SELECT * FROM groups WHERE id = ?', [groupId], (gErr, grow) => {
      if (gErr || !grow) return res.status(404).json({ error: 'Group not found' });
      if (rowVisibility(grow) === 'private' && !isGroupMember(grow, viewerId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    db.all(
      `SELECT gp.*, u.username, u.display_name, u.avatar
       FROM group_posts gp JOIN users u ON gp.author_id = u.id
       WHERE gp.group_id = ? ORDER BY gp.created_at DESC LIMIT ?`,
      [groupId, limit],
      (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });
        res.json({ success: true, messages: (rows || []).map(mapGroupPostRow) });
      }
    );
    });
  });

  router.post('/chat', authenticateToken, (req, res) => {
    const { groupId, content, messageType, attachmentUrl } = req.body || {};
    const uid = currentUserId(req);
    const validContent = validateRequiredTrimmed(content, {
      field: 'Content',
      maxLength: INPUT_LIMITS.THREAD_CONTENT,
    });
    if (!groupId || !validContent.ok) {
      return res.status(400).json({ error: groupId ? validContent.error : 'groupId and content required' });
    }
    db.get('SELECT * FROM groups WHERE id = ?', [groupId], (chkErr, grow) => {
      if (chkErr || !grow) return res.status(404).json({ error: 'Group not found' });
      if (!isGroupMember(grow, uid)) {
        return res.status(403).json({ error: 'Only group members can post' });
      }
      const id = crypto.randomUUID();
      const attachments = JSON.stringify({ messageType: messageType || 'text', attachmentUrl: attachmentUrl || '' });
      db.run(
        `INSERT INTO group_posts (id, group_id, author_id, content, attachments, likes, dislikes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, '[]', '[]', datetime('now'), datetime('now'))`,
        [id, groupId, uid, validContent.value, attachments],
        (err) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          db.get(
            `SELECT gp.*, u.username, u.display_name, u.avatar
             FROM group_posts gp
             JOIN users u ON gp.author_id = u.id
             WHERE gp.id = ?`,
            [id],
            (fetchErr, row) => {
              if (fetchErr || !row) return res.status(500).json({ error: 'Database error' });
              const message = mapGroupPostRow(row);
              if (io) {
                io.to(groupRoomName(groupId)).emit('group_message', message);
              }
              res.json({ success: true, messageId: id, message });
            }
          );
        }
      );
    });
  });

  return router;
};

const { Router } = require('express');
const crypto = require('crypto');
const { optionalAuth, currentUserId } = require('../middleware/auth');
const { safeJsonParse, getMembersArray } = require('../helpers/utils');

module.exports = function (db) {
  const router = Router();

  function mapGroupRow(row, viewerId) {
    const members = getMembersArray(row.members);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      avatar: row.avatar,
      members,
      admins: members.length ? [row.created_by] : [],
      isPrivate: row.visibility === 'private',
      createdBy: row.created_by,
      memberCount: members.length,
      isMember: viewerId ? members.includes(viewerId) : false,
      createdAt: row.created_at,
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
      created_at: row.created_at,
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
      res.json({ success: true, groups: (rows || []).map((r) => mapGroupRow(r, viewerId)) });
    });
  });

  router.post('/', optionalAuth, (req, res) => {
    const { name, description, isPrivate, is_private } = req.body || {};
    const userId = currentUserId(req);
    if (!name) return res.status(400).json({ error: 'Group name is required' });
    const visibility = isPrivate === true || is_private === true ? 'private' : 'public';
    const groupId = crypto.randomUUID();
    const members = JSON.stringify([userId]);
    db.run(
      `INSERT INTO groups (id, name, description, avatar, created_by, members, visibility, created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, ?, ?, datetime('now'), datetime('now'))`,
      [groupId, name, description || '', userId, members, visibility],
      function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        db.get('SELECT * FROM groups WHERE id = ?', [groupId], (e, row) => {
          if (e || !row) return res.status(500).json({ error: 'Database error' });
          res.json({ success: true, group: mapGroupRow(row, userId) });
        });
      }
    );
  });

  router.put('/', optionalAuth, (req, res) => {
    const { groupId, name, description, avatar } = req.body || {};
    if (!groupId) return res.status(400).json({ error: 'groupId required' });
    const uid = currentUserId(req);
    db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Group not found' });
      const members = getMembersArray(row.members);
      if (row.created_by !== uid && !members.includes(uid)) return res.status(403).json({ error: 'Forbidden' });
      const updates = [];
      const vals = [];
      if (name !== undefined) { updates.push('name = ?'); vals.push(name); }
      if (description !== undefined) { updates.push('description = ?'); vals.push(description); }
      if (avatar !== undefined) { updates.push('avatar = ?'); vals.push(avatar); }
      if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
      vals.push(groupId);
      db.run(`UPDATE groups SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`, vals, (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        db.get('SELECT * FROM groups WHERE id = ?', [groupId], (e2, r) => {
          res.json({ success: true, group: mapGroupRow(r, uid) });
        });
      });
    });
  });

  router.delete('/', optionalAuth, (req, res) => {
    const groupId = req.query.groupId;
    if (!groupId) return res.status(400).json({ error: 'groupId required' });
    const uid = currentUserId(req);
    db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Group not found' });
      if (row.created_by !== uid) return res.status(403).json({ error: 'Only creator can delete' });
      db.run('DELETE FROM groups WHERE id = ?', [groupId], (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
      });
    });
  });

  // ---- Join / Leave ----
  function joinGroup(groupId, uid, res) {
    db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Group not found' });
      const members = getMembersArray(row.members);
      if (members.includes(uid)) return res.status(400).json({ error: 'Already a member' });
      members.push(uid);
      db.run('UPDATE groups SET members = ?, updated_at = datetime("now") WHERE id = ?', [JSON.stringify(members), groupId], (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, message: 'Joined group successfully' });
      });
    });
  }

  function leaveGroup(groupId, uid, res) {
    db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Group not found' });
      const members = getMembersArray(row.members).filter((id) => id !== uid);
      db.run('UPDATE groups SET members = ?, updated_at = datetime("now") WHERE id = ?', [JSON.stringify(members), groupId], (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, message: 'Left group successfully' });
      });
    });
  }

  router.post('/join', optionalAuth, (req, res) => {
    joinGroup(req.body?.groupId || req.body?.group_id, currentUserId(req), res);
  });

  router.delete('/join', optionalAuth, (req, res) => {
    leaveGroup(req.query.groupId, currentUserId(req), res);
  });

  router.post('/:id/join', optionalAuth, (req, res) => {
    joinGroup(req.params.id, currentUserId(req), res);
  });

  router.post('/:id/leave', optionalAuth, (req, res) => {
    leaveGroup(req.params.id, currentUserId(req), res);
  });

  // ---- Invitations ----
  router.get('/invite', optionalAuth, (req, res) => {
    const uid = req.query.userId || currentUserId(req);
    db.all(
      `SELECT gi.*, g.name as group_name FROM group_invites gi
       JOIN groups g ON gi.group_id = g.id
       WHERE gi.invited_user = ? AND gi.status = 'pending' AND gi.expires_at > datetime('now')
       ORDER BY gi.created_at DESC`,
      [uid],
      (err, rows) => {
        if (err) return res.json({ success: true, invitations: [] });
        res.json({
          success: true,
          invitations: (rows || []).map((r) => ({
            id: r.id, groupId: r.group_id, groupName: r.group_name,
            invitedBy: r.invited_by, status: r.status, expiresAt: r.expires_at
          }))
        });
      }
    );
  });

  router.post('/invite', optionalAuth, (req, res) => {
    const { groupId, inviterId, inviteeId } = req.body || {};
    const uid = currentUserId(req);
    if (!groupId || !inviteeId) return res.status(400).json({ error: 'groupId and inviteeId required' });
    const inviteId = crypto.randomUUID();
    const expires = new Date(Date.now() + 7 * 864e5).toISOString();
    db.run(
      `INSERT INTO group_invites (id, group_id, invited_by, invited_user, status, expires_at, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?, datetime('now'))`,
      [inviteId, groupId, inviterId || uid, inviteeId, expires.replace('T', ' ').slice(0, 19)],
      (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, invitation: { id: inviteId } });
      }
    );
  });

  // ---- Members ----
  router.get('/members', (req, res) => {
    const groupId = req.query.groupId;
    if (!groupId) return res.status(400).json({ error: 'groupId required' });
    db.get('SELECT members FROM groups WHERE id = ?', [groupId], (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Group not found' });
      const ids = getMembersArray(row.members);
      if (!ids.length) return res.json({ success: true, members: [] });
      const placeholders = ids.map(() => '?').join(',');
      db.all(`SELECT id, username, display_name, avatar FROM users WHERE id IN (${placeholders})`, ids, (e, users) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, members: users || [] });
      });
    });
  });

  router.post('/members', optionalAuth, (req, res) => {
    const { groupId, userId: newMemberId } = req.body || {};
    if (!groupId || !newMemberId) return res.status(400).json({ error: 'groupId and userId required' });
    db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Group not found' });
      const members = getMembersArray(row.members);
      if (!members.includes(newMemberId)) members.push(newMemberId);
      db.run('UPDATE groups SET members = ?, updated_at = datetime("now") WHERE id = ?', [JSON.stringify(members), groupId], (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
      });
    });
  });

  router.delete('/members', optionalAuth, (req, res) => {
    const { groupId, userId: removeId } = req.query;
    if (!groupId || !removeId) return res.status(400).json({ error: 'groupId and userId required' });
    db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Group not found' });
      const members = getMembersArray(row.members).filter((id) => id !== removeId);
      db.run('UPDATE groups SET members = ?, updated_at = datetime("now") WHERE id = ?', [JSON.stringify(members), groupId], (e) => {
        if (e) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
      });
    });
  });

  // ---- Chat ----
  router.get('/chat', optionalAuth, (req, res) => {
    const groupId = req.query.groupId;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    if (!groupId) return res.status(400).json({ error: 'groupId required' });
    db.all(
      `SELECT gp.*, u.username, u.display_name, u.avatar
       FROM group_posts gp JOIN users u ON gp.author_id = u.id
       WHERE gp.group_id = ? ORDER BY gp.created_at DESC LIMIT ?`,
      [groupId, limit],
      (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, messages: (rows || []).map(mapGroupPostRow) });
      }
    );
  });

  router.post('/chat', optionalAuth, (req, res) => {
    const { groupId, content, messageType, attachmentUrl } = req.body || {};
    const uid = currentUserId(req);
    if (!groupId || !content) return res.status(400).json({ error: 'groupId and content required' });
    const id = crypto.randomUUID();
    const attachments = JSON.stringify({ messageType: messageType || 'text', attachmentUrl: attachmentUrl || '' });
    db.run(
      `INSERT INTO group_posts (id, group_id, author_id, content, attachments, likes, dislikes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '[]', '[]', datetime('now'), datetime('now'))`,
      [id, groupId, uid, content, attachments],
      (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, messageId: id });
      }
    );
  });

  return router;
};

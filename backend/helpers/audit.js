const crypto = require('crypto');

function logAudit(db, { actorId, action, entityType, entityId, metadata }, cb) {
  const id = crypto.randomUUID();
  let meta = '{}';
  try {
    meta = metadata != null ? JSON.stringify(metadata) : '{}';
  } catch {
    meta = '{}';
  }
  db.run(
    `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    [id, actorId, action, entityType, entityId || null, meta],
    (err) => {
      if (cb) cb(err);
    }
  );
}

function touchLastActive(db, userId, cb) {
  if (!userId) {
    if (cb) cb(null);
    return;
  }
  db.run('UPDATE users SET last_active_at = datetime("now") WHERE id = ?', [userId], (err) => {
    if (cb) cb(err);
  });
}

module.exports = { logAudit, touchLastActive };

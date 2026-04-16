const jwt = require('jsonwebtoken');
const { touchLastActive } = require('../helpers/audit');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-this';
const DEMO_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function getTokenFromRequest(req) {
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  const cookieToken = req.cookies ? req.cookies['auth-token'] : undefined;
  return headerToken || cookieToken;
}

function isBanned(row) {
  if (!row || !row.banned_until) return false;
  return String(row.banned_until) > new Date().toISOString();
}

function isMuted(row) {
  if (!row || !row.muted_until) return false;
  return String(row.muted_until) > new Date().toISOString();
}

function authenticateToken(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

function optionalAuth(req, _res, next) {
  const token = getTokenFromRequest(req);
  if (!token) {
    req.user = { id: DEMO_USER_ID };
    return next();
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    req.user = err ? { id: DEMO_USER_ID } : user;
    next();
  });
}

function currentUserId(req) {
  return req.user?.id || DEMO_USER_ID;
}

/** Loads full user row; rejects deleted/banned. Sets req.authUser. */
function loadAuthUser(db) {
  return (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Access token required' });
    db.get(
      `SELECT id, username, email, display_name, avatar, bio, role, following, followers, created_at,
              deleted_at, banned_until, muted_until
       FROM users WHERE id = ?`,
      [userId],
      (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(401).json({ error: 'User not found' });
        if (row.deleted_at) return res.status(403).json({ error: 'Account deleted' });
        if (isBanned(row)) return res.status(403).json({ error: 'Account suspended' });
        req.authUser = row;
        next();
      }
    );
  };
}

function requireRole(db, ...roles) {
  return (req, res, next) => {
    authenticateToken(req, res, () => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Access token required' });
      db.get(
        `SELECT id, username, email, display_name, avatar, bio, role, following, followers, created_at,
                deleted_at, banned_until, muted_until
         FROM users WHERE id = ?`,
        [userId],
        (err, row) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          if (!row) return res.status(401).json({ error: 'User not found' });
          if (row.deleted_at) return res.status(403).json({ error: 'Account deleted' });
          if (isBanned(row)) return res.status(403).json({ error: 'Account suspended' });
          const r = row.role || 'user';
          if (!roles.includes(r)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }
          req.authUser = row;
          next();
        }
      );
    });
  };
}

function requireAdmin(db) {
  return requireRole(db, 'admin');
}

function requireModOrAdmin(db) {
  return requireRole(db, 'mod', 'admin');
}

/** After optionalAuth: block real users who are deleted/banned/muted from creating content. */
function assertUserCanCreateContent(db) {
  return (req, res, next) => {
    const userId = currentUserId(req);
    if (!userId || userId === DEMO_USER_ID) return next();
    db.get(
      'SELECT deleted_at, banned_until, muted_until FROM users WHERE id = ?',
      [userId],
      (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(403).json({ error: 'User not found' });
        if (row.deleted_at) return res.status(403).json({ error: 'Account deleted' });
        if (isBanned(row)) return res.status(403).json({ error: 'Account suspended' });
        if (isMuted(row)) return res.status(403).json({ error: 'Muted — cannot post' });
        next();
      }
    );
  };
}

module.exports = {
  authenticateToken,
  optionalAuth,
  currentUserId,
  requireAdmin,
  requireRole,
  requireModOrAdmin,
  loadAuthUser,
  assertUserCanCreateContent,
  JWT_SECRET,
  DEMO_USER_ID,
  getTokenFromRequest,
  isBanned,
  isMuted,
  touchLastActive,
};

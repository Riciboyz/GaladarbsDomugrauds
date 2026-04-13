const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-this';
const DEMO_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
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
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
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

module.exports = { authenticateToken, optionalAuth, currentUserId, JWT_SECRET, DEMO_USER_ID };

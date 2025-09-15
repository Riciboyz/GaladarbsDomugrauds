const db = require('../../../database/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// User authentication functions
const createUser = async (userData) => {
  const { username, displayName, email, password, avatar, bio } = userData;
  
  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    
    const existingUsername = await getUserByUsername(username);
    if (existingUsername) {
      throw new Error('Username already taken');
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();
    
    // Create user
    const result = await db.query(`
      INSERT INTO users (id, username, display_name, email, password_hash, avatar, bio)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [userId, username, displayName, email, passwordHash, avatar || null, bio || null]);
    
    // Return user without password
    const newUser = await getUserById(userId);
    return newUser;
    
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

const getUserByEmail = async (email) => {
  try {
    const result = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
};

const getUserByUsername = async (username) => {
  try {
    const result = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by username:', error);
    throw error;
  }
};

const getUserById = async (id) => {
  try {
    const result = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
};

const getAllUsers = async () => {
  try {
    const result = await db.query(`
      SELECT 
        id, username, display_name, email, avatar, bio, 
        created_at, following, followers
      FROM users
      ORDER BY created_at DESC
    `);
    return result.rows;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
};

const updateUser = async (id, updateData) => {
  try {
    const { username, displayName, email, avatar, bio, following, followers } = updateData;
    
    // Check if username is taken by another user
    if (username) {
      const existingUser = await getUserByUsername(username);
      if (existingUser && existingUser.id !== id) {
        throw new Error('Username already taken');
      }
    }
    
    // Check if email is taken by another user
    if (email) {
      const existingUser = await getUserByEmail(email);
      if (existingUser && existingUser.id !== id) {
        throw new Error('Email already taken');
      }
    }
    
    await db.query(`
      UPDATE users 
      SET username = COALESCE(?, username),
          display_name = COALESCE(?, display_name),
          email = COALESCE(?, email),
          avatar = COALESCE(?, avatar),
          bio = COALESCE(?, bio),
          following = COALESCE(?, following),
          followers = COALESCE(?, followers),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [username, displayName, email, avatar, bio, following, followers, id]);
    
    return await getUserById(id);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

const deleteUser = async (id) => {
  try {
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    await db.query('DELETE FROM user_sessions WHERE user_id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

const verifyUserPassword = async (email, password) => {
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return null;
    }
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    return isValid ? user : null;
  } catch (error) {
    console.error('Error verifying password:', error);
    throw error;
  }
};

// JWT token functions
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Session management
const createSession = async (userId, token, ipAddress, userAgent) => {
  try {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    await db.query(`
      INSERT INTO user_sessions (id, user_id, session_token, expires_at)
      VALUES (?, ?, ?, ?)
    `, [sessionId, userId, token, expiresAt.toISOString()]);
    
    return sessionId;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

const getSession = async (token) => {
  try {
    const result = await db.get(`
      SELECT s.*, u.id as user_id, u.username, u.display_name, u.email, u.avatar, u.bio
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ? AND s.expires_at > datetime('now')
    `, [token]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting session:', error);
    throw error;
  }
};

const deleteSession = async (token) => {
  try {
    await db.query('DELETE FROM user_sessions WHERE session_token = ?', [token]);
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
};

const deleteAllUserSessions = async (userId) => {
  try {
    await db.query('DELETE FROM user_sessions WHERE user_id = ?', [userId]);
    return true;
  } catch (error) {
    console.error('Error deleting user sessions:', error);
    throw error;
  }
};

module.exports = {
  createUser,
  getUserByEmail,
  getUserByUsername,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
  verifyUserPassword,
  generateToken,
  verifyToken,
  createSession,
  getSession,
  deleteSession,
  deleteAllUserSessions
};

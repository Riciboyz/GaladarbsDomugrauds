const { executeQuery, generateId, hashPassword, verifyPassword } = require('../../../database/mysql-config');
const jwt = require('jsonwebtoken');

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
    const passwordHash = await hashPassword(password);
    const userId = generateId();
    
    // Create user
    const query = `
      INSERT INTO users (id, username, display_name, email, password_hash, avatar, bio)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await executeQuery(query, [userId, username, displayName, email, passwordHash, avatar || null, bio || null]);
    
    // Create default user settings
    await createUserSettings(userId);
    
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
    const query = 'SELECT * FROM users WHERE email = ? AND is_active = TRUE';
    const users = await executeQuery(query, [email]);
    return users[0] || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
};

const getUserByUsername = async (username) => {
  try {
    const query = 'SELECT * FROM users WHERE username = ? AND is_active = TRUE';
    const users = await executeQuery(query, [username]);
    return users[0] || null;
  } catch (error) {
    console.error('Error getting user by username:', error);
    throw error;
  }
};

const getUserById = async (id) => {
  try {
    const query = 'SELECT * FROM users WHERE id = ? AND is_active = TRUE';
    const users = await executeQuery(query, [id]);
    return users[0] || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
};

const getAllUsers = async () => {
  try {
    const query = `
      SELECT 
        u.id, u.username, u.display_name, u.email, u.avatar, u.bio, 
        u.created_at, u.is_verified,
        us.followers_count, us.following_count, us.threads_count
      FROM users u
      LEFT JOIN user_stats us ON u.id = us.id
      WHERE u.is_active = TRUE
      ORDER BY u.created_at DESC
    `;
    const users = await executeQuery(query);
    return users;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
};

const updateUser = async (id, updateData) => {
  try {
    const { username, displayName, email, avatar, bio } = updateData;
    
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
    
    const query = `
      UPDATE users 
      SET username = COALESCE(?, username),
          display_name = COALESCE(?, display_name),
          email = COALESCE(?, email),
          avatar = COALESCE(?, avatar),
          bio = COALESCE(?, bio),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND is_active = TRUE
    `;
    
    await executeQuery(query, [username, displayName, email, avatar, bio, id]);
    
    return await getUserById(id);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

const deleteUser = async (id) => {
  try {
    // Soft delete user
    const query = 'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await executeQuery(query, [id]);
    
    // Delete user sessions
    await executeQuery('DELETE FROM user_sessions WHERE user_id = ?', [id]);
    
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
    
    const isValid = await verifyPassword(password, user.password_hash);
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
    const sessionId = generateId();
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const query = `
      INSERT INTO user_sessions (id, user_id, token_hash, expires_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await executeQuery(query, [sessionId, userId, tokenHash, expiresAt, ipAddress, userAgent]);
    return sessionId;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

const getSession = async (token) => {
  try {
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
    const query = `
      SELECT s.*, u.id, u.username, u.display_name, u.email, u.avatar, u.bio, u.is_verified
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token_hash = ? AND s.is_active = TRUE AND s.expires_at > NOW() AND u.is_active = TRUE
    `;
    
    const sessions = await executeQuery(query, [tokenHash]);
    return sessions[0] || null;
  } catch (error) {
    console.error('Error getting session:', error);
    throw error;
  }
};

const deleteSession = async (token) => {
  try {
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
    const query = 'UPDATE user_sessions SET is_active = FALSE WHERE token_hash = ?';
    await executeQuery(query, [tokenHash]);
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
};

const deleteAllUserSessions = async (userId) => {
  try {
    const query = 'UPDATE user_sessions SET is_active = FALSE WHERE user_id = ?';
    await executeQuery(query, [userId]);
    return true;
  } catch (error) {
    console.error('Error deleting user sessions:', error);
    throw error;
  }
};

// User settings
const createUserSettings = async (userId) => {
  try {
    const settingsId = generateId();
    const query = `
      INSERT INTO user_settings (id, user_id)
      VALUES (?, ?)
    `;
    await executeQuery(query, [settingsId, userId]);
    return settingsId;
  } catch (error) {
    console.error('Error creating user settings:', error);
    throw error;
  }
};

const getUserSettings = async (userId) => {
  try {
    const query = 'SELECT * FROM user_settings WHERE user_id = ?';
    const settings = await executeQuery(query, [userId]);
    return settings[0] || null;
  } catch (error) {
    console.error('Error getting user settings:', error);
    throw error;
  }
};

const updateUserSettings = async (userId, settingsData) => {
  try {
    const { emailNotifications, pushNotifications, privacyLevel, theme, language } = settingsData;
    
    const query = `
      UPDATE user_settings 
      SET email_notifications = COALESCE(?, email_notifications),
          push_notifications = COALESCE(?, push_notifications),
          privacy_level = COALESCE(?, privacy_level),
          theme = COALESCE(?, theme),
          language = COALESCE(?, language),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `;
    
    await executeQuery(query, [emailNotifications, pushNotifications, privacyLevel, theme, language, userId]);
    return await getUserSettings(userId);
  } catch (error) {
    console.error('Error updating user settings:', error);
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
  deleteAllUserSessions,
  createUserSettings,
  getUserSettings,
  updateUserSettings
};

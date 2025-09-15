// Authentication database queries
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./sqlite-config');

// User authentication functions
const authQueries = {
  // Create a new user
  async createUser(userData) {
    const { email, username, displayName, password } = userData;
    
    // Check if email already exists
    const existingUser = await db.get(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUser) {
      throw new Error('Email already exists');
    }
    
    // Check if username already exists
    const existingUsername = await db.get(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    
    if (existingUsername) {
      throw new Error('Username already exists');
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Generate user ID
    const userId = crypto.randomUUID();
    
    // Insert user
    const result = await db.query(
      `INSERT INTO users (id, email, username, display_name, password_hash, avatar, bio)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        email,
        username,
        displayName,
        passwordHash,
        userData.avatar || null,
        userData.bio || null
      ]
    );
    
    return {
      id: userId,
      email,
      username,
      displayName,
      avatar: userData.avatar,
      bio: userData.bio,
      followers: [],
      following: [],
      createdAt: new Date()
    };
  },

  // Authenticate user login
  async authenticateUser(email, password) {
    // Find user by email
    const user = await db.get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }
    
    // Return user without password hash
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      avatar: user.avatar,
      bio: user.bio,
      followers: JSON.parse(user.followers || '[]'),
      following: JSON.parse(user.following || '[]'),
      createdAt: new Date(user.created_at)
    };
  },

  // Get user by ID
  async getUserById(userId) {
    const user = await db.get(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      avatar: user.avatar,
      bio: user.bio,
      followers: JSON.parse(user.followers || '[]'),
      following: JSON.parse(user.following || '[]'),
      createdAt: new Date(user.created_at)
    };
  },

  // Get user by email
  async getUserByEmail(email) {
    const user = await db.get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      avatar: user.avatar,
      bio: user.bio,
      followers: JSON.parse(user.followers || '[]'),
      following: JSON.parse(user.following || '[]'),
      createdAt: new Date(user.created_at)
    };
  },

  // Update user
  async updateUser(userId, updates) {
    const allowedFields = ['username', 'display_name', 'avatar', 'bio', 'followers', 'following'];
    const updateFields = [];
    const updateValues = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }
    
    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    updateValues.push(userId);
    
    await db.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    return await this.getUserById(userId);
  },

  // Create session
  async createSession(userId) {
    const sessionId = crypto.randomUUID();
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    await db.query(
      'INSERT INTO user_sessions (id, user_id, session_token, expires_at) VALUES (?, ?, ?, ?)',
      [sessionId, userId, sessionToken, expiresAt.toISOString()]
    );
    
    return {
      id: sessionId,
      userId,
      sessionToken,
      expiresAt
    };
  },

  // Get session by token
  async getSessionByToken(token) {
    const session = await db.get(
      'SELECT * FROM user_sessions WHERE session_token = ? AND expires_at > ?',
      [token, new Date().toISOString()]
    );
    
    if (!session) {
      return null;
    }
    
    return {
      id: session.id,
      userId: session.user_id,
      sessionToken: session.session_token,
      expiresAt: new Date(session.expires_at)
    };
  },

  // Delete session
  async deleteSession(token) {
    await db.query(
      'DELETE FROM user_sessions WHERE session_token = ?',
      [token]
    );
  },

  // Clean expired sessions
  async cleanExpiredSessions() {
    await db.query(
      'DELETE FROM user_sessions WHERE expires_at < ?',
      [new Date().toISOString()]
    );
  }
};

module.exports = authQueries;

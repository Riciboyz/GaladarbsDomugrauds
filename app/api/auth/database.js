// SQLite database service for authentication
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

// Create database file in project root
const dbPath = path.join(process.cwd(), 'threads_app.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database for auth');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Initialize database schema
const initDatabase = async () => {
  try {
    // Check if tables exist first
    const tablesExist = await new Promise((resolve) => {
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
        resolve(!!row);
      });
    });

    if (tablesExist) {
      console.log('✅ Database tables already exist, skipping initialization');
      return;
    }

    // Read and execute the SQLite schema
    const fs = require('fs');
    const schemaPath = path.join(process.cwd(), 'database', 'sqlite-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await new Promise((resolve, reject) => {
          db.run(statement, (err) => {
            if (err) {
              // Skip trigger errors for now
              if (err.message.includes('incomplete input') || err.message.includes('trigger')) {
                console.log('⚠️ Skipping trigger:', statement.substring(0, 50) + '...');
                resolve();
              } else {
                console.error('❌ Schema error:', err.message);
                console.error('Statement:', statement);
                reject(err);
              }
            } else {
              resolve();
            }
          });
        });
      }
    }
    
    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
};

// Initialize database on startup
initDatabase();

// Database helper functions
const database = {
  // Execute a query
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        db.all(sql, params, (err, rows) => {
          if (err) {
            console.error('❌ Database query error:', err);
            reject(err);
          } else {
            resolve({ rows: rows || [] });
          }
        });
      } else {
        db.run(sql, params, function(err) {
          if (err) {
            console.error('❌ Database query error:', err);
            reject(err);
          } else {
            resolve({ 
              rowCount: this.changes,
              lastID: this.lastID,
              rows: [{ id: this.lastID }]
            });
          }
        });
      }
    });
  },

  // Get a single row
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          console.error('❌ Database query error:', err);
          reject(err);
        } else {
          resolve({ rows: row ? [row] : [] });
        }
      });
    });
  },

  // Close database connection
  close: () => {
    return new Promise((resolve) => {
      db.close((err) => {
        if (err) {
          console.error('❌ Error closing database:', err.message);
        } else {
          console.log('✅ Database connection closed');
        }
        resolve();
      });
    });
  }
};

// Authentication functions
const authDb = {
  // Create a new user
  async createUser(userData) {
    const { email, username, displayName, passwordHash, avatar, bio } = userData;
    const id = crypto.randomUUID();
    
    const result = await database.query(
      `INSERT INTO users (id, email, username, display_name, password_hash, avatar, bio, followers, following, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, '[]', '[]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, email, username, displayName, passwordHash, avatar || null, bio || null]
    );
    
    return await this.getUserById(id);
  },

  // Get user by email
  async getUserByEmail(email) {
    const result = await database.get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (result.rows.length === 0) return null;
    
    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      passwordHash: user.password_hash,
      avatar: user.avatar,
      bio: user.bio,
      followers: JSON.parse(user.followers || '[]'),
      following: JSON.parse(user.following || '[]'),
      createdAt: new Date(user.created_at)
    };
  },

  // Get user by username
  async getUserByUsername(username) {
    const result = await database.get(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (result.rows.length === 0) return null;
    
    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      passwordHash: user.password_hash,
      avatar: user.avatar,
      bio: user.bio,
      followers: JSON.parse(user.followers || '[]'),
      following: JSON.parse(user.following || '[]'),
      createdAt: new Date(user.created_at)
    };
  },

  // Get user by ID
  async getUserById(id) {
    const result = await database.get(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    
    if (result.rows.length === 0) return null;
    
    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      passwordHash: user.password_hash,
      avatar: user.avatar,
      bio: user.bio,
      followers: JSON.parse(user.followers || '[]'),
      following: JSON.parse(user.following || '[]'),
      createdAt: new Date(user.created_at)
    };
  },

  // Create session
  async createSession(userId) {
    const sessionId = crypto.randomUUID();
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    await database.query(
      'INSERT INTO user_sessions (id, user_id, session_token, expires_at, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
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
    const result = await database.get(
      'SELECT * FROM user_sessions WHERE session_token = ? AND expires_at > CURRENT_TIMESTAMP',
      [token]
    );
    
    if (result.rows.length === 0) return null;
    
    const session = result.rows[0];
    return {
      id: session.id,
      userId: session.user_id,
      sessionToken: session.session_token,
      expiresAt: new Date(session.expires_at),
      createdAt: new Date(session.created_at)
    };
  },

  // Delete session
  async deleteSession(token) {
    await database.query(
      'DELETE FROM user_sessions WHERE session_token = ?',
      [token]
    );
  },

  // Delete expired sessions
  async deleteExpiredSessions() {
    await database.query(
      'DELETE FROM user_sessions WHERE expires_at <= CURRENT_TIMESTAMP'
    );
  },

  // Update user
  async updateUser(id, updates) {
    const setClause = Object.keys(updates)
      .filter(key => key !== 'id')
      .map(key => {
        if (key === 'followers' || key === 'following') {
          return `${key} = ?`;
        }
        return `${key} = ?`;
      })
      .join(', ');

    const values = Object.keys(updates)
      .filter(key => key !== 'id')
      .map(key => {
        if (key === 'followers' || key === 'following') {
          return JSON.stringify(updates[key]);
        }
        return updates[key];
      });

    values.push(id);

    await database.query(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    
    return await this.getUserById(id);
  },

  // Get all users (for debugging)
  async getAllUsers() {
    const result = await database.query('SELECT * FROM users ORDER BY created_at DESC');
    
    return result.rows.map(user => ({
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      passwordHash: user.password_hash,
      avatar: user.avatar,
      bio: user.bio,
      followers: JSON.parse(user.followers || '[]'),
      following: JSON.parse(user.following || '[]'),
      createdAt: new Date(user.created_at)
    }));
  }
};

module.exports = authDb;

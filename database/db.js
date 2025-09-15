// Simplified database configuration for SQLite
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file in project root
const dbPath = path.join(process.cwd(), 'threads_app.db');

// Create database connection
let db = null;

const initDatabase = () => {
  if (db) return db;
  
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Error opening database:', err.message);
    } else {
      console.log('✅ Connected to SQLite database');
    }
  });

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
  
  return db;
};

// Database helper functions
const database = {
  // Initialize database connection
  init: () => {
    return initDatabase();
  },

  // Execute a query
  query: (sql, params = []) => {
    const db = initDatabase();
    return new Promise((resolve, reject) => {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        db.all(sql, params, (err, rows) => {
          if (err) {
            console.error('❌ Database query error:', err);
            reject(err);
          } else {
            resolve({ success: true, rows });
          }
        });
      } else {
        db.run(sql, params, function(err) {
          if (err) {
            console.error('❌ Database query error:', err);
            reject(err);
          } else {
            resolve({ 
              success: true,
              rowCount: this.changes,
              lastID: this.lastID,
              rows: this.lastID ? [{ id: this.lastID }] : []
            });
          }
        });
      }
    });
  },

  // Get a single row
  get: (sql, params = []) => {
    const db = initDatabase();
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          console.error('❌ Database query error:', err);
          reject(err);
        } else {
          resolve({ success: true, rows: row ? [row] : [] });
        }
      });
    });
  },

  // Close database connection
  close: () => {
    if (db) {
      return new Promise((resolve) => {
        db.close((err) => {
          if (err) {
            console.error('❌ Error closing database:', err.message);
          } else {
            console.log('✅ Database connection closed');
          }
          db = null;
          resolve();
        });
      });
    }
    return Promise.resolve();
  },

  // Transaction helper
  transaction: async (callback) => {
    const db = initDatabase();
    try {
      await database.query('BEGIN TRANSACTION');
      const result = await callback(database);
      await database.query('COMMIT');
      return result;
    } catch (error) {
      await database.query('ROLLBACK');
      throw error;
    }
  }
};

module.exports = database;

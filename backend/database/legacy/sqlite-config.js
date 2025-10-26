// SQLite database configuration (no installation required)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file in project root
const dbPath = path.join(process.cwd(), 'threads_app.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

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
            console.log('📊 Query executed:', { sql, rows: rows?.length || 0 });
            resolve({ rows });
          }
        });
      } else {
        db.run(sql, params, function(err) {
          if (err) {
            console.error('❌ Database query error:', err);
            reject(err);
          } else {
            console.log('📊 Query executed:', { sql, changes: this.changes });
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
  },

  // Transaction helper
  transaction: async (callback) => {
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

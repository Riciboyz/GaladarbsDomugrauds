const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'threads_app.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// Migration script for daily topics
async function migrate() {
  try {
    console.log('Starting daily topics migration...');

    // Create daily_topics table
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS daily_topics (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          is_active INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT NOT NULL,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ Created daily_topics table');

    // Add scheduled_date column to daily_topics if it doesn't exist
    await new Promise((resolve, reject) => {
      db.run(`
        ALTER TABLE daily_topics ADD COLUMN scheduled_date TEXT
      `, (err) => {
        // Ignore error if column already exists
        resolve();
      });
    });
    console.log('✅ Ensured scheduled_date column on daily_topics');

    // Create topic_submissions table
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS topic_submissions (
          id TEXT PRIMARY KEY,
          topic_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          content TEXT,
          image_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (topic_id) REFERENCES daily_topics(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ Created topic_submissions table');

    // Add role column to users table if it doesn't exist
    await new Promise((resolve, reject) => {
      db.run(`
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'
      `, (err) => {
        // Ignore error if column already exists
        resolve();
      });
    });
    console.log('✅ Added role column to users table');

    // Create indexes
    await new Promise((resolve, reject) => {
      db.run(`CREATE INDEX IF NOT EXISTS idx_daily_topics_active ON daily_topics(is_active)`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`CREATE INDEX IF NOT EXISTS idx_daily_topics_created_at ON daily_topics(created_at)`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`CREATE INDEX IF NOT EXISTS idx_daily_topics_scheduled_date ON daily_topics(scheduled_date)`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`CREATE INDEX IF NOT EXISTS idx_topic_submissions_topic ON topic_submissions(topic_id)`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`CREATE INDEX IF NOT EXISTS idx_topic_submissions_user ON topic_submissions(user_id)`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('✅ Created indexes');

    // Set first user as admin (if any users exist)
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE users 
        SET role = 'admin' 
        WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ Set first user as admin');

    console.log('🎉 Daily topics migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

migrate();

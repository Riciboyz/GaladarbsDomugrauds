const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(process.cwd(), 'threads_app.db');

console.log('🚀 Starting Groups Enhancement Migration...');
console.log('📁 Database path:', dbPath);

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Migration functions
function runMigration() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('📋 Creating group posts table...');
      
      // Group posts table
      db.run(`
        CREATE TABLE IF NOT EXISTS group_posts (
          id TEXT PRIMARY KEY,
          group_id TEXT NOT NULL,
          author_id TEXT NOT NULL,
          title TEXT,
          content TEXT NOT NULL,
          post_type TEXT DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'link', 'poll', 'event')),
          media_urls TEXT DEFAULT '[]',
          link_url TEXT,
          link_preview TEXT,
          poll_options TEXT DEFAULT '[]',
          poll_end_date DATETIME,
          event_start_date DATETIME,
          event_end_date DATETIME,
          event_location TEXT,
          is_pinned BOOLEAN DEFAULT 0,
          is_announcement BOOLEAN DEFAULT 0,
          visibility TEXT DEFAULT 'group' CHECK (visibility IN ('group', 'members_only')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_deleted BOOLEAN DEFAULT 0,
          FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
          FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating group_posts table:', err.message);
          reject(err);
          return;
        }
        console.log('✅ Created group_posts table');
      });

      console.log('📋 Creating group post comments table...');
      
      // Group post comments table
      db.run(`
        CREATE TABLE IF NOT EXISTS group_post_comments (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL,
          author_id TEXT NOT NULL,
          content TEXT NOT NULL,
          parent_id TEXT,
          media_urls TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_deleted BOOLEAN DEFAULT 0,
          FOREIGN KEY (post_id) REFERENCES group_posts(id) ON DELETE CASCADE,
          FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (parent_id) REFERENCES group_post_comments(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating group_post_comments table:', err.message);
          reject(err);
          return;
        }
        console.log('✅ Created group_post_comments table');
      });

      console.log('📋 Creating group post reactions table...');
      
      // Group post reactions table
      db.run(`
        CREATE TABLE IF NOT EXISTS group_post_reactions (
          id TEXT PRIMARY KEY,
          post_id TEXT,
          comment_id TEXT,
          user_id TEXT NOT NULL,
          reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES group_posts(id) ON DELETE CASCADE,
          FOREIGN KEY (comment_id) REFERENCES group_post_comments(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating group_post_reactions table:', err.message);
          reject(err);
          return;
        }
        console.log('✅ Created group_post_reactions table');
      });

      console.log('📋 Creating group member roles table...');
      
      // Group member roles table
      db.run(`
        CREATE TABLE IF NOT EXISTS group_member_roles (
          id TEXT PRIMARY KEY,
          group_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'member')),
          assigned_by TEXT NOT NULL,
          assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating group_member_roles table:', err.message);
          reject(err);
          return;
        }
        console.log('✅ Created group_member_roles table');
      });

      console.log('📋 Creating group categories table...');
      
      // Group categories table
      db.run(`
        CREATE TABLE IF NOT EXISTS group_categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          color TEXT DEFAULT '#3B82F6',
          icon TEXT DEFAULT '📁',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating group_categories table:', err.message);
          reject(err);
          return;
        }
        console.log('✅ Created group_categories table');
      });

      console.log('📋 Creating group category assignments table...');
      
      // Group category assignments table
      db.run(`
        CREATE TABLE IF NOT EXISTS group_category_assignments (
          id TEXT PRIMARY KEY,
          group_id TEXT NOT NULL,
          category_id TEXT NOT NULL,
          FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES group_categories(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating group_category_assignments table:', err.message);
          reject(err);
          return;
        }
        console.log('✅ Created group_category_assignments table');
      });

      console.log('📋 Creating group events table...');
      
      // Group events table
      db.run(`
        CREATE TABLE IF NOT EXISTS group_events (
          id TEXT PRIMARY KEY,
          group_id TEXT NOT NULL,
          created_by TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          start_date DATETIME NOT NULL,
          end_date DATETIME,
          location TEXT,
          is_virtual BOOLEAN DEFAULT 0,
          meeting_url TEXT,
          max_attendees INTEGER,
          attendees TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_deleted BOOLEAN DEFAULT 0,
          FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating group_events table:', err.message);
          reject(err);
          return;
        }
        console.log('✅ Created group_events table');
      });

      console.log('📋 Creating group notification preferences table...');
      
      // Group notification preferences table
      db.run(`
        CREATE TABLE IF NOT EXISTS group_notification_preferences (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          group_id TEXT NOT NULL,
          new_posts BOOLEAN DEFAULT 1,
          new_comments BOOLEAN DEFAULT 1,
          new_reactions BOOLEAN DEFAULT 1,
          new_members BOOLEAN DEFAULT 1,
          new_events BOOLEAN DEFAULT 1,
          mentions BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating group_notification_preferences table:', err.message);
          reject(err);
          return;
        }
        console.log('✅ Created group_notification_preferences table');
      });

      console.log('📋 Creating group rules table...');
      
      // Group rules table
      db.run(`
        CREATE TABLE IF NOT EXISTS group_rules (
          id TEXT PRIMARY KEY,
          group_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          order_index INTEGER DEFAULT 0,
          created_by TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_deleted BOOLEAN DEFAULT 0,
          FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating group_rules table:', err.message);
          reject(err);
          return;
        }
        console.log('✅ Created group_rules table');
      });

      // Create indexes
      console.log('📋 Creating indexes...');
      
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_group_posts_group ON group_posts(group_id)',
        'CREATE INDEX IF NOT EXISTS idx_group_posts_author ON group_posts(author_id)',
        'CREATE INDEX IF NOT EXISTS idx_group_posts_created ON group_posts(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_group_posts_pinned ON group_posts(is_pinned)',
        'CREATE INDEX IF NOT EXISTS idx_group_posts_type ON group_posts(post_type)',
        'CREATE INDEX IF NOT EXISTS idx_comments_post ON group_post_comments(post_id)',
        'CREATE INDEX IF NOT EXISTS idx_comments_author ON group_post_comments(author_id)',
        'CREATE INDEX IF NOT EXISTS idx_comments_parent ON group_post_comments(parent_id)',
        'CREATE INDEX IF NOT EXISTS idx_comments_created ON group_post_comments(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_reactions_post ON group_post_reactions(post_id)',
        'CREATE INDEX IF NOT EXISTS idx_reactions_comment ON group_post_reactions(comment_id)',
        'CREATE INDEX IF NOT EXISTS idx_reactions_user ON group_post_reactions(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_reactions_type ON group_post_reactions(reaction_type)',
        'CREATE INDEX IF NOT EXISTS idx_roles_group ON group_member_roles(group_id)',
        'CREATE INDEX IF NOT EXISTS idx_roles_user ON group_member_roles(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_roles_role ON group_member_roles(role)',
        'CREATE INDEX IF NOT EXISTS idx_events_group ON group_events(group_id)',
        'CREATE INDEX IF NOT EXISTS idx_events_creator ON group_events(created_by)',
        'CREATE INDEX IF NOT EXISTS idx_events_start ON group_events(start_date)',
        'CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON group_notification_preferences(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_notif_prefs_group ON group_notification_preferences(group_id)',
        'CREATE INDEX IF NOT EXISTS idx_rules_group ON group_rules(group_id)',
        'CREATE INDEX IF NOT EXISTS idx_rules_order ON group_rules(order_index)'
      ];

      let indexCount = 0;
      indexes.forEach((indexQuery, i) => {
        db.run(indexQuery, (err) => {
          if (err) {
            console.error(`❌ Error creating index ${i + 1}:`, err.message);
            reject(err);
            return;
          }
          indexCount++;
          if (indexCount === indexes.length) {
            console.log('✅ Created all indexes');
            
            // Insert default categories
            console.log('📋 Inserting default categories...');
            insertDefaultCategories();
          }
        });
      });
    });
  });
}

function insertDefaultCategories() {
  const categories = [
    { id: 'cat_tech', name: 'Technology', description: 'Tech discussions and news', color: '#3B82F6', icon: '💻' },
    { id: 'cat_gaming', name: 'Gaming', description: 'Gaming communities and discussions', color: '#8B5CF6', icon: '🎮' },
    { id: 'cat_art', name: 'Art & Design', description: 'Creative communities', color: '#F59E0B', icon: '🎨' },
    { id: 'cat_music', name: 'Music', description: 'Music discussions and sharing', color: '#EF4444', icon: '🎵' },
    { id: 'cat_sports', name: 'Sports', description: 'Sports teams and discussions', color: '#10B981', icon: '⚽' },
    { id: 'cat_education', name: 'Education', description: 'Learning and academic discussions', color: '#6366F1', icon: '📚' },
    { id: 'cat_business', name: 'Business', description: 'Professional networking', color: '#059669', icon: '💼' },
    { id: 'cat_lifestyle', name: 'Lifestyle', description: 'General lifestyle discussions', color: '#EC4899', icon: '🌟' }
  ];

  let insertedCount = 0;
  categories.forEach((category) => {
    db.run(`
      INSERT OR IGNORE INTO group_categories (id, name, description, color, icon)
      VALUES (?, ?, ?, ?, ?)
    `, [category.id, category.name, category.description, category.color, category.icon], (err) => {
      if (err) {
        console.error(`❌ Error inserting category ${category.name}:`, err.message);
        return;
      }
      insertedCount++;
      if (insertedCount === categories.length) {
        console.log('✅ Inserted default categories');
        console.log('🎉 Migration completed successfully!');
        db.close();
      }
    });
  });
}

// Run migration
runMigration().catch((error) => {
  console.error('❌ Migration failed:', error);
  db.close();
  process.exit(1);
});

#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database path
const dbPath = path.join(process.cwd(), 'threads_app.db');

console.log('🚀 Starting Groups System Rebuild Migration...');
console.log('📁 Database path:', dbPath);

// Create database connection
const db = new sqlite3.Database(dbPath);

// Migration functions
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error('❌ Query error:', err);
        reject(err);
      } else {
        console.log('✅ Query executed successfully');
        resolve(this);
      }
    });
  });
}

function checkTableExists(tableName) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT name FROM sqlite_master WHERE type='table' AND name=?`;
    db.get(sql, [tableName], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(!!row);
      }
    });
  });
}

async function migrateGroupsSystem() {
  try {
    console.log('\n📊 Checking existing tables...');
    
    // Check if groups table exists
    const groupsExists = await checkTableExists('groups');
    console.log('Groups table exists:', groupsExists);
    
    // Check if group_messages table exists
    const messagesExists = await checkTableExists('group_messages');
    console.log('Group messages table exists:', messagesExists);
    
    // Check if group_posts table exists
    const postsExists = await checkTableExists('group_posts');
    console.log('Group posts table exists:', postsExists);
    
    console.log('\n🔧 Creating/updating database schema...');
    
    // Create groups table if it doesn't exist
    if (!groupsExists) {
      console.log('Creating groups table...');
      await runQuery(`
        CREATE TABLE groups (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          avatar TEXT,
          is_private INTEGER DEFAULT 0,
          members TEXT DEFAULT '[]',
          created_by TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_deleted INTEGER DEFAULT 0,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);
    }
    
    // Create group_messages table if it doesn't exist
    if (!messagesExists) {
      console.log('Creating group_messages table...');
      await runQuery(`
        CREATE TABLE group_messages (
          id TEXT PRIMARY KEY,
          group_id TEXT NOT NULL,
          sender_id TEXT NOT NULL,
          content TEXT NOT NULL,
          message_type TEXT DEFAULT 'text',
          attachment_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_deleted INTEGER DEFAULT 0,
          FOREIGN KEY (group_id) REFERENCES groups(id),
          FOREIGN KEY (sender_id) REFERENCES users(id)
        )
      `);
    }
    
    // Create group_posts table if it doesn't exist
    if (!postsExists) {
      console.log('Creating group_posts table...');
      await runQuery(`
        CREATE TABLE group_posts (
          id TEXT PRIMARY KEY,
          group_id TEXT NOT NULL,
          author_id TEXT NOT NULL,
          title TEXT,
          content TEXT NOT NULL,
          post_type TEXT DEFAULT 'text',
          attachment_url TEXT,
          is_pinned INTEGER DEFAULT 0,
          is_announcement INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_deleted INTEGER DEFAULT 0,
          FOREIGN KEY (group_id) REFERENCES groups(id),
          FOREIGN KEY (author_id) REFERENCES users(id)
        )
      `);
    }
    
    // Create group_post_comments table
    console.log('Creating group_post_comments table...');
    await runQuery(`
      CREATE TABLE IF NOT EXISTS group_post_comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        author_id TEXT NOT NULL,
        content TEXT NOT NULL,
        parent_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_deleted INTEGER DEFAULT 0,
        FOREIGN KEY (post_id) REFERENCES group_posts(id),
        FOREIGN KEY (author_id) REFERENCES users(id),
        FOREIGN KEY (parent_id) REFERENCES group_post_comments(id)
      )
    `);
    
    // Create group_post_reactions table
    console.log('Creating group_post_reactions table...');
    await runQuery(`
      CREATE TABLE IF NOT EXISTS group_post_reactions (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        reaction_type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES group_posts(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(post_id, user_id, reaction_type)
      )
    `);
    
    // Create group_member_roles table
    console.log('Creating group_member_roles table...');
    await runQuery(`
      CREATE TABLE IF NOT EXISTS group_member_roles (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        assigned_by TEXT NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (assigned_by) REFERENCES users(id),
        UNIQUE(group_id, user_id)
      )
    `);
    
    // Create group_categories table
    console.log('Creating group_categories table...');
    await runQuery(`
      CREATE TABLE IF NOT EXISTS group_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        color TEXT DEFAULT '#007bff',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create group_category_assignments table
    console.log('Creating group_category_assignments table...');
    await runQuery(`
      CREATE TABLE IF NOT EXISTS group_category_assignments (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id),
        FOREIGN KEY (category_id) REFERENCES group_categories(id),
        UNIQUE(group_id, category_id)
      )
    `);
    
    // Create group_events table
    console.log('Creating group_events table...');
    await runQuery(`
      CREATE TABLE IF NOT EXISTS group_events (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        event_date DATETIME NOT NULL,
        location TEXT,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_deleted INTEGER DEFAULT 0,
        FOREIGN KEY (group_id) REFERENCES groups(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    
    // Create group_notification_preferences table
    console.log('Creating group_notification_preferences table...');
    await runQuery(`
      CREATE TABLE IF NOT EXISTS group_notification_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        group_id TEXT NOT NULL,
        new_messages INTEGER DEFAULT 1,
        new_posts INTEGER DEFAULT 1,
        new_comments INTEGER DEFAULT 1,
        role_changes INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (group_id) REFERENCES groups(id),
        UNIQUE(user_id, group_id)
      )
    `);
    
    // Create group_rules table
    console.log('Creating group_rules table...');
    await runQuery(`
      CREATE TABLE IF NOT EXISTS group_rules (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_deleted INTEGER DEFAULT 0,
        FOREIGN KEY (group_id) REFERENCES groups(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    
    console.log('\n📝 Inserting default categories...');
    
    // Insert default categories
    const defaultCategories = [
      { id: 'cat_tech', name: 'Technology', description: 'Tech discussions and news', color: '#007bff' },
      { id: 'cat_gaming', name: 'Gaming', description: 'Gaming community', color: '#28a745' },
      { id: 'cat_art', name: 'Art & Design', description: 'Creative arts and design', color: '#dc3545' },
      { id: 'cat_music', name: 'Music', description: 'Music lovers community', color: '#ffc107' },
      { id: 'cat_sports', name: 'Sports', description: 'Sports discussions', color: '#17a2b8' },
      { id: 'cat_education', name: 'Education', description: 'Learning and education', color: '#6f42c1' },
      { id: 'cat_business', name: 'Business', description: 'Business and entrepreneurship', color: '#fd7e14' },
      { id: 'cat_lifestyle', name: 'Lifestyle', description: 'Lifestyle and wellness', color: '#20c997' }
    ];
    
    for (const category of defaultCategories) {
      try {
        await runQuery(`
          INSERT OR IGNORE INTO group_categories (id, name, description, color)
          VALUES (?, ?, ?, ?)
        `, [category.id, category.name, category.description, category.color]);
        console.log(`✅ Inserted category: ${category.name}`);
      } catch (error) {
        console.log(`⚠️ Category ${category.name} already exists`);
      }
    }
    
    console.log('\n🔍 Creating indexes for performance...');
    
    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id)',
      'CREATE INDEX IF NOT EXISTS idx_group_messages_sender_id ON group_messages(sender_id)',
      'CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_group_posts_group_id ON group_posts(group_id)',
      'CREATE INDEX IF NOT EXISTS idx_group_posts_author_id ON group_posts(author_id)',
      'CREATE INDEX IF NOT EXISTS idx_group_posts_created_at ON group_posts(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_group_post_comments_post_id ON group_post_comments(post_id)',
      'CREATE INDEX IF NOT EXISTS idx_group_post_comments_author_id ON group_post_comments(author_id)',
      'CREATE INDEX IF NOT EXISTS idx_group_post_reactions_post_id ON group_post_reactions(post_id)',
      'CREATE INDEX IF NOT EXISTS idx_group_member_roles_group_id ON group_member_roles(group_id)',
      'CREATE INDEX IF NOT EXISTS idx_group_member_roles_user_id ON group_member_roles(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by)',
      'CREATE INDEX IF NOT EXISTS idx_groups_is_deleted ON groups(is_deleted)'
    ];
    
    for (const indexSql of indexes) {
      try {
        await runQuery(indexSql);
        console.log('✅ Index created');
      } catch (error) {
        console.log('⚠️ Index creation skipped (may already exist)');
      }
    }
    
    console.log('\n🧹 Cleaning up old data...');
    
    // Clean up any orphaned messages
    await runQuery(`
      UPDATE group_messages 
      SET is_deleted = 1 
      WHERE group_id NOT IN (SELECT id FROM groups WHERE is_deleted = 0)
    `);
    
    // Clean up any orphaned posts
    await runQuery(`
      UPDATE group_posts 
      SET is_deleted = 1 
      WHERE group_id NOT IN (SELECT id FROM groups WHERE is_deleted = 0)
    `);
    
    console.log('\n✅ Groups System Rebuild Migration completed successfully!');
    console.log('\n📊 Database Summary:');
    console.log('- Groups table: Ready');
    console.log('- Group messages table: Ready');
    console.log('- Group posts table: Ready');
    console.log('- Group comments table: Ready');
    console.log('- Group reactions table: Ready');
    console.log('- Group member roles table: Ready');
    console.log('- Group categories table: Ready');
    console.log('- Group events table: Ready');
    console.log('- Group notification preferences table: Ready');
    console.log('- Group rules table: Ready');
    console.log('- Performance indexes: Created');
    console.log('- Default categories: Inserted');
    
    console.log('\n🚀 The Groups system is now ready for testing!');
    console.log('Run the WebSocket server: node websocket-server-enhanced.js');
    console.log('Open test-groups-rebuild.html in your browser to test');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run migration
migrateGroupsSystem();

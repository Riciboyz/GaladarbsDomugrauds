const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database path
const dbPath = path.join(process.cwd(), 'threads_app.db');

console.log('🚀 Initializing enhanced database...');

// Read schema file
const schemaPath = path.join(__dirname, 'sqlite-schema.sql');
let schema = '';

try {
  schema = fs.readFileSync(schemaPath, 'utf8');
  console.log('✅ Schema file loaded');
} catch (error) {
  console.error('❌ Error reading schema file:', error);
  process.exit(1);
}

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Execute schema
db.exec(schema, (err) => {
  if (err) {
    console.error('❌ Error executing schema:', err);
    process.exit(1);
  } else {
    console.log('✅ Database schema executed successfully');
    
    // Verify tables were created
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      if (err) {
        console.error('❌ Error checking tables:', err);
      } else {
        console.log('📋 Created tables:', tables.map(t => t.name).join(', '));
        
        // Insert sample data if database is empty
        insertSampleData();
      }
    });
  }
});

// Insert sample data
function insertSampleData() {
  // Check if users table is empty
  db.get("SELECT COUNT(*) as count FROM users", (err, result) => {
    if (err) {
      console.error('❌ Error checking users table:', err);
      return;
    }

    if (result.count === 0) {
      console.log('📝 Inserting sample data...');
      
      // Insert sample users
      const sampleUsers = [
        {
          id: 'user_1',
          email: 'admin@example.com',
          username: 'admin',
          display_name: 'Administrator',
          password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
          bio: 'System administrator',
          avatar: null
        },
        {
          id: 'user_2',
          email: 'john@example.com',
          username: 'john_doe',
          display_name: 'John Doe',
          password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
          bio: 'Software developer',
          avatar: null
        },
        {
          id: 'user_3',
          email: 'jane@example.com',
          username: 'jane_smith',
          display_name: 'Jane Smith',
          password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
          bio: 'Designer',
          avatar: null
        }
      ];

      // Insert users
      const insertUser = db.prepare(`
        INSERT INTO users (id, email, username, display_name, password_hash, bio, avatar, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      sampleUsers.forEach(user => {
        insertUser.run([
          user.id,
          user.email,
          user.username,
          user.display_name,
          user.password_hash,
          user.bio,
          user.avatar
        ]);
      });

      insertUser.finalize();

      // Insert sample groups
      const sampleGroups = [
        {
          id: 'group_1',
          name: 'General Discussion',
          description: 'General discussion group for all members',
          is_private: 0,
          created_by: 'user_1',
          members: JSON.stringify(['user_1', 'user_2', 'user_3']),
          avatar: null
        },
        {
          id: 'group_2',
          name: 'Development Team',
          description: 'Development team discussions',
          is_private: 1,
          created_by: 'user_1',
          members: JSON.stringify(['user_1', 'user_2']),
          avatar: null
        }
      ];

      const insertGroup = db.prepare(`
        INSERT INTO groups (id, name, description, is_private, created_by, members, avatar, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      sampleGroups.forEach(group => {
        insertGroup.run([
          group.id,
          group.name,
          group.description,
          group.is_private,
          group.created_by,
          group.members,
          group.avatar
        ]);
      });

      insertGroup.finalize();

      // Insert sample group messages
      const sampleMessages = [
        {
          id: 'msg_1',
          group_id: 'group_1',
          sender_id: 'user_1',
          content: 'Welcome to the general discussion group!',
          message_type: 'text',
          attachment_url: null
        },
        {
          id: 'msg_2',
          group_id: 'group_1',
          sender_id: 'user_2',
          content: 'Thanks for the welcome!',
          message_type: 'text',
          attachment_url: null
        },
        {
          id: 'msg_3',
          group_id: 'group_2',
          sender_id: 'user_1',
          content: 'Let\'s discuss the new features',
          message_type: 'text',
          attachment_url: null
        }
      ];

      const insertMessage = db.prepare(`
        INSERT INTO group_messages (id, group_id, sender_id, content, message_type, attachment_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      sampleMessages.forEach(message => {
        insertMessage.run([
          message.id,
          message.group_id,
          message.sender_id,
          message.content,
          message.message_type,
          message.attachment_url
        ]);
      });

      insertMessage.finalize();

      console.log('✅ Sample data inserted successfully');
    } else {
      console.log('ℹ️  Database already contains data, skipping sample data insertion');
    }

    // Close database connection
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      } else {
        console.log('✅ Database initialization completed successfully');
        console.log('🎉 You can now start the application with: npm run start:enhanced');
      }
    });
  });
}

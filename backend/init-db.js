const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '..', 'threads_app.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Initializing database with sample data...');

db.serialize(() => {
  // Add sample users
  const sampleUsers = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'testuser@example.com',
      username: 'testuser',
      display_name: 'Test User',
      bio: 'Welcome to DomuGrauds!',
      password_hash: 'password123',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
    },
    {
      id: crypto.randomUUID(),
      email: 'alice@example.com',
      username: 'alice',
      display_name: 'Alice Johnson',
      bio: 'Software developer and coffee enthusiast ☕',
      password_hash: 'password123',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
    },
    {
      id: crypto.randomUUID(),
      email: 'bob@example.com',
      username: 'bob',
      display_name: 'Bob Smith',
      bio: 'Designer and creative thinker 🎨',
      password_hash: 'password123',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
    }
  ];

  sampleUsers.forEach(user => {
    db.run(`
      INSERT OR REPLACE INTO users (id, email, username, display_name, bio, password_hash, avatar, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [user.id, user.email, user.username, user.display_name, user.bio, user.password_hash, user.avatar], (err) => {
      if (err) {
        console.error('Error inserting user:', err);
      } else {
        console.log(`✅ Added user: ${user.username}`);
      }
    });
  });

  // Add sample threads
  const threads = [
    {
      id: crypto.randomUUID(),
      author_id: sampleUsers[0].id,
      content: 'Welcome to DomuGrauds! 🎉 This is your social platform.',
      visibility: 'public',
      likes: '[]',
      dislikes: '[]'
    },
    {
      id: crypto.randomUUID(),
      author_id: sampleUsers[1].id,
      content: 'Just had an amazing day working on this project! 🚀',
      visibility: 'public',
      likes: '[]',
      dislikes: '[]'
    },
    {
      id: crypto.randomUUID(),
      author_id: sampleUsers[2].id,
      content: 'Hello everyone! Excited to connect with you all! 👋',
      visibility: 'public',
      likes: '[]',
      dislikes: '[]'
    }
  ];

  threads.forEach(thread => {
    db.run(`
      INSERT INTO threads (id, author_id, content, visibility, likes, dislikes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [thread.id, thread.author_id, thread.content, thread.visibility, thread.likes, thread.dislikes], (err) => {
      if (err) {
        console.error('Error inserting thread:', err);
      } else {
        console.log(`✅ Added thread`);
      }
    });
  });

  // Add a sample group
  const groupId = crypto.randomUUID();
  db.run(`
    INSERT INTO groups (id, name, description, is_private, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `, [groupId, 'General Discussion', 'A place for general conversations', 0, sampleUsers[0].id], (err) => {
    if (err) {
      console.error('Error inserting group:', err);
    } else {
      console.log(`✅ Added group: General Discussion`);
    }
  });

  // Add some notifications
  db.run(`
    INSERT INTO notifications (id, user_id, type, message, created_at, is_read)
    VALUES (?, ?, ?, ?, datetime('now'), ?)
  `, [crypto.randomUUID(), sampleUsers[0].id, 'welcome', 'Welcome to DomuGrauds!', 0], (err) => {
    if (!err) console.log(`✅ Added notification`);
  });
});

db.close((err) => {
  if (err) {
    console.error('❌ Error closing database:', err);
    process.exit(1);
  } else {
    console.log('✅ Database initialization complete!');
    process.exit(0);
  }
});

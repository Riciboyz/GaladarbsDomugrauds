// Database initialization script
const fs = require('fs');
const path = require('path');
const db = require('./db');

const initializeDatabase = async () => {
  try {
    console.log('🔄 Initializing database...');
    
    // Initialize database connection
    db.init();
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'sqlite-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.query(statement);
        } catch (error) {
          // Ignore "table already exists" errors
          if (!error.message.includes('already exists') && !error.message.includes('duplicate column name')) {
            console.error('Schema error:', error.message);
            // Don't throw error, just log it
          }
        }
      }
    }
    
    console.log('✅ Database initialized successfully');
    
    // Add sample data if tables are empty
    await addSampleDataIfEmpty();
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

const addSampleDataIfEmpty = async () => {
  try {
    // Check if users table is empty
    const usersResult = await db.query('SELECT COUNT(*) as count FROM users');
    const userCount = usersResult.rows[0].count;
    
    if (userCount === 0) {
      console.log('🔄 Adding sample data...');
      
      // Add sample users
      const sampleUsers = [
        {
          id: '1',
          email: 'testuser1@example.com',
          username: 'testuser1',
          display_name: 'Test User 1',
          bio: 'This is a test user account',
          password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJguGdRGG' // password123
        },
        {
          id: '2',
          email: 'testuser2@example.com',
          username: 'testuser2',
          display_name: 'Test User 2',
          bio: 'Another test user account',
          password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJguGdRGG' // password123
        }
      ];
      
      for (const user of sampleUsers) {
        await db.query(`
          INSERT INTO users (id, email, username, display_name, bio, password_hash)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [user.id, user.email, user.username, user.display_name, user.bio, user.password_hash]);
      }
      
      // Add sample threads
      await db.query(`
        INSERT INTO threads (id, author_id, content, visibility)
        VALUES 
        ('1', '1', 'Welcome to the Threads app! This is my first post.', 'public'),
        ('2', '2', 'Hello everyone! Excited to be here and connect with you all.', 'public'),
        ('3', '1', 'Just had an amazing day working on this project! 🚀', 'public')
      `);
      
      console.log('✅ Sample data added successfully');
    }
  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  }
};

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('✅ Database setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase, addSampleDataIfEmpty };

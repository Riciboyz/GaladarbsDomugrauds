#!/usr/bin/env node

// Authentication database migration script
const fs = require('fs');
const path = require('path');
const db = require('./sqlite-config');

async function runAuthMigrations() {
  console.log('🚀 Starting authentication database setup...');
  
  try {
    // Read and execute auth schema
    console.log('📝 Creating authentication schema...');
    const schemaPath = path.join(__dirname, 'auth-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schemaSQL.split(';').filter(stmt => stmt.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await db.query(statement);
      }
    }
    
    console.log('✅ Authentication schema created successfully');
    console.log('🎉 Authentication database setup completed!');
    console.log('📁 Database file: threads_app.db');
    console.log('🔐 Users can now register and login with secure passwords');
    
  } catch (error) {
    console.error('❌ Authentication setup failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runAuthMigrations();
}

module.exports = { runAuthMigrations };

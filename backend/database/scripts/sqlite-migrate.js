#!/usr/bin/env node

// SQLite migration script (no installation required)
const fs = require('fs');
const path = require('path');
const db = require('./sqlite-config');

async function runSQLiteMigrations() {
  console.log('🚀 Starting SQLite database setup...');
  
  try {
    // Read and execute schema
    console.log('📝 Creating database schema...');
    const schemaPath = path.join(__dirname, 'sqlite-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schemaSQL.split(';').filter(stmt => stmt.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await db.query(statement);
      }
    }
    
    console.log('✅ Database schema created successfully');
    
    // Read and execute sample data
    console.log('📝 Inserting sample data...');
    const sampleDataPath = path.join(__dirname, 'sqlite-sample-data.sql');
    const sampleDataSQL = fs.readFileSync(sampleDataPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const dataStatements = sampleDataSQL.split(';').filter(stmt => stmt.trim());
    for (const statement of dataStatements) {
      if (statement.trim()) {
        await db.query(statement);
      }
    }
    
    console.log('✅ Sample data inserted successfully');
    console.log('🎉 SQLite database setup completed!');
    console.log('📁 Database file created: threads_app.db');
    
  } catch (error) {
    console.error('❌ SQLite setup failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runSQLiteMigrations();
}

module.exports = { runSQLiteMigrations };

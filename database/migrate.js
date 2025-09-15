#!/usr/bin/env node

// Database migration script
const fs = require('fs');
const path = require('path');
const db = require('./config');

async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  
  try {
    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`📁 Found ${migrationFiles.length} migration files`);
    
    // Create migrations table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get already executed migrations
    const executedMigrations = await db.query('SELECT filename FROM migrations');
    const executedFilenames = executedMigrations.rows.map(row => row.filename);
    
    // Run pending migrations
    for (const filename of migrationFiles) {
      if (!executedFilenames.includes(filename)) {
        console.log(`📝 Running migration: ${filename}`);
        
        const migrationPath = path.join(migrationsDir, filename);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute migration
        await db.query(migrationSQL);
        
        // Record migration as executed
        await db.query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);
        
        console.log(`✅ Migration ${filename} completed`);
      } else {
        console.log(`⏭️  Migration ${filename} already executed, skipping`);
      }
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };

// Database migration script
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Create database file in project root
const dbPath = path.join(process.cwd(), 'threads_app.db');

console.log('🔄 Starting database migration...');

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

// Read and execute the SQLite schema
const schemaPath = path.join(process.cwd(), 'database', 'sqlite-schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Split by semicolon and filter out empty statements
const statements = schema.split(';').filter(stmt => stmt.trim());

// Separate CREATE TABLE statements from others
const createTableStatements = statements.filter(stmt => 
  stmt.trim().toUpperCase().includes('CREATE TABLE')
);
const otherStatements = statements.filter(stmt => 
  !stmt.trim().toUpperCase().includes('CREATE TABLE')
);

console.log(`📝 Found ${createTableStatements.length} CREATE TABLE statements`);
console.log(`📝 Found ${otherStatements.length} other statements`);

let completed = 0;
let total = statements.length;

// First, execute all CREATE TABLE statements
console.log('🏗️ Creating tables...');
createTableStatements.forEach((statement, index) => {
  db.run(statement, (err) => {
    if (err) {
      console.error(`❌ Error creating table ${index + 1}:`, err.message);
      console.error('Statement:', statement);
    } else {
      completed++;
      console.log(`✅ Table ${index + 1}/${createTableStatements.length} created successfully`);
    }
    
    if (completed === createTableStatements.length) {
      // Now execute other statements (indexes, triggers, etc.)
      console.log('🔧 Creating indexes and triggers...');
      let otherCompleted = 0;
      
      otherStatements.forEach((statement, index) => {
        if (statement.trim()) {
          db.run(statement, (err) => {
            if (err) {
              console.error(`❌ Error executing statement ${index + 1}:`, err.message);
              console.error('Statement:', statement);
            } else {
              otherCompleted++;
              console.log(`✅ Statement ${index + 1}/${otherStatements.length} executed successfully`);
            }
            
            if (otherCompleted === otherStatements.length) {
              console.log('🎉 Database migration completed successfully!');
              db.close((err) => {
                if (err) {
                  console.error('❌ Error closing database:', err.message);
                } else {
                  console.log('✅ Database connection closed');
                }
                process.exit(0);
              });
            }
          });
        } else {
          otherCompleted++;
          if (otherCompleted === otherStatements.length) {
            console.log('🎉 Database migration completed successfully!');
            db.close((err) => {
              if (err) {
                console.error('❌ Error closing database:', err.message);
              } else {
                console.log('✅ Database connection closed');
              }
              process.exit(0);
            });
          }
        }
      });
    }
  });
});

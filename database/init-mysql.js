#!/usr/bin/env node

/**
 * MySQL Database Initialization Script
 * This script initializes the MySQL database with the schema and sample data
 */

const { initializeDatabase } = require('./mysql-config');

async function main() {
  try {
    console.log('🚀 Starting MySQL database initialization...');
    
    await initializeDatabase();
    
    console.log('✅ Database initialization completed successfully!');
    console.log('📊 Database is ready for the Threads app');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start the application: npm run dev');
    console.log('2. Open http://localhost:3000');
    console.log('3. Register a new account');
    console.log('4. Start using the Threads app!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:');
    console.error(error.message);
    console.error('');
    console.error('Please check:');
    console.error('1. MySQL is running');
    console.error('2. Database credentials are correct in .env.local');
    console.error('3. Database "threads_app" exists');
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = main;

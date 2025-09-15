#!/usr/bin/env node

// Reset authentication database
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(process.cwd(), 'auth-users.json');

console.log('🔄 Resetting authentication database...');

try {
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
    console.log('✅ Authentication database reset successfully!');
    console.log('📁 Deleted file: auth-users.json');
  } else {
    console.log('ℹ️  No authentication database found to reset');
  }
  
  console.log('\n🎯 Next steps:');
  console.log('1. Restart your development server: npm run dev');
  console.log('2. Register a new account');
  console.log('3. Login with the same credentials');
  
} catch (error) {
  console.error('❌ Error resetting database:', error);
}

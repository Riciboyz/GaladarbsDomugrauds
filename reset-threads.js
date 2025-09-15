#!/usr/bin/env node

// Reset threads database
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(process.cwd(), 'threads-data.json');

console.log('🔄 Resetting threads database...');

try {
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
    console.log('✅ Threads database reset successfully!');
    console.log('📁 Deleted file: threads-data.json');
  } else {
    console.log('ℹ️  No threads database found to reset');
  }
  
  console.log('\n🎯 Next steps:');
  console.log('1. Restart your development server: npm run dev');
  console.log('2. Create a new thread');
  console.log('3. Check if it appears in real-time');
  
} catch (error) {
  console.error('❌ Error resetting threads database:', error);
}

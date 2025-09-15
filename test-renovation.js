#!/usr/bin/env node

// Simple test script to verify the renovated application
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Threads App Renovation...\n');

// Test files existence
const testFiles = [
  'app/contexts/UserContext.tsx',
  'app/contexts/ThreadContext.tsx',
  'app/contexts/GroupContext.tsx',
  'app/contexts/NotificationContext.tsx',
  'app/contexts/TopicDayContext.tsx',
  'app/contexts/ToastContext.tsx',
  'app/providers-new.tsx',
  'app/page-new.tsx',
  'app/layout-new.tsx',
  'app/components/MainApp-new.tsx',
  'app/components/AuthPage-new.tsx',
  'app/api/auth/db.js',
  'app/api/auth/login-new/route.ts',
  'app/api/auth/register-new/route.ts',
  'app/api/auth/me-new/route.ts',
  'app/api/auth/logout-new/route.ts',
  'app/api/threads-new/route.ts',
  'app/api/threads-new/db.js',
  'app/api/threads-new/search/route.ts',
  'app/api/users-new/route.ts',
  'app/api/users-new/follow/route.ts',
  'database/db.js',
  'database/init.js',
  'package-new.json',
  'README-new.md'
];

let allFilesExist = true;

console.log('📁 Checking renovated files...');
testFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

console.log('\n📊 Test Results:');
if (allFilesExist) {
  console.log('🎉 All renovated files are present!');
  console.log('\n🚀 Ready for deployment! Run:');
  console.log('   ./deploy-renovation.sh');
} else {
  console.log('❌ Some files are missing. Please check the renovation process.');
}

// Test database initialization
console.log('\n🗄️ Testing database initialization...');
try {
  const db = require('./database/db');
  db.init();
  console.log('✅ Database connection successful');
  
  // Test if we can create tables
  const { initializeDatabase } = require('./database/init');
  initializeDatabase().then(() => {
    console.log('✅ Database initialization successful');
    console.log('\n📋 Sample data available:');
    console.log('   Email: testuser1@example.com');
    console.log('   Password: password123');
    
    db.close();
  }).catch(error => {
    console.log('❌ Database initialization failed:', error.message);
  });
  
} catch (error) {
  console.log('❌ Database test failed:', error.message);
}

console.log('\n🏁 Test completed!');

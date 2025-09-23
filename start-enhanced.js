#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Enhanced Threads App...\n');

// Check if database exists
const fs = require('fs');
const dbPath = path.join(process.cwd(), 'threads_app.db');

if (!fs.existsSync(dbPath)) {
  console.log('📊 Database not found, initializing...');
  
  // Initialize database
  const initProcess = spawn('node', ['database/init-enhanced.js'], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  initProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Database initialized successfully\n');
      startServers();
    } else {
      console.error('❌ Database initialization failed');
      process.exit(1);
    }
  });
} else {
  console.log('✅ Database found, starting servers...\n');
  startServers();
}

function startServers() {
  console.log('🌐 Starting Next.js development server...');
  const nextProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  console.log('🔌 Starting Enhanced WebSocket server...');
  const wsProcess = spawn('node', ['websocket-server-enhanced.js'], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    
    nextProcess.kill('SIGINT');
    wsProcess.kill('SIGINT');
    
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  });

  // Handle process errors
  nextProcess.on('error', (err) => {
    console.error('❌ Next.js process error:', err);
  });

  wsProcess.on('error', (err) => {
    console.error('❌ WebSocket process error:', err);
  });

  nextProcess.on('close', (code) => {
    console.log(`📱 Next.js process exited with code ${code}`);
  });

  wsProcess.on('close', (code) => {
    console.log(`🔌 WebSocket process exited with code ${code}`);
  });

  console.log('\n🎉 Enhanced Threads App is running!');
  console.log('📱 Frontend: http://localhost:3000');
  console.log('🔌 WebSocket: ws://localhost:3001');
  console.log('📊 Database: SQLite (threads_app.db)');
  console.log('\nPress Ctrl+C to stop all servers\n');
}

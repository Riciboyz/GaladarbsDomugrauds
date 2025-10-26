#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Threads App with Real-Time Features...\n');

// Start Next.js development server
const nextProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Start WebSocket server
const wsProcess = spawn('node', ['websocket-server.js'], {
  stdio: 'inherit',
  shell: true
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  
  nextProcess.kill('SIGINT');
  wsProcess.kill('SIGINT');
  
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

// Handle process errors
nextProcess.on('error', (error) => {
  console.error('Next.js process error:', error);
});

wsProcess.on('error', (error) => {
  console.error('WebSocket process error:', error);
});

console.log('✅ Both servers are starting...');
console.log('📱 App: http://localhost:3000');
console.log('🔌 WebSocket: ws://localhost:3001');
console.log('\nPress Ctrl+C to stop both servers');

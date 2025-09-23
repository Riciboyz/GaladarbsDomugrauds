const WebSocket = require('ws');

console.log('🧪 Testing WebSocket server...');

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');
  
  // Test authentication
  ws.send(JSON.stringify({
    type: 'authenticate',
    data: { token: 'test-token' }
  }));
  
  // Test ping
  ws.send(JSON.stringify({
    type: 'ping',
    data: { timestamp: Date.now() }
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('📨 Received:', message.type, message.data);
  
  if (message.type === 'pong') {
    console.log('✅ Ping/Pong test successful');
    ws.close();
  }
});

ws.on('close', () => {
  console.log('🔌 WebSocket connection closed');
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

// Timeout after 5 seconds
setTimeout(() => {
  console.log('⏰ Test timeout');
  ws.close();
  process.exit(1);
}, 5000);

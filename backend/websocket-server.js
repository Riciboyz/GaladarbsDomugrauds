const WebSocket = require('ws');

// Create WebSocket server
const wss = new WebSocket.Server({ port: 3001 });

console.log('🚀 WebSocket server running on ws://localhost:3001');

wss.on('connection', (ws) => {
  console.log('🔌 New client connected');
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    data: { message: 'Connected to real-time updates' }
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 Received message:', data);
      
      // Broadcast to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Keep server alive
process.on('SIGINT', () => {
  console.log('🛑 Shutting down WebSocket server...');
  wss.close(() => {
    process.exit(0);
  });
});

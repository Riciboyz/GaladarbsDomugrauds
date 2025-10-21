const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const http = require('http');

// Database configuration
const dbPath = path.join(process.cwd(), 'threads_app.db');

// Create HTTP server for WebSocket and API endpoints
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('📨 Received API message:', data.type);
        
        // Broadcast to all connected WebSocket clients
        console.log('📡 Broadcasting to', userConnections.size, 'connected users');
        broadcastToAll(data);
        
        // If it's a notification, also broadcast to specific user
        if (data.type === 'notification' && data.userId) {
          console.log('📬 Broadcasting notification to user:', data.userId);
          broadcastToUser(data.userId, data);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('Error processing API message:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  perMessageDeflate: false // Disable compression for better performance
});

// Heartbeat to detect broken connections
function noop() {}
function heartbeat() {
  this.isAlive = true;
}

// Start server
server.listen(3001, () => {
  console.log('🚀 Enhanced WebSocket server running on ws://localhost:3001');
  console.log('📡 HTTP API endpoint available at http://localhost:3001');
});

// Store active connections by user ID
const userConnections = new Map();
const groupConnections = new Map(); // groupId -> Set of user connections

// Database helper functions
const db = {
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      const database = new sqlite3.Database(dbPath);
      database.all(sql, params, (err, rows) => {
        if (err) {
          console.error('❌ Database query error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
        database.close();
      });
    });
  },

  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      const database = new sqlite3.Database(dbPath);
      database.run(sql, params, function(err) {
        if (err) {
          console.error('❌ Database run error:', err);
          reject(err);
        } else {
          resolve({ 
            lastID: this.lastID, 
            changes: this.changes 
          });
        }
        database.close();
      });
    });
  }
};

// JWT verification
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (error) {
    return null;
  }
}

// Get user info from database
async function getUserInfo(userId) {
  try {
    const users = await db.query('SELECT id, username, display_name, avatar FROM users WHERE id = ?', [userId]);
    return users[0] || null;
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
}

// Get group members
async function getGroupMembers(groupId) {
  try {
    const groups = await db.query('SELECT members FROM groups WHERE id = ? AND is_deleted = 0', [groupId]);
    if (groups.length === 0) return [];
    return JSON.parse(groups[0].members || '[]');
  } catch (error) {
    console.error('Error getting group members:', error);
    return [];
  }
}

// Broadcast message to group members
function broadcastToGroup(groupId, message, excludeUserId = null) {
  const groupConn = groupConnections.get(groupId);
  if (!groupConn) return;

  groupConn.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN && ws.userId !== excludeUserId) {
      ws.send(JSON.stringify(message));
    }
  });
}

// Broadcast to all connected users
function broadcastToAll(message, excludeUserId = null) {
  console.log('📡 Broadcasting message:', message.type, 'to', userConnections.size, 'users');
  let sentCount = 0;
  
  userConnections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN && ws.userId !== excludeUserId) {
      try {
        ws.send(JSON.stringify(message));
        sentCount++;
      } catch (error) {
        console.error('❌ Error sending message to user:', error);
      }
    }
  });
  
  console.log('✅ Sent to', sentCount, 'users');
}

// Broadcast thread updates to all connected users
function broadcastThreadUpdate(type, data, excludeUserId = null) {
  const message = {
    type: type,
    data: data
  };
  
  console.log(`📝 Broadcasting thread ${type}:`, data.id || data.threadId);
  broadcastToAll(message, excludeUserId);
}

// Handle new connection
wss.on('connection', async (ws, req) => {
  console.log('🔌 New client connected');
  
  // Create anonymous connection initially
  ws.userId = 'anonymous-' + Date.now();
  ws.username = 'Anonymous';
  userConnections.set(ws.userId, ws);

  // Mark alive and listen for pongs
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    data: { message: 'Connected to real-time updates' }
  }));

  // Handle authentication
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 Received message:', data.type);

      switch (data.type) {
        case 'authenticate':
          await handleAuthentication(ws, data);
          break;
        
        case 'join_group':
          console.log('📨 WebSocket Server: Received join_group:', data);
          await handleJoinGroup(ws, data);
          break;
        
        case 'leave_group':
          await handleLeaveGroup(ws, data);
          break;
        
        case 'group_message':
          await handleGroupMessage(ws, data);
          break;
        
        case 'typing':
          await handleTyping(ws, data);
          break;
        
        case 'stop_typing':
          await handleStopTyping(ws, data);
          break;
        
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        
        case 'new_thread':
          // Broadcast new thread to all connected users
          console.log('📝 Broadcasting new thread:', data.data);
          broadcastThreadUpdate('new_thread', data.data, ws.userId);
          break;
        
        case 'thread_updated':
          // Broadcast thread update to all connected users
          console.log('📝 Broadcasting thread update:', data.data);
          broadcastThreadUpdate('thread_updated', data.data, ws.userId);
          break;
        
        case 'thread_deleted':
          // Broadcast thread deletion to all connected users
          console.log('📝 Broadcasting thread deletion:', data.data);
          broadcastThreadUpdate('thread_deleted', data.data, ws.userId);
          break;
        
        default:
          // Broadcast to all clients (legacy support)
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client !== ws) {
              client.send(JSON.stringify(data));
            }
          });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Invalid message format' }
      }));
    }
  });

  ws.on('close', () => {
    console.log('🔌 Client disconnected');
    handleDisconnection(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    handleDisconnection(ws);
  });
});

// Periodically ping clients and clean up dead sockets
const HEARTBEAT_INTERVAL_MS = 30000;
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      try { ws.terminate(); } catch (_) {}
      return;
    }
    ws.isAlive = false;
    try { ws.ping(noop); } catch (_) {}
  });
}, HEARTBEAT_INTERVAL_MS);

// Handle authentication
async function handleAuthentication(ws, data) {
  const { token } = data;
  
  console.log('🔐 Authentication attempt with token:', token ? 'present' : 'missing');
  
  if (!token) {
    console.log('❌ No token provided, keeping connection as anonymous');
    ws.userId = 'anonymous-' + Date.now();
    ws.username = 'Anonymous';
    userConnections.set(ws.userId, ws);
    ws.send(JSON.stringify({
      type: 'auth_error',
      data: { message: 'Authentication token required, but connection kept as anonymous' }
    }));
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    console.log('❌ Invalid token, keeping connection as anonymous');
    ws.userId = 'anonymous-' + Date.now();
    ws.username = 'Anonymous';
    userConnections.set(ws.userId, ws);
    ws.send(JSON.stringify({
      type: 'auth_error',
      data: { message: 'Invalid or expired token, but connection kept as anonymous' }
    }));
    return;
  }

  // Get user info
  const userInfo = await getUserInfo(decoded.id);
  if (!userInfo) {
    ws.send(JSON.stringify({
      type: 'auth_error',
      data: { message: 'User not found' }
    }));
    return;
  }

  // Store connection
  ws.userId = decoded.id;
  ws.userInfo = userInfo;
  userConnections.set(decoded.id, ws);

  ws.send(JSON.stringify({
    type: 'authenticated',
    data: { 
      user: userInfo,
      message: 'Successfully authenticated' 
    }
  }));

  console.log(`✅ User ${userInfo.username} authenticated`);
}

// Handle joining a group
async function handleJoinGroup(ws, data) {
  console.log('🔍 WebSocket Server: handleJoinGroup called with data:', data);
  console.log('🔍 WebSocket Server: ws.userId:', ws.userId);
  
  if (!ws.userId) {
    console.log('❌ WebSocket Server: No userId, sending auth error');
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Authentication required' }
    }));
    return;
  }

  const { groupId } = data;
  console.log('🔍 WebSocket Server: groupId from data:', groupId);
  if (!groupId) {
    console.log('❌ WebSocket Server: No groupId, sending Group ID required error');
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Group ID required' }
    }));
    return;
  }

  // Check if user is member of the group
  const members = await getGroupMembers(groupId);
  if (!members.includes(ws.userId)) {
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'You are not a member of this group' }
    }));
    return;
  }

  // Add to group connections
  if (!groupConnections.has(groupId)) {
    groupConnections.set(groupId, new Set());
  }
  groupConnections.get(groupId).add(ws);

  ws.send(JSON.stringify({
    type: 'joined_group',
    data: { groupId, message: 'Successfully joined group' }
  }));

  console.log(`✅ User ${ws.userInfo.username} joined group ${groupId}`);
}

// Handle leaving a group
async function handleLeaveGroup(ws, data) {
  const { groupId } = data;
  if (!groupId) return;

  const groupConn = groupConnections.get(groupId);
  if (groupConn) {
    groupConn.delete(ws);
    if (groupConn.size === 0) {
      groupConnections.delete(groupId);
    }
  }

  ws.send(JSON.stringify({
    type: 'left_group',
    data: { groupId, message: 'Left group' }
  }));

  console.log(`✅ User ${ws.userInfo?.username} left group ${groupId}`);
}

// Handle group message
async function handleGroupMessage(ws, data) {
  // Ensure we have an authenticated user; if anonymous and token provided, upgrade
  if (!ws.userId || String(ws.userId).startsWith('anonymous')) {
    const maybeToken = data?.token;
    const decoded = maybeToken ? verifyToken(maybeToken) : null;
    if (decoded) {
      ws.userId = decoded.id;
      ws.userInfo = await getUserInfo(decoded.id);
      userConnections.set(ws.userId, ws);
    }
  }
  if (!ws.userId) {
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Authentication required' }
    }));
    return;
  }

  const { groupId, content, messageType = 'text', attachmentUrl } = data;
  
  if (!groupId || !content) {
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Group ID and content required' }
    }));
    return;
  }

  // Check if user is member of the group
  const members = await getGroupMembers(groupId);
  if (!members.includes(ws.userId)) {
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'You are not a member of this group' }
    }));
    return;
  }

  // Save message to database
  try {
    // Izveidojam unikālu ziņas ID (timestamp + nejauša rinda)
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Ierakstām ziņu datubāzē tabulā group_messages
    await db.run(`
      INSERT INTO group_messages (id, group_id, sender_id, content, message_type, attachment_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [messageId, groupId, ws.userId, content, messageType, attachmentUrl]);

    // Get user info if not already available
    if (!ws.userInfo) {
      ws.userInfo = await getUserInfo(ws.userId);
    }

    // Sagatavojam WS ziņas objektu, ko sūtīsim klientiem
    const message = {
      id: messageId, // ziņas ID
      group_id: groupId, // grupas ID
      sender_id: ws.userId, // sūtītāja ID
      content: content, // teksta saturs
      message_type: messageType, // 'text' | 'image' | 'file'
      attachment_url: attachmentUrl, // ja ir fails/attēls – tā saite
      created_at: new Date().toISOString(), // izveides laiks ISO formātā
      username: ws.userInfo?.username || 'Unknown', // sūtītāja lietotājvārds
      display_name: ws.userInfo?.display_name || 'Unknown User', // sūtītāja vārds uzvārds / display name
      avatar: ws.userInfo?.avatar || null // sūtītāja avatārs
    };

    // Izveidojam WS ziņojumu payload
    const payload = { type: 'group_message', data: message };
    console.log('📨 WebSocket Server: Broadcasting message:', payload);
    // Sūtām visiem šīs grupas dalībniekiem (izņemot sūtītāju)
    broadcastToGroup(groupId, payload, ws.userId);
    // Papildus – sūtām visiem savienojumiem kā drošības tīklu; klienti filtrē pēc group_id
    broadcastToAll(payload, ws.userId);

    // Atsūtām apstiprinājumu pašam sūtītājam, lai UI var nekavējoties atzīmēt piegādi
    ws.send(JSON.stringify({
      type: 'message_sent',
      data: { messageId, message }
    }));

    console.log(`📨 Message sent in group ${groupId} by ${ws.userInfo.username}`);

  } catch (error) {
    console.error('Error saving message:', error);
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Failed to send message' }
    }));
  }
}

// Handle typing indicator
async function handleTyping(ws, data) {
  if (!ws.userId) return;

  const { groupId } = data;
  if (!groupId) return;

  // Check if user is member of the group
  const members = await getGroupMembers(groupId);
  if (!members.includes(ws.userId)) return;

  // Broadcast typing indicator to other group members
  broadcastToGroup(groupId, {
    type: 'user_typing',
    data: {
      groupId,
      userId: ws.userId,
      username: ws.userInfo.username,
      displayName: ws.userInfo.display_name
    }
  }, ws.userId);
}

// Handle stop typing indicator
async function handleStopTyping(ws, data) {
  if (!ws.userId) return;

  const { groupId } = data;
  if (!groupId) return;

  // Check if user is member of the group
  const members = await getGroupMembers(groupId);
  if (!members.includes(ws.userId)) return;

  // Broadcast stop typing indicator to other group members
  broadcastToGroup(groupId, {
    type: 'user_stopped_typing',
    data: {
      groupId,
      userId: ws.userId,
      username: ws.userInfo.username
    }
  }, ws.userId);
}

// Handle disconnection
function handleDisconnection(ws) {
  if (ws.userId) {
    userConnections.delete(ws.userId);
    
    // Remove from all groups
    groupConnections.forEach((groupConn, groupId) => {
      groupConn.delete(ws);
      if (groupConn.size === 0) {
        groupConnections.delete(groupId);
      }
    });

    console.log(`👋 User ${ws.userInfo?.username} disconnected`);
  }
}

// Keep server alive
process.on('SIGINT', () => {
  console.log('🛑 Shutting down WebSocket server...');
  server.close(() => {
    process.exit(0);
  });
});

// Health check endpoint
setInterval(() => {
  console.log(`📊 Active connections: ${userConnections.size}, Groups: ${groupConnections.size}`);
}, 30000); // Log every 30 seconds

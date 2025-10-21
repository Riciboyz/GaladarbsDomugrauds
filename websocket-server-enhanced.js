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
        
        // Handle different message types with proper routing
        handleAPIMessage(data, res);
        
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
const messageCache = new Map(); // Cache recent messages to prevent duplicates

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

// Check if message is duplicate
function isDuplicateMessage(messageId) {
  if (messageCache.has(messageId)) {
    return true;
  }
  
  // Add to cache with TTL
  messageCache.set(messageId, Date.now());
  
  // Clean up old cache entries (older than 5 minutes)
  const now = Date.now();
  for (const [id, timestamp] of messageCache.entries()) {
    if (now - timestamp > 300000) { // 5 minutes
      messageCache.delete(id);
    }
  }
  
  return false;
}

// Broadcast message to group members (FIXED: No duplicate broadcasting)
function broadcastToGroup(groupId, message, excludeUserId = null) {
  console.log('🔍 Broadcasting to group:', groupId);
  console.log('🔍 Group connections map:', Array.from(groupConnections.keys()));
  
  const groupConn = groupConnections.get(groupId);
  console.log('🔍 Group connection set:', groupConn);
  
  if (!groupConn) {
    console.log('❌ No group connections found for group:', groupId);
    return;
  }

  let sentCount = 0;
  groupConn.forEach(ws => {
    console.log('🔍 Checking connection:', ws.userId, 'readyState:', ws.readyState);
    if (ws.readyState === WebSocket.OPEN && ws.userId !== excludeUserId) {
      try {
        ws.send(JSON.stringify(message));
        sentCount++;
        console.log('✅ Sent message to:', ws.userId);
      } catch (error) {
        console.error('❌ Error sending message to group member:', error);
      }
    }
  });
  
  console.log(`📡 Broadcasted to ${sentCount} group members in group ${groupId}`);
}

// Broadcast to all connected users (FIXED: Only for global events)
function broadcastToAll(message, excludeUserId = null) {
  console.log('📡 Broadcasting global message:', message.type, 'to', userConnections.size, 'users');
  let sentCount = 0;
  
  userConnections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN && ws.userId !== excludeUserId) {
      try {
        ws.send(JSON.stringify(message));
        sentCount++;
      } catch (error) {
        console.error('❌ Error sending global message to user:', error);
      }
    }
  });
  
  console.log('✅ Sent global message to', sentCount, 'users');
}

// Handle API messages from Next.js routes
async function handleAPIMessage(data, res) {
  try {
    switch (data.type) {
      case 'group_message':
        // Handle group message from API
        await handleAPIGroupMessage(data.data);
        break;
        
      case 'group_post_created':
        // Broadcast new group post to group members
        console.log('📝 Broadcasting group post:', data.data);
        broadcastToGroup(data.data.group_id, {
          type: 'group_post_created',
          data: data.data
        });
        break;
        
      case 'group_post_deleted':
        // Broadcast group post deletion to group members
        console.log('📝 Broadcasting group post deletion:', data.data);
        broadcastToGroup(data.data.groupId, {
          type: 'group_post_deleted',
          data: data.data
        });
        break;
        
      case 'group_post_comment':
        // Broadcast new comment to group members
        console.log('💬 Broadcasting group post comment:', data.data);
        broadcastToGroup(data.data.group_id, {
          type: 'group_post_comment',
          data: data.data
        });
        break;
        
      case 'group_post_comment_deleted':
        // Broadcast comment deletion to group members
        console.log('💬 Broadcasting comment deletion:', data.data);
        const groupId = await getPostGroupId(data.data.postId);
        if (groupId) {
          broadcastToGroup(groupId, {
            type: 'group_post_comment_deleted',
            data: data.data
          });
        }
        break;
        
      case 'group_post_reaction':
        // Broadcast reaction to group members
        console.log('👍 Broadcasting group post reaction:', data.data);
        broadcastToGroup(data.data.group_id, {
          type: 'group_post_reaction',
          data: data.data
        });
        break;
        
      case 'group_role_assigned':
        // Broadcast role assignment to group members
        console.log('👑 Broadcasting role assignment:', data.data);
        broadcastToGroup(data.data.group_id, {
          type: 'group_role_assigned',
          data: data.data
        });
        break;
        
      case 'notification':
        // Handle notifications
        if (data.userId) {
          console.log('📬 Broadcasting notification to user:', data.userId);
          broadcastToUser(data.userId, {
            type: 'notification',
            notification: data.notification
          });
        }
        break;
        
      default:
        console.log('📨 Unknown API message type:', data.type);
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  } catch (error) {
    console.error('Error handling API message:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

// Handle group message from API (FIXED: No duplicate database insertion)
async function handleAPIGroupMessage(messageData) {
  try {
    // Check if message is duplicate
    if (isDuplicateMessage(messageData.id)) {
      console.log('🚫 Duplicate message detected, skipping:', messageData.id);
      return;
    }
    
    // Get group members
    const members = await getGroupMembers(messageData.group_id);
    if (members.length === 0) {
      console.log('❌ No members found for group:', messageData.group_id);
      return;
    }
    
    // Broadcast to group members only (FIXED: No duplicate broadcasting)
    const message = {
      type: 'group_message',
      data: messageData
    };
    
    broadcastToGroup(messageData.group_id, message);
    console.log(`📨 API Group message broadcasted to group ${messageData.group_id}`);
    
  } catch (error) {
    console.error('Error handling API group message:', error);
  }
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
        case 'register':
          console.log('📨 WebSocket Server: Received register:', data);
          await handleRegister(ws, data);
          break;
        
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
          broadcastToAll({
            type: 'new_thread',
            data: data.data
          }, ws.userId);
          break;
        
        case 'thread_updated':
          // Broadcast thread update to all connected users
          console.log('📝 Broadcasting thread update:', data.data);
          broadcastToAll({
            type: 'thread_updated',
            data: data.data
          }, ws.userId);
          break;
        
        case 'thread_deleted':
          // Broadcast thread deletion to all connected users
          console.log('📝 Broadcasting thread deletion:', data.data);
          broadcastToAll({
            type: 'thread_deleted',
            data: data.data
          }, ws.userId);
          break;
        
        case 'group_post_created':
          // Broadcast new group post to group members
          console.log('📝 Broadcasting group post:', data.data);
          broadcastToGroup(data.data.group_id, {
            type: 'group_post_created',
            data: data.data
          }, ws.userId);
          break;
        
        case 'group_post_deleted':
          // Broadcast group post deletion to group members
          console.log('📝 Broadcasting group post deletion:', data.data);
          broadcastToGroup(data.data.groupId, {
            type: 'group_post_deleted',
            data: data.data
          }, ws.userId);
          break;
        
        case 'group_post_comment':
          // Broadcast new comment to group members
          console.log('💬 Broadcasting group post comment:', data.data);
          broadcastToGroup(data.data.group_id, {
            type: 'group_post_comment',
            data: data.data
          }, ws.userId);
          break;
        
        case 'group_post_comment_deleted':
          // Broadcast comment deletion to group members
          console.log('💬 Broadcasting comment deletion:', data.data);
          // Get group ID from post
          getPostGroupId(data.data.postId).then(groupId => {
            if (groupId) {
              broadcastToGroup(groupId, {
                type: 'group_post_comment_deleted',
                data: data.data
              }, ws.userId);
            }
          });
          break;
        
        case 'group_post_reaction':
          // Broadcast reaction to group members
          console.log('👍 Broadcasting group post reaction:', data.data);
          broadcastToGroup(data.data.group_id, {
            type: 'group_post_reaction',
            data: data.data
          }, ws.userId);
          break;
        
        case 'group_role_assigned':
          // Broadcast role assignment to group members
          console.log('👑 Broadcasting role assignment:', data.data);
          broadcastToGroup(data.data.group_id, {
            type: 'group_role_assigned',
            data: data.data
          }, ws.userId);
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
// Handle user registration
async function handleRegister(ws, data) {
  console.log('🔐 Registering user:', data.userId);
  
  const { userId, token } = data;
  
  if (!userId) {
    console.log('❌ No userId provided');
    ws.send(JSON.stringify({
      type: 'register_error',
      data: { message: 'User ID required' }
    }));
    return;
  }
  
  // Store user connection
  ws.userId = userId;
  ws.username = `User-${userId.substring(0, 8)}`;
  
  // Get user info from database
  try {
    ws.userInfo = await getUserInfo(userId);
  } catch (error) {
    console.log('⚠️ Could not get user info, using fallback');
    ws.userInfo = {
      id: userId,
      username: ws.username,
      display_name: ws.username,
      avatar: null
    };
  }
  
  userConnections.set(userId, ws);
  
  console.log('✅ User registered successfully:', userId);
  console.log('📊 Active connections:', userConnections.size);
  
  // Send confirmation
  ws.send(JSON.stringify({
    type: 'registered',
    data: { 
      userId: userId,
      message: 'Registration successful' 
    }
  }));
}

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

  const groupId = data.data?.groupId || data.groupId;
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
  console.log('🔍 WebSocket Server: Group members:', members);
  console.log('🔍 WebSocket Server: Current user ID:', ws.userId);
  console.log('🔍 WebSocket Server: Is member?', members.includes(ws.userId));
  
  if (!members.includes(ws.userId)) {
    console.log('❌ WebSocket Server: User not a member of group');
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'You are not a member of this group' }
    }));
    return;
  }

  // Add to group connections
  if (!groupConnections.has(groupId)) {
    groupConnections.set(groupId, new Set());
    console.log('🔍 Created new group connection set for:', groupId);
  }
  groupConnections.get(groupId).add(ws);
  console.log('🔍 Added user to group:', groupId, 'total connections:', groupConnections.get(groupId).size);

  ws.send(JSON.stringify({
    type: 'joined_group',
    data: { groupId, message: 'Successfully joined group' }
  }));

  console.log(`✅ User ${ws.userInfo?.username || ws.userId} joined group ${groupId}`);
}

// Handle leaving a group
async function handleLeaveGroup(ws, data) {
  const { groupId } = data.data || data;
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

// Handle group message (FIXED: No duplicate database insertion)
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

  const { groupId, content, messageType = 'text', attachmentUrl } = data.data || data;
  
  if (!groupId || !content) {
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Group ID and content required' }
    }));
    return;
  }

  // Check if user is member of the group
  const members = await getGroupMembers(groupId);
  console.log('🔍 WebSocket Server: Group members:', members);
  console.log('🔍 WebSocket Server: Current user ID:', ws.userId);
  console.log('🔍 WebSocket Server: Is member?', members.includes(ws.userId));
  
  if (!members.includes(ws.userId)) {
    console.log('❌ WebSocket Server: User not a member of group');
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'You are not a member of this group' }
    }));
    return;
  }

  // Save message to database
  try {
    // Generate unique message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Insert message into database
    await db.run(`
      INSERT INTO group_messages (id, group_id, sender_id, content, message_type, attachment_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [messageId, groupId, ws.userId, content, messageType, attachmentUrl]);

    // Get user info if not already available
    if (!ws.userInfo) {
      ws.userInfo = await getUserInfo(ws.userId);
    }

    // Prepare message object for broadcasting
    const message = {
      id: messageId,
      group_id: groupId,
      sender_id: ws.userId,
      content: content,
      message_type: messageType,
      attachment_url: attachmentUrl,
      created_at: new Date().toISOString(),
      username: ws.userInfo?.username || 'Unknown',
      display_name: ws.userInfo?.display_name || 'Unknown User',
      avatar: ws.userInfo?.avatar || null
    };

    // Broadcast to group members only (FIXED: No duplicate broadcasting)
    const payload = { type: 'group_message', data: message };
    console.log('📨 WebSocket Server: Broadcasting message:', payload);
    broadcastToGroup(groupId, payload, ws.userId);

    // Send confirmation to sender
    ws.send(JSON.stringify({
      type: 'message_sent',
      data: { messageId, message }
    }));

    console.log(`📨 Message sent in group ${groupId} by ${ws.userInfo?.username}`);

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

  const { groupId } = data.data || data;
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
      username: ws.userInfo?.username || ws.userId,
      displayName: ws.userInfo?.display_name || ws.userId
    }
  }, ws.userId);
}

// Handle stop typing indicator
async function handleStopTyping(ws, data) {
  if (!ws.userId) return;

  const { groupId } = data.data || data;
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
      username: ws.userInfo?.username || ws.userId
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

// Broadcast to specific user
function broadcastToUser(userId, message) {
  const userConnections = getUserConnections(userId);
  if (userConnections.length > 0) {
    console.log('📡 Broadcasting message to user:', userId, 'connections:', userConnections.length);
    userConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(message));
          console.log('✅ Sent to user:', userId);
        } catch (error) {
          console.error('❌ Error sending to user:', userId, error);
        }
      }
    });
  } else {
    console.log('⚠️ No connections found for user:', userId);
  }
}

// Broadcast to all connected users
function broadcastToAll(message) {
  console.log('📡 Broadcasting message to all users:', userConnections.size);
  userConnections.forEach((ws, userId) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
        console.log('✅ Sent to user:', userId);
      } catch (error) {
        console.error('❌ Error sending to user:', userId, error);
      }
    }
  });
}

// Get user connections
function getUserConnections(userId) {
  const connections = [];
  userConnections.forEach((ws, id) => {
    if (id === userId && ws.readyState === WebSocket.OPEN) {
      connections.push(ws);
    }
  });
  return connections;
}

// Get group ID from post ID
async function getPostGroupId(postId) {
  try {
    const posts = await db.query('SELECT group_id FROM group_posts WHERE id = ?', [postId]);
    return posts.length > 0 ? posts[0].group_id : null;
  } catch (error) {
    console.error('Error getting post group ID:', error);
    return null;
  }
}

// Health check endpoint
setInterval(() => {
  console.log(`📊 Active connections: ${userConnections.size}, Groups: ${groupConnections.size}`);
}, 30000); // Log every 30 seconds

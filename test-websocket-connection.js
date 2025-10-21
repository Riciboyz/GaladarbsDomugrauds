#!/usr/bin/env node

/**
 * WebSocket Server Connection Test
 * Pārbauda, vai WebSocket serveris darbojas un var saņemt notifikācijas
 */

const WebSocket = require('ws');
const fetch = require('node-fetch');

const WS_URL = 'ws://localhost:3001';
const API_URL = 'http://localhost:3000';

console.log('🔍 Pārbaudām WebSocket serveri...');

// Test WebSocket connection
function testWebSocketConnection() {
  return new Promise((resolve, reject) => {
    console.log('🔌 Mēģinām pieslēgties WebSocket serverim...');
    
    const ws = new WebSocket(WS_URL);
    
    ws.on('open', () => {
      console.log('✅ WebSocket savienojums veiksmīgs!');
      
      // Send test message
      ws.send(JSON.stringify({
        type: 'register',
        userId: 'test_user',
        token: 'test_token'
      }));
      
      setTimeout(() => {
        ws.close();
        resolve(true);
      }, 1000);
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket kļūda:', error.message);
      reject(error);
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      console.log('📨 Saņemts ziņojums:', message.type);
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket savienojuma timeout'));
    }, 5000);
  });
}

// Test API endpoint
async function testAPIEndpoint() {
  try {
    console.log('🌐 Pārbaudām API endpoint...');
    const response = await fetch(`${API_URL}/api/notifications`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      console.log('✅ API endpoint darbojas!');
      return true;
    } else {
      console.log('⚠️ API endpoint atbild ar statusu:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ API endpoint kļūda:', error.message);
    return false;
  }
}

// Test notification sending
async function testNotificationSending() {
  try {
    console.log('🔔 Testējam notifikāciju sūtīšanu...');
    
    const response = await fetch(`${API_URL}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'test',
        fromUserId: 'test_user_1',
        toUserId: 'test_user_2',
        message: 'Testa notifikācija'
      })
    });
    
    if (response.ok) {
      console.log('✅ Notifikācijas sūtīšana darbojas!');
      return true;
    } else {
      console.log('⚠️ Notifikācijas sūtīšana neizdevās:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Notifikācijas sūtīšanas kļūda:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Sākam WebSocket sistēmas testu...\n');
  
  const results = {
    websocket: false,
    api: false,
    notifications: false
  };
  
  try {
    // Test WebSocket
    results.websocket = await testWebSocketConnection();
  } catch (error) {
    console.error('❌ WebSocket tests neizdevās:', error.message);
  }
  
  try {
    // Test API
    results.api = await testAPIEndpoint();
  } catch (error) {
    console.error('❌ API tests neizdevās:', error.message);
  }
  
  try {
    // Test notifications
    results.notifications = await testNotificationSending();
  } catch (error) {
    console.error('❌ Notifikāciju tests neizdevās:', error.message);
  }
  
  // Print results
  console.log('\n📊 Testa Rezultāti:');
  console.log('==================');
  console.log(`WebSocket Server: ${results.websocket ? '✅ DARBOJAS' : '❌ NEDARBOJAS'}`);
  console.log(`API Endpoint: ${results.api ? '✅ DARBOJAS' : '❌ NEDARBOJAS'}`);
  console.log(`Notifikācijas: ${results.notifications ? '✅ DARBOJAS' : '❌ NEDARBOJAS'}`);
  
  if (results.websocket && results.api && results.notifications) {
    console.log('\n🎉 Visi testi izdevās! Reāllaika notifikāciju sistēma darbojas.');
  } else {
    console.log('\n⚠️ Daži testi neizdevās. Pārbaudiet:');
    if (!results.websocket) {
      console.log('- Palaidiet WebSocket serveri: node websocket-server-enhanced.js');
    }
    if (!results.api) {
      console.log('- Palaidiet Next.js aplikāciju: npm run dev');
    }
    if (!results.notifications) {
      console.log('- Pārbaudiet datubāzes savienojumu');
    }
  }
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };

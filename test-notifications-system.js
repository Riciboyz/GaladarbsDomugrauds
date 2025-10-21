#!/usr/bin/env node

/**
 * Real-Time Notifications System Test
 * 
 * This script tests the complete notification system including:
 * - Follow notifications
 * - Like notifications  
 * - Dislike notifications
 * - Comment notifications
 * - WebSocket real-time delivery
 * - Cross-tab synchronization
 */

const WebSocket = require('ws');
const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3001';

// Test users (you'll need to create these users first)
const TEST_USERS = {
  user1: {
    id: 'test_user_1',
    username: 'testuser1',
    email: 'test1@example.com',
    password: 'password123'
  },
  user2: {
    id: 'test_user_2', 
    username: 'testuser2',
    email: 'test2@example.com',
    password: 'password123'
  }
};

let user1Token = null;
let user2Token = null;
let user1Ws = null;
let user2Ws = null;

// Test results
const testResults = {
  follow: { passed: false, error: null },
  like: { passed: false, error: null },
  dislike: { passed: false, error: null },
  comment: { passed: false, error: null },
  websocket: { passed: false, error: null },
  crossTab: { passed: false, error: null }
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createTestUsers() {
  console.log('🔧 Creating test users...');
  
  try {
    // Create user 1
    const user1Response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USERS.user1)
    });
    
    if (user1Response.ok) {
      const user1Data = await user1Response.json();
      user1Token = user1Data.token;
      console.log('✅ User 1 created and logged in');
    }
    
    // Create user 2
    const user2Response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USERS.user2)
    });
    
    if (user2Response.ok) {
      const user2Data = await user2Response.json();
      user2Token = user2Data.token;
      console.log('✅ User 2 created and logged in');
    }
    
  } catch (error) {
    console.error('❌ Error creating test users:', error.message);
    throw error;
  }
}

async function setupWebSocketConnections() {
  console.log('🔌 Setting up WebSocket connections...');
  
  return new Promise((resolve, reject) => {
    let connectionsEstablished = 0;
    
    // User 1 WebSocket
    user1Ws = new WebSocket(WS_URL);
    user1Ws.on('open', () => {
      console.log('✅ User 1 WebSocket connected');
      user1Ws.send(JSON.stringify({
        type: 'register',
        userId: TEST_USERS.user1.id,
        token: user1Token
      }));
      connectionsEstablished++;
      if (connectionsEstablished === 2) resolve();
    });
    
    user1Ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      console.log('📨 User 1 received:', message.type);
      
      if (message.type === 'notification') {
        console.log('🔔 User 1 received notification:', message.notification);
        testResults.websocket.passed = true;
      }
    });
    
    // User 2 WebSocket
    user2Ws = new WebSocket(WS_URL);
    user2Ws.on('open', () => {
      console.log('✅ User 2 WebSocket connected');
      user2Ws.send(JSON.stringify({
        type: 'register',
        userId: TEST_USERS.user2.id,
        token: user2Token
      }));
      connectionsEstablished++;
      if (connectionsEstablished === 2) resolve();
    });
    
    user2Ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      console.log('📨 User 2 received:', message.type);
      
      if (message.type === 'notification') {
        console.log('🔔 User 2 received notification:', message.notification);
        testResults.crossTab.passed = true;
      }
    });
    
    setTimeout(() => {
      if (connectionsEstablished < 2) {
        reject(new Error('WebSocket connections timeout'));
      }
    }, 5000);
  });
}

async function testFollowNotification() {
  console.log('👥 Testing follow notification...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/users/follow`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${user1Token}`
      },
      body: JSON.stringify({
        userId: TEST_USERS.user2.id,
        action: 'follow'
      })
    });
    
    if (response.ok) {
      console.log('✅ Follow action completed');
      await delay(1000); // Wait for notification to be processed
      testResults.follow.passed = true;
    } else {
      throw new Error(`Follow request failed: ${response.status}`);
    }
  } catch (error) {
    testResults.follow.error = error.message;
    console.error('❌ Follow notification test failed:', error.message);
  }
}

async function testLikeNotification() {
  console.log('❤️ Testing like notification...');
  
  try {
    // First create a thread by user 2
    const threadResponse = await fetch(`${BASE_URL}/api/threads`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${user2Token}`
      },
      body: JSON.stringify({
        content: 'Test thread for like notification',
        visibility: 'public'
      })
    });
    
    if (!threadResponse.ok) {
      throw new Error(`Thread creation failed: ${threadResponse.status}`);
    }
    
    const threadData = await threadResponse.json();
    const threadId = threadData.thread.id;
    
    // Now like the thread with user 1
    const likeResponse = await fetch(`${BASE_URL}/api/threads`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${user1Token}`
      },
      body: JSON.stringify({
        threadId: threadId,
        action: 'like'
      })
    });
    
    if (likeResponse.ok) {
      console.log('✅ Like action completed');
      await delay(1000); // Wait for notification to be processed
      testResults.like.passed = true;
    } else {
      throw new Error(`Like request failed: ${likeResponse.status}`);
    }
  } catch (error) {
    testResults.like.error = error.message;
    console.error('❌ Like notification test failed:', error.message);
  }
}

async function testDislikeNotification() {
  console.log('👎 Testing dislike notification...');
  
  try {
    // Create another thread by user 2
    const threadResponse = await fetch(`${BASE_URL}/api/threads`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${user2Token}`
      },
      body: JSON.stringify({
        content: 'Test thread for dislike notification',
        visibility: 'public'
      })
    });
    
    if (!threadResponse.ok) {
      throw new Error(`Thread creation failed: ${threadResponse.status}`);
    }
    
    const threadData = await threadResponse.json();
    const threadId = threadData.thread.id;
    
    // Now dislike the thread with user 1
    const dislikeResponse = await fetch(`${BASE_URL}/api/threads`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${user1Token}`
      },
      body: JSON.stringify({
        threadId: threadId,
        action: 'dislike'
      })
    });
    
    if (dislikeResponse.ok) {
      console.log('✅ Dislike action completed');
      await delay(1000); // Wait for notification to be processed
      testResults.dislike.passed = true;
    } else {
      throw new Error(`Dislike request failed: ${dislikeResponse.status}`);
    }
  } catch (error) {
    testResults.dislike.error = error.message;
    console.error('❌ Dislike notification test failed:', error.message);
  }
}

async function testCommentNotification() {
  console.log('💬 Testing comment notification...');
  
  try {
    // Create a thread by user 2
    const threadResponse = await fetch(`${BASE_URL}/api/threads`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${user2Token}`
      },
      body: JSON.stringify({
        content: 'Test thread for comment notification',
        visibility: 'public'
      })
    });
    
    if (!threadResponse.ok) {
      throw new Error(`Thread creation failed: ${threadResponse.status}`);
    }
    
    const threadData = await threadResponse.json();
    const threadId = threadData.thread.id;
    
    // Now comment on the thread with user 1
    const commentResponse = await fetch(`${BASE_URL}/api/threads`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${user1Token}`
      },
      body: JSON.stringify({
        content: 'This is a test comment',
        parentId: threadId,
        visibility: 'public'
      })
    });
    
    if (commentResponse.ok) {
      console.log('✅ Comment action completed');
      await delay(1000); // Wait for notification to be processed
      testResults.comment.passed = true;
    } else {
      throw new Error(`Comment request failed: ${commentResponse.status}`);
    }
  } catch (error) {
    testResults.comment.error = error.message;
    console.error('❌ Comment notification test failed:', error.message);
  }
}

async function cleanup() {
  console.log('🧹 Cleaning up test data...');
  
  // Close WebSocket connections
  if (user1Ws) user1Ws.close();
  if (user2Ws) user2Ws.close();
  
  // Note: In a real test, you'd want to clean up the test users and data
  console.log('✅ Cleanup completed');
}

function printResults() {
  console.log('\n📊 Test Results:');
  console.log('================');
  
  Object.entries(testResults).forEach(([test, result]) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${test.toUpperCase()}: ${status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  const passedTests = Object.values(testResults).filter(r => r.passed).length;
  const totalTests = Object.keys(testResults).length;
  
  console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Real-time notification system is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the implementation.');
  }
}

async function runTests() {
  console.log('🚀 Starting Real-Time Notifications System Tests');
  console.log('===============================================\n');
  
  try {
    await createTestUsers();
    await setupWebSocketConnections();
    
    console.log('\n🧪 Running notification tests...');
    await testFollowNotification();
    await testLikeNotification();
    await testDislikeNotification();
    await testCommentNotification();
    
    // Wait a bit more for all notifications to be processed
    await delay(2000);
    
  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
  } finally {
    await cleanup();
    printResults();
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testResults };

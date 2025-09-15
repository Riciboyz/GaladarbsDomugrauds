// Test script for authentication and thread sharing
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testAuthSystem() {
  console.log('🧪 Testing Authentication and Thread Sharing System\n');

  try {
    // Test 1: Register a new user
    console.log('1️⃣ Testing user registration...');
    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'testuser1@example.com',
        username: 'testuser1',
        displayName: 'Test User 1',
        password: 'password123'
      })
    });

    const registerData = await registerResponse.json();
    if (registerResponse.ok) {
      console.log('✅ User registration successful:', registerData.user.email);
    } else {
      console.log('❌ User registration failed:', registerData.error);
    }

    // Test 2: Register another user
    console.log('\n2️⃣ Testing second user registration...');
    const registerResponse2 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'testuser2@example.com',
        username: 'testuser2',
        displayName: 'Test User 2',
        password: 'password123'
      })
    });

    const registerData2 = await registerResponse2.json();
    if (registerResponse2.ok) {
      console.log('✅ Second user registration successful:', registerData2.user.email);
    } else {
      console.log('❌ Second user registration failed:', registerData2.error);
    }

    // Test 3: Login with first user
    console.log('\n3️⃣ Testing login with first user...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'testuser1@example.com',
        password: 'password123'
      })
    });

    const loginData = await loginResponse.json();
    if (loginResponse.ok) {
      console.log('✅ Login successful:', loginData.user.email);
    } else {
      console.log('❌ Login failed:', loginData.error);
      return;
    }

    // Test 4: Create a thread with first user
    console.log('\n4️⃣ Testing thread creation with first user...');
    const threadResponse = await fetch(`${BASE_URL}/api/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authorId: loginData.user.id,
        content: 'Hello from Test User 1! This is a test thread.',
        visibility: 'public'
      })
    });

    const threadData = await threadResponse.json();
    if (threadResponse.ok) {
      console.log('✅ Thread created successfully:', threadData.thread.id);
    } else {
      console.log('❌ Thread creation failed:', threadData.error);
    }

    // Test 5: Get all threads (should show the thread created by first user)
    console.log('\n5️⃣ Testing thread retrieval...');
    const threadsResponse = await fetch(`${BASE_URL}/api/threads`);
    const threadsData = await threadsResponse.json();
    
    if (threadsResponse.ok) {
      console.log('✅ Retrieved threads successfully. Total threads:', threadsData.threads.length);
      console.log('📝 Threads:');
      threadsData.threads.forEach((thread, index) => {
        console.log(`   ${index + 1}. ${thread.content} (by ${thread.authorId})`);
      });
    } else {
      console.log('❌ Failed to retrieve threads:', threadsData.error);
    }

    // Test 6: Login with second user
    console.log('\n6️⃣ Testing login with second user...');
    const loginResponse2 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'testuser2@example.com',
        password: 'password123'
      })
    });

    const loginData2 = await loginResponse2.json();
    if (loginResponse2.ok) {
      console.log('✅ Second user login successful:', loginData2.user.email);
    } else {
      console.log('❌ Second user login failed:', loginData2.error);
      return;
    }

    // Test 7: Create a thread with second user
    console.log('\n7️⃣ Testing thread creation with second user...');
    const threadResponse2 = await fetch(`${BASE_URL}/api/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authorId: loginData2.user.id,
        content: 'Hello from Test User 2! This is another test thread.',
        visibility: 'public'
      })
    });

    const threadData2 = await threadResponse2.json();
    if (threadResponse2.ok) {
      console.log('✅ Second thread created successfully:', threadData2.thread.id);
    } else {
      console.log('❌ Second thread creation failed:', threadData2.error);
    }

    // Test 8: Get all threads again (should show both threads)
    console.log('\n8️⃣ Testing thread retrieval after second user created thread...');
    const threadsResponse2 = await fetch(`${BASE_URL}/api/threads`);
    const threadsData2 = await threadsResponse2.json();
    
    if (threadsResponse2.ok) {
      console.log('✅ Retrieved threads successfully. Total threads:', threadsData2.threads.length);
      console.log('📝 All threads (should be shared between users):');
      threadsData2.threads.forEach((thread, index) => {
        console.log(`   ${index + 1}. ${thread.content} (by ${thread.authorId})`);
      });
      
      // Verify that both users can see each other's threads
      const user1Thread = threadsData2.threads.find(t => t.authorId === loginData.user.id);
      const user2Thread = threadsData2.threads.find(t => t.authorId === loginData2.user.id);
      
      if (user1Thread && user2Thread) {
        console.log('✅ SUCCESS: Both users can see each other\'s threads! Thread sharing is working correctly.');
      } else {
        console.log('❌ FAILURE: Thread sharing is not working correctly.');
      }
    } else {
      console.log('❌ Failed to retrieve threads:', threadsData2.error);
    }

    console.log('\n🎉 Authentication and thread sharing test completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testAuthSystem();

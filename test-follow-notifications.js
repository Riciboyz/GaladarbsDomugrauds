#!/usr/bin/env node

/**
 * Follow Notifications Test
 * Pārbauda, vai follow notifikācijas darbojas pareizi
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// Test users
const TEST_USERS = {
  user1: {
    username: 'testuser1',
    email: 'test1@example.com',
    password: 'password123'
  },
  user2: {
    username: 'testuser2', 
    email: 'test2@example.com',
    password: 'password123'
  }
};

let user1Token = null;
let user2Token = null;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createTestUsers() {
  console.log('🔧 Izveidojam testa lietotājus...');
  
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
      console.log('✅ User 1 izveidots un ielogojies');
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
      console.log('✅ User 2 izveidots un ielogojies');
    }
    
  } catch (error) {
    console.error('❌ Kļūda izveidojot testa lietotājus:', error.message);
    throw error;
  }
}

async function testFollowNotification() {
  console.log('👥 Testējam follow notifikāciju...');
  
  try {
    // User 1 follows User 2
    const response = await fetch(`${BASE_URL}/api/users/follow`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${user1Token}`
      },
      body: JSON.stringify({
        userId: 'test_user_2', // User 2 ID
        action: 'follow'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Follow darbība pabeigta');
      console.log('📊 Follow API atbilde:', data.message);
      
      // Wait a bit for notification to be processed
      await delay(2000);
      
      // Check if notification was created
      const notificationResponse = await fetch(`${BASE_URL}/api/notifications`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${user2Token}` // Check User 2's notifications
        }
      });
      
      if (notificationResponse.ok) {
        const notificationData = await notificationResponse.json();
        console.log('📬 Notifikācijas User 2:', notificationData.notifications?.length || 0);
        
        if (notificationData.notifications && notificationData.notifications.length > 0) {
          const followNotification = notificationData.notifications.find(n => n.type === 'follow');
          if (followNotification) {
            console.log('🎉 Follow notifikācija atrasta!');
            console.log('📝 Notifikācijas ziņojums:', followNotification.message);
            return true;
          } else {
            console.log('⚠️ Follow notifikācija nav atrasta');
            return false;
          }
        } else {
          console.log('⚠️ Nav notifikāciju');
          return false;
        }
      } else {
        console.log('❌ Nevarēja iegūt notifikācijas');
        return false;
      }
    } else {
      const errorData = await response.json();
      console.error('❌ Follow darbība neizdevās:', errorData.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Follow notifikācijas tests neizdevās:', error.message);
    return false;
  }
}

async function testUnfollowNotification() {
  console.log('👥 Testējam unfollow darbību...');
  
  try {
    // User 1 unfollows User 2
    const response = await fetch(`${BASE_URL}/api/users/follow`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${user1Token}`
      },
      body: JSON.stringify({
        userId: 'test_user_2',
        action: 'unfollow'
      })
    });
    
    if (response.ok) {
      console.log('✅ Unfollow darbība pabeigta');
      return true;
    } else {
      const errorData = await response.json();
      console.error('❌ Unfollow darbība neizdevās:', errorData.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Unfollow tests neizdevās:', error.message);
    return false;
  }
}

async function testDirectNotificationSend() {
  console.log('🔔 Testējam tiešo notifikāciju sūtīšanu...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/notifications/send`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${user1Token}`
      },
      body: JSON.stringify({
        type: 'follow',
        fromUserId: 'test_user_1',
        toUserId: 'test_user_2',
        data: { 
          fromUsername: 'Test User 1'
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Tiešā notifikācija nosūtīta');
      console.log('📝 Notifikācijas ID:', data.notification?.id);
      return true;
    } else {
      const errorData = await response.json();
      console.error('❌ Tiešā notifikācija neizdevās:', errorData.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Tiešās notifikācijas tests neizdevās:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Sākam Follow Notifikāciju Testu');
  console.log('==================================\n');
  
  const results = {
    follow: false,
    unfollow: false,
    directNotification: false
  };
  
  try {
    await createTestUsers();
    
    console.log('\n🧪 Palaidzam follow notifikāciju testus...');
    
    // Test follow notification
    results.follow = await testFollowNotification();
    
    // Test unfollow (should not create notification)
    results.unfollow = await testUnfollowNotification();
    
    // Test direct notification sending
    results.directNotification = await testDirectNotificationSend();
    
  } catch (error) {
    console.error('❌ Testa iestatīšana neizdevās:', error.message);
  }
  
  // Print results
  console.log('\n📊 Testa Rezultāti:');
  console.log('==================');
  console.log(`Follow Notifikācija: ${results.follow ? '✅ DARBOJAS' : '❌ NEDARBOJAS'}`);
  console.log(`Unfollow Darbība: ${results.unfollow ? '✅ DARBOJAS' : '❌ NEDARBOJAS'}`);
  console.log(`Tiešā Notifikācija: ${results.directNotification ? '✅ DARBOJAS' : '❌ NEDARBOJAS'}`);
  
  if (results.follow && results.unfollow && results.directNotification) {
    console.log('\n🎉 Visi testi izdevās! Follow notifikāciju sistēma darbojas.');
  } else {
    console.log('\n⚠️ Daži testi neizdevās. Pārbaudiet:');
    if (!results.follow) {
      console.log('- Follow API neizveido notifikācijas');
    }
    if (!results.unfollow) {
      console.log('- Unfollow API nedarbojas');
    }
    if (!results.directNotification) {
      console.log('- Notifikāciju sūtīšanas API nedarbojas');
    }
  }
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };

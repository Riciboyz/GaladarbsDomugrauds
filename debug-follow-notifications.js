#!/usr/bin/env node

/**
 * Follow Notifications Debug Test
 * Pārbauda follow notifikāciju sistēmu ar pareizu autentifikāciju
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loginUser(username, password) {
  try {
    console.log(`🔐 Piesakāmies kā ${username}...`);
    
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${username} ielogojies`);
      return {
        token: data.token,
        user: data.user,
        cookie: response.headers.get('set-cookie') || `auth-token=${data.token}`
      };
    } else {
      throw new Error(`Login failed for ${username}`);
    }
  } catch (error) {
    console.error(`❌ Login error for ${username}:`, error.message);
    return null;
  }
}

async function testFollowNotification() {
  console.log('🧪 Testējam follow notifikāciju sistēmu...\n');
  
  // Login as user 1
  const user1 = await loginUser('testuser1', 'password123');
  if (!user1) {
    console.log('❌ Nevarēja ielogoties kā User 1');
    return;
  }
  
  // Login as user 2
  const user2 = await loginUser('testuser2', 'password123');
  if (!user2) {
    console.log('❌ Nevarēja ielogoties kā User 2');
    return;
  }
  
  console.log('\n👥 Abi lietotāji ielogojušies, sākam follow testu...');
  
  try {
    // User 1 follows User 2
    console.log('📤 User 1 seko User 2...');
    
    const followResponse = await fetch(`${BASE_URL}/api/users/follow`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': user1.cookie
      },
      body: JSON.stringify({
        userId: user2.user.id,
        action: 'follow'
      })
    });
    
    if (followResponse.ok) {
      const followData = await followResponse.json();
      console.log('✅ Follow darbība veiksmīga');
      console.log('📊 Follow API atbilde:', followData.message);
      
      // Wait for notification to be processed
      console.log('⏳ Gaidām 3 sekundes, lai notifikācija tiktu apstrādāta...');
      await delay(3000);
      
      // Check User 2's notifications
      console.log('📬 Pārbaudām User 2 notifikācijas...');
      
      const notificationResponse = await fetch(`${BASE_URL}/api/notifications`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': user2.cookie
        }
      });
      
      if (notificationResponse.ok) {
        const notificationData = await notificationResponse.json();
        console.log('📊 Notifikāciju API atbilde:', notificationData);
        
        if (notificationData.success && notificationData.notifications) {
          console.log(`📬 User 2 ir ${notificationData.notifications.length} notifikācijas`);
          
          const followNotifications = notificationData.notifications.filter(n => n.type === 'follow');
          if (followNotifications.length > 0) {
            console.log('🎉 Follow notifikācija atrasta!');
            console.log('📝 Notifikācijas ziņojums:', followNotifications[0].message);
            console.log('📅 Izveides laiks:', followNotifications[0].created_at);
            console.log('👤 No lietotāja:', followNotifications[0].user_id);
            return true;
          } else {
            console.log('⚠️ Follow notifikācija nav atrasta');
            console.log('📋 Pieejamās notifikācijas:', notificationData.notifications.map(n => n.type));
            return false;
          }
        } else {
          console.log('⚠️ Nav notifikāciju vai API kļūda');
          return false;
        }
      } else {
        console.log('❌ Nevarēja iegūt notifikācijas');
        return false;
      }
    } else {
      const errorData = await followResponse.json();
      console.error('❌ Follow darbība neizdevās:', errorData.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Follow testa kļūda:', error.message);
    return false;
  }
}

async function testDirectNotification() {
  console.log('\n🔔 Testējam tiešo notifikāciju sūtīšanu...');
  
  const user1 = await loginUser('testuser1', 'password123');
  if (!user1) return false;
  
  try {
    const response = await fetch(`${BASE_URL}/api/notifications/send`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': user1.cookie
      },
      body: JSON.stringify({
        type: 'follow',
        fromUserId: user1.user.id,
        toUserId: 'test_user_2',
        data: { 
          fromUsername: user1.user.display_name || user1.user.username
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
    console.error('❌ Tiešās notifikācijas kļūda:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Follow Notifikāciju Debug Tests');
  console.log('==================================\n');
  
  const results = {
    follow: false,
    directNotification: false
  };
  
  try {
    results.follow = await testFollowNotification();
    results.directNotification = await testDirectNotification();
  } catch (error) {
    console.error('❌ Testa kļūda:', error.message);
  }
  
  // Print results
  console.log('\n📊 Testa Rezultāti:');
  console.log('==================');
  console.log(`Follow Notifikācija: ${results.follow ? '✅ DARBOJAS' : '❌ NEDARBOJAS'}`);
  console.log(`Tiešā Notifikācija: ${results.directNotification ? '✅ DARBOJAS' : '❌ NEDARBOJAS'}`);
  
  if (results.follow && results.directNotification) {
    console.log('\n🎉 Visi testi izdevās! Follow notifikāciju sistēma darbojas.');
  } else {
    console.log('\n⚠️ Daži testi neizdevās. Iespējamās problēmas:');
    if (!results.follow) {
      console.log('- Follow API neizveido notifikācijas');
      console.log('- Notifikāciju API nedarbojas');
      console.log('- WebSocket serveris nedarbojas');
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

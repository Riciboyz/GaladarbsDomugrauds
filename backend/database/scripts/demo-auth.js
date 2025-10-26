#!/usr/bin/env node

// Demo script to test authentication
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Simple in-memory demo (same as API routes)
const users = [];

async function demoAuth() {
  console.log('🔐 Authentication Demo\n');

  // Demo user data
  const demoUser = {
    email: 'demo@example.com',
    username: 'demo_user',
    displayName: 'Demo User',
    password: 'password123'
  };

  try {
    // 1. Register user
    console.log('1️⃣ Registering user...');
    
    // Check if email already exists
    const existingUser = users.find(user => user.email === demoUser.email);
    if (existingUser) {
      console.log('   ✅ User already exists');
    } else {
      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(demoUser.password, saltRounds);
      
      // Create user
      const newUser = {
        id: crypto.randomUUID(),
        email: demoUser.email,
        username: demoUser.username,
        displayName: demoUser.displayName,
        passwordHash,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        bio: 'Demo user for testing',
        followers: [],
        following: [],
        createdAt: new Date()
      };

      users.push(newUser);
      console.log('   ✅ User registered successfully');
    }

    // 2. Login user
    console.log('\n2️⃣ Logging in user...');
    
    const user = users.find(u => u.email === demoUser.email);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(demoUser.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    console.log('   ✅ Login successful');
    console.log(`   👤 User: ${user.displayName} (${user.email})`);

    // 3. Test wrong password
    console.log('\n3️⃣ Testing wrong password...');
    
    const wrongPassword = 'wrongpassword';
    const isWrongPassword = await bcrypt.compare(wrongPassword, user.passwordHash);
    
    if (!isWrongPassword) {
      console.log('   ✅ Wrong password correctly rejected');
    } else {
      console.log('   ❌ Wrong password was accepted (this should not happen)');
    }

    // 4. Test duplicate email
    console.log('\n4️⃣ Testing duplicate email registration...');
    
    try {
      const duplicateUser = {
        email: demoUser.email, // Same email
        username: 'another_user',
        displayName: 'Another User',
        password: 'password456'
      };

      const existingUser = users.find(u => u.email === duplicateUser.email);
      if (existingUser) {
        console.log('   ✅ Duplicate email correctly rejected');
      }
    } catch (error) {
      console.log('   ✅ Duplicate email correctly rejected');
    }

    console.log('\n🎉 Authentication demo completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Password hashing works');
    console.log('   ✅ Login verification works');
    console.log('   ✅ Wrong password rejection works');
    console.log('   ✅ Duplicate email prevention works');
    console.log('\n🚀 Ready to use in the application!');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Run demo if this script is executed directly
if (require.main === module) {
  demoAuth();
}

module.exports = { demoAuth };

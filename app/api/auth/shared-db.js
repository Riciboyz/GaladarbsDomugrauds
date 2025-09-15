// Shared persistent database for authentication
// This ensures both register and login use the same data

const fs = require('fs');
const path = require('path');

// File path for persistent storage
const DB_FILE = path.join(process.cwd(), 'auth-users.json');

// Load users from file or create empty array
let users = [];
try {
  if (fs.existsSync(DB_FILE)) {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    users = JSON.parse(data);
    console.log(`Loaded ${users.length} users from persistent storage`);
  }
} catch (error) {
  console.error('Error loading users:', error);
  users = [];
}

const sharedDb = {
  // Add user
  addUser(user) {
    users.push(user);
    this.saveUsers();
    console.log('User added:', user.email);
    return user;
  },

  // Find user by email
  findUserByEmail(email) {
    return users.find(user => user.email === email);
  },

  // Find user by username
  findUserByUsername(username) {
    return users.find(user => user.username === username);
  },

  // Get all users (for debugging)
  getAllUsers() {
    return users;
  },

  // Clear all users (for testing)
  clearUsers() {
    users.length = 0;
    this.saveUsers();
  },

  // Save users to file
  saveUsers() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
      console.log(`Saved ${users.length} users to persistent storage`);
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }
};

module.exports = sharedDb;

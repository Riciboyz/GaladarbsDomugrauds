# Threads App - Comprehensive Testing Guide

This guide provides step-by-step instructions to test all frontend functionalities with the new MySQL backend implementation.

## Prerequisites

### 1. Database Setup
```bash
# Install MySQL (if not already installed)
# macOS with Homebrew:
brew install mysql

# Start MySQL service



# Create database
mysql -u root -p
CREATE DATABASE threads_app;
exit
```

### 2. Environment Configuration
```bash
# Copy environment template
cp env.mysql.example .env.local

# Edit .env.local with your MySQL credentials
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=threads_app
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Initialize Database
```bash
# Run the database initialization script
node -e "
const { initializeDatabase } = require('./database/mysql-config');
initializeDatabase().then(() => {
  console.log('✅ Database initialized successfully');
  process.exit(0);
}).catch(err => {
  console.error('❌ Database initialization failed:', err);
  process.exit(1);
});
"
```

## Testing Steps

### Phase 1: Authentication Testing

#### 1.1 User Registration
1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Navigate to registration:**
   - Go to `http://localhost:3000`
   - Click "Sign Up" or navigate to registration form

3. **Test valid registration:**
   - Username: `testuser1`
   - Display Name: `Test User 1`
   - Email: `test1@example.com`
   - Password: `password123`
   - Click "Sign Up"

4. **Expected Results:**
   - ✅ User created successfully
   - ✅ JWT token set in HTTP-only cookie
   - ✅ Redirected to main app
   - ✅ User data displayed in profile

5. **Test invalid registrations:**
   - Empty fields → Should show validation errors
   - Invalid email format → Should show email error
   - Password < 6 characters → Should show password error
   - Username with special characters → Should show username error
   - Duplicate email → Should show "Email already taken"
   - Duplicate username → Should show "Username already taken"

#### 1.2 User Login
1. **Test valid login:**
   - Email: `test1@example.com`
   - Password: `password123`
   - Click "Sign In"

2. **Expected Results:**
   - ✅ Login successful
   - ✅ JWT token set in HTTP-only cookie
   - ✅ Redirected to main app
   - ✅ User data loaded

3. **Test invalid login:**
   - Wrong password → Should show "Invalid email or password"
   - Non-existent email → Should show "Invalid email or password"
   - Empty fields → Should show validation errors

#### 1.3 Session Management
1. **Test session persistence:**
   - Login successfully
   - Refresh the page
   - ✅ Should remain logged in

2. **Test logout:**
   - Click logout button
   - ✅ Should clear session
   - ✅ Should redirect to login page

### Phase 2: Thread Management Testing

#### 2.1 Create Thread
1. **Navigate to main app (logged in)**
2. **Click "New Thread" or compose button**
3. **Test thread creation:**
   - Content: "This is my first thread! 🚀"
   - Click "Post"

4. **Expected Results:**
   - ✅ Thread created successfully
   - ✅ Thread appears in feed
   - ✅ Thread shows correct author info
   - ✅ Thread shows creation timestamp

5. **Test thread validation:**
   - Empty content → Should show error
   - Content > 500 characters → Should show error

#### 2.2 Thread Interactions
1. **Test like functionality:**
   - Click heart icon on a thread
   - ✅ Should toggle like state
   - ✅ Like count should update
   - ✅ Heart should fill/empty

2. **Test comment functionality:**
   - Click comment icon
   - ✅ Should show comment section
   - ✅ Should allow adding comments
   - ✅ Comments should appear with author info

3. **Test reply functionality:**
   - Click "Reply" button on a thread
   - ✅ Should open reply modal
   - ✅ Should create nested reply
   - ✅ Reply should appear under original thread

#### 2.3 Thread Management
1. **Test edit thread (own threads only):**
   - Click options menu on your thread
   - Select "Edit"
   - Modify content
   - Save changes
   - ✅ Should update thread content

2. **Test delete thread (own threads only):**
   - Click options menu on your thread
   - Select "Delete"
   - Confirm deletion
   - ✅ Should remove thread from feed

### Phase 3: User Management Testing

#### 3.1 User Profile
1. **Navigate to profile page**
2. **Test profile display:**
   - ✅ Should show user info
   - ✅ Should show follower/following counts
   - ✅ Should show user's threads

3. **Test profile editing:**
   - Click "Edit Profile"
   - Update display name, bio, avatar
   - Save changes
   - ✅ Should update profile info
   - ✅ Should validate input lengths

#### 3.2 Follow System
1. **Create second user account:**
   - Register: `testuser2@example.com`
   - Username: `testuser2`

2. **Test follow functionality:**
   - Search for `testuser2`
   - Click "Follow" button
   - ✅ Should follow user
   - ✅ Follow count should update
   - ✅ Button should change to "Following"

3. **Test unfollow functionality:**
   - Click "Following" button
   - ✅ Should unfollow user
   - ✅ Follow count should update
   - ✅ Button should change to "Follow"

### Phase 4: Search Testing

#### 4.1 Thread Search
1. **Navigate to search page**
2. **Test thread search:**
   - Search for: "first thread"
   - ✅ Should return matching threads
   - ✅ Should show search results with highlighting

3. **Test user search:**
   - Search for: "testuser"
   - ✅ Should return matching users
   - ✅ Should show user profiles

#### 4.2 Search Validation
1. **Test empty search:**
   - Submit empty search
   - ✅ Should show validation error

2. **Test short search:**
   - Search for: "a"
   - ✅ Should show validation error

### Phase 5: Notifications Testing

#### 5.1 Real-time Notifications
1. **Enable notifications in browser**
2. **Test like notifications:**
   - Have user2 like user1's thread
   - ✅ User1 should receive notification
   - ✅ Notification should appear in real-time

3. **Test follow notifications:**
   - Have user2 follow user1
   - ✅ User1 should receive notification

4. **Test comment notifications:**
   - Have user2 comment on user1's thread
   - ✅ User1 should receive notification

#### 5.2 Notification Management
1. **Test mark as read:**
   - Click on notification
   - ✅ Should mark as read
   - ✅ Should update unread count

2. **Test mark all as read:**
   - Click "Mark all as read"
   - ✅ Should mark all notifications as read

### Phase 6: Data Validation Testing

#### 6.1 Input Validation
1. **Test all form validations:**
   - Registration form
   - Login form
   - Thread creation
   - Profile editing
   - Search forms

2. **Test edge cases:**
   - Very long inputs
   - Special characters
   - SQL injection attempts
   - XSS attempts

#### 6.2 Error Handling
1. **Test network errors:**
   - Disconnect internet
   - Try to create thread
   - ✅ Should show appropriate error message

2. **Test server errors:**
   - Stop database
   - Try to load threads
   - ✅ Should show error message
   - ✅ Should not crash app

### Phase 7: Performance Testing

#### 7.1 Load Testing
1. **Create multiple threads:**
   - Create 50+ threads
   - ✅ Should load efficiently
   - ✅ Should paginate properly

2. **Test with multiple users:**
   - Register 10+ users
   - Have them interact with threads
   - ✅ Should handle concurrent operations

#### 7.2 Database Performance
1. **Check database queries:**
   - Monitor MySQL slow query log
   - ✅ Queries should be optimized
   - ✅ No N+1 query problems

### Phase 8: Security Testing

#### 8.1 Authentication Security
1. **Test JWT token security:**
   - Try to modify token in browser
   - ✅ Should reject invalid tokens

2. **Test session security:**
   - Try to access protected routes without login
   - ✅ Should redirect to login

#### 8.2 Authorization Testing
1. **Test user permissions:**
   - Try to edit other user's threads
   - ✅ Should be rejected

2. **Test data access:**
   - Try to access other user's private data
   - ✅ Should be rejected

## Database Verification

### Check Database Tables
```sql
-- Connect to MySQL
mysql -u root -p threads_app

-- Check all tables exist
SHOW TABLES;

-- Check users table
SELECT COUNT(*) FROM users;
SELECT username, email, created_at FROM users LIMIT 5;

-- Check threads table
SELECT COUNT(*) FROM threads;
SELECT content, created_at FROM threads LIMIT 5;

-- Check notifications table
SELECT COUNT(*) FROM notifications;
SELECT type, message, created_at FROM notifications LIMIT 5;

-- Check user_follows table
SELECT COUNT(*) FROM user_follows;
SELECT follower_id, following_id FROM user_follows LIMIT 5;
```

### Verify Data Integrity
```sql
-- Check foreign key constraints
SELECT 
  t.id, t.author_id, u.username 
FROM threads t 
JOIN users u ON t.author_id = u.id 
LIMIT 5;

-- Check notification relationships
SELECT 
  n.type, n.message, u.username 
FROM notifications n 
JOIN users u ON n.user_id = u.id 
LIMIT 5;
```

## Troubleshooting

### Common Issues

1. **Database Connection Error:**
   - Check MySQL is running: `brew services list | grep mysql`
   - Verify credentials in `.env.local`
   - Check database exists: `SHOW DATABASES;`

2. **JWT Token Issues:**
   - Check JWT_SECRET is set in `.env.local`
   - Clear browser cookies and try again

3. **CORS Issues:**
   - Check API routes are properly configured
   - Verify cookie settings

4. **Build Errors:**
   - Run `npm install` to ensure all dependencies are installed
   - Check TypeScript errors: `npm run lint`

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev

# Check specific database operations
# Add console.log statements in database functions
```

## Success Criteria

✅ **All authentication flows work correctly**
✅ **All CRUD operations function properly**
✅ **Real-time features work as expected**
✅ **Data validation prevents invalid inputs**
✅ **Error handling provides user-friendly messages**
✅ **Database maintains data integrity**
✅ **Performance is acceptable under normal load**
✅ **Security measures prevent unauthorized access**

## Next Steps

After successful testing:
1. Deploy to production environment
2. Set up monitoring and logging
3. Configure backup strategies
4. Implement rate limiting
5. Add comprehensive error tracking
6. Set up automated testing pipeline

---

**Note:** This testing guide covers the core functionality. For production deployment, additional testing for scalability, security, and performance under high load is recommended.

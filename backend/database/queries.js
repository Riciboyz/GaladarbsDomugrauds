// Database queries for the Threads app

// User queries
const userQueries = {
  // Get user by ID
  getUserById: 'SELECT * FROM users WHERE id = $1',
  
  // Get user by email
  getUserByEmail: 'SELECT * FROM users WHERE email = $1',
  
  // Get user by username
  getUserByUsername: 'SELECT * FROM users WHERE username = $1',
  
  // Create new user
  createUser: `
    INSERT INTO users (email, username, display_name, bio, avatar, password_hash)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `,
  
  // Update user
  updateUser: `
    UPDATE users 
    SET display_name = $2, bio = $3, avatar = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `,
  
  // Follow user
  followUser: `
    UPDATE users 
    SET following = array_append(following, $2),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `,
  
  // Unfollow user
  unfollowUser: `
    UPDATE users 
    SET following = array_remove(following, $2),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `,
  
  // Add follower
  addFollower: `
    UPDATE users 
    SET followers = array_append(followers, $2),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `,
  
  // Remove follower
  removeFollower: `
    UPDATE users 
    SET followers = array_remove(followers, $2),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `,
  
  // Get all users
  getAllUsers: 'SELECT * FROM users ORDER BY created_at DESC',
  
  // Get users by IDs
  getUsersByIds: 'SELECT * FROM users WHERE id = ANY($1)',
};

// Thread queries
const threadQueries = {
  // Get thread by ID
  getThreadById: 'SELECT * FROM threads WHERE id = $1',
  
  // Get threads by author
  getThreadsByAuthor: 'SELECT * FROM threads WHERE author_id = $1 ORDER BY created_at DESC',
  
  // Get all threads (with pagination)
  getAllThreads: `
    SELECT t.*, u.display_name, u.username, u.avatar
    FROM threads t
    JOIN users u ON t.author_id = u.id
    WHERE t.parent_id IS NULL
    ORDER BY t.created_at DESC
    LIMIT $1 OFFSET $2
  `,
  
  // Get threads by following users
  getThreadsByFollowing: `
    SELECT t.*, u.display_name, u.username, u.avatar
    FROM threads t
    JOIN users u ON t.author_id = u.id
    WHERE t.author_id = ANY($1) AND t.parent_id IS NULL
    ORDER BY t.created_at DESC
    LIMIT $2 OFFSET $3
  `,
  
  // Get thread replies
  getThreadReplies: `
    SELECT t.*, u.display_name, u.username, u.avatar
    FROM threads t
    JOIN users u ON t.author_id = u.id
    WHERE t.parent_id = $1
    ORDER BY t.created_at ASC
  `,
  
  // Create new thread
  createThread: `
    INSERT INTO threads (author_id, content, parent_id, group_id, topic_day_id, visibility, attachments)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `,
  
  // Update thread
  updateThread: `
    UPDATE threads 
    SET content = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `,
  
  // Delete thread
  deleteThread: 'DELETE FROM threads WHERE id = $1',
  
  // Like thread
  likeThread: `
    UPDATE threads 
    SET likes = array_append(likes, $2),
        dislikes = array_remove(dislikes, $2),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `,
  
  // Unlike thread
  unlikeThread: `
    UPDATE threads 
    SET likes = array_remove(likes, $2),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `,
  
  // Dislike thread
  dislikeThread: `
    UPDATE threads 
    SET dislikes = array_append(dislikes, $2),
        likes = array_remove(likes, $2),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `,
  
  // Undislike thread
  undislikeThread: `
    UPDATE threads 
    SET dislikes = array_remove(dislikes, $2),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `,
};

// Group queries
const groupQueries = {
  // Get all groups
  getAllGroups: 'SELECT * FROM groups ORDER BY created_at DESC',
  
  // Get group by ID
  getGroupById: 'SELECT * FROM groups WHERE id = $1',
  
  // Create new group
  createGroup: `
    INSERT INTO groups (name, description, avatar, created_by, members)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,
  
  // Update group
  updateGroup: `
    UPDATE groups 
    SET name = $2, description = $3, avatar = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `,
  
  // Delete group
  deleteGroup: 'DELETE FROM groups WHERE id = $1',
  
  // Add member to group
  addGroupMember: `
    UPDATE groups 
    SET members = array_append(members, $2),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `,
  
  // Remove member from group
  removeGroupMember: `
    UPDATE groups 
    SET members = array_remove(members, $2),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `,
};

// Topic Day queries
const topicDayQueries = {
  // Get all topic days
  getAllTopicDays: 'SELECT * FROM topic_days ORDER BY date DESC',
  
  // Get topic day by ID
  getTopicDayById: 'SELECT * FROM topic_days WHERE id = $1',
  
  // Create new topic day
  createTopicDay: `
    INSERT INTO topic_days (title, description, date, created_by, participants)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,
  
  // Update topic day
  updateTopicDay: `
    UPDATE topic_days 
    SET title = $2, description = $3, date = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `,
  
  // Delete topic day
  deleteTopicDay: 'DELETE FROM topic_days WHERE id = $1',
  
  // Add participant to topic day
  addTopicDayParticipant: `
    UPDATE topic_days 
    SET participants = array_append(participants, $2),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `,
  
  // Remove participant from topic day
  removeTopicDayParticipant: `
    UPDATE topic_days 
    SET participants = array_remove(participants, $2),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `,
};

// Notification queries
const notificationQueries = {
  // Get notifications for user
  getNotificationsByUser: `
    SELECT * FROM notifications 
    WHERE user_id = $1 
    ORDER BY created_at DESC 
    LIMIT $2 OFFSET $3
  `,
  
  // Get unread notifications count
  getUnreadNotificationsCount: `
    SELECT COUNT(*) as count FROM notifications 
    WHERE user_id = $1 AND read = false
  `,
  
  // Create notification
  createNotification: `
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,
  
  // Mark notification as read
  markNotificationAsRead: `
    UPDATE notifications 
    SET read = true 
    WHERE id = $1
    RETURNING *
  `,
  
  // Mark all notifications as read
  markAllNotificationsAsRead: `
    UPDATE notifications 
    SET read = true 
    WHERE user_id = $1
    RETURNING *
  `,
  
  // Delete notification
  deleteNotification: 'DELETE FROM notifications WHERE id = $1',
};

// User Settings queries
const userSettingsQueries = {
  // Get user settings
  getUserSettings: 'SELECT * FROM user_settings WHERE user_id = $1',
  
  // Create user settings
  createUserSettings: `
    INSERT INTO user_settings (user_id, notifications, privacy)
    VALUES ($1, $2, $3)
    RETURNING *
  `,
  
  // Update user settings
  updateUserSettings: `
    UPDATE user_settings 
    SET notifications = $2, privacy = $3, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1
    RETURNING *
  `,
  
  // Update notification settings
  updateNotificationSettings: `
    UPDATE user_settings 
    SET notifications = $2, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1
    RETURNING *
  `,
  
  // Update privacy settings
  updatePrivacySettings: `
    UPDATE user_settings 
    SET privacy = $2, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1
    RETURNING *
  `,
};

module.exports = {
  userQueries,
  threadQueries,
  groupQueries,
  topicDayQueries,
  notificationQueries,
  userSettingsQueries,
};

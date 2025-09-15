-- MySQL Database Schema for Threads App
-- This schema supports all frontend functionalities

-- Users table
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(500),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_created_at (created_at)
);

-- User follows relationship
CREATE TABLE user_follows (
    id VARCHAR(36) PRIMARY KEY,
    follower_id VARCHAR(36) NOT NULL,
    following_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_follow (follower_id, following_id),
    INDEX idx_follower (follower_id),
    INDEX idx_following (following_id)
);

-- Threads table
CREATE TABLE threads (
    id VARCHAR(36) PRIMARY KEY,
    author_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    parent_id VARCHAR(36) NULL,
    visibility ENUM('public', 'followers') DEFAULT 'public',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES threads(id) ON DELETE CASCADE,
    INDEX idx_author (author_id),
    INDEX idx_parent (parent_id),
    INDEX idx_created_at (created_at),
    INDEX idx_visibility (visibility),
    INDEX idx_deleted (is_deleted)
);

-- Thread attachments
CREATE TABLE thread_attachments (
    id VARCHAR(36) PRIMARY KEY,
    thread_id VARCHAR(36) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
    INDEX idx_thread (thread_id)
);

-- Thread likes
CREATE TABLE thread_likes (
    id VARCHAR(36) PRIMARY KEY,
    thread_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_thread_like (thread_id, user_id),
    INDEX idx_thread (thread_id),
    INDEX idx_user (user_id)
);

-- Comments table (stored as threads with parent_id)
-- This reuses the threads table structure for comments and replies

-- Notifications table
CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    type ENUM('like', 'comment', 'follow', 'thread', 'reply') NOT NULL,
    message TEXT NOT NULL,
    related_id VARCHAR(36) NULL, -- ID of related thread, user, etc.
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_type (type),
    INDEX idx_read (is_read),
    INDEX idx_created_at (created_at)
);

-- Groups table
CREATE TABLE `groups` (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar VARCHAR(500),
    is_public BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_created_by (created_by),
    INDEX idx_public (is_public),
    INDEX idx_deleted (is_deleted)
);

-- Group members
CREATE TABLE group_members (
    id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role ENUM('member', 'admin') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_group_member (group_id, user_id),
    INDEX idx_group (group_id),
    INDEX idx_user (user_id),
    INDEX idx_role (role)
);

-- Group invitations
CREATE TABLE group_invitations (
    id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) NOT NULL,
    inviter_id VARCHAR(36) NOT NULL,
    invitee_id VARCHAR(36) NOT NULL,
    status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
    FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_group_invitation (group_id, invitee_id),
    INDEX idx_group (group_id),
    INDEX idx_inviter (inviter_id),
    INDEX idx_invitee (invitee_id),
    INDEX idx_status (status)
);

-- Topic days table
CREATE TABLE topic_days (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_date (date),
    INDEX idx_created_by (created_by),
    INDEX idx_active (is_active)
);

-- User settings
CREATE TABLE user_settings (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    privacy_level ENUM('public', 'followers', 'private') DEFAULT 'public',
    theme ENUM('light', 'dark', 'auto') DEFAULT 'auto',
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_settings (user_id)
);

-- Search history (for analytics)
CREATE TABLE search_history (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    query VARCHAR(255) NOT NULL,
    results_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_query (query),
    INDEX idx_created_at (created_at)
);

-- Session management
CREATE TABLE user_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_token (token_hash),
    INDEX idx_expires (expires_at),
    INDEX idx_active (is_active)
);

-- Create views for common queries
CREATE VIEW thread_with_author AS
SELECT 
    t.*,
    u.username,
    u.display_name,
    u.avatar,
    u.is_verified,
    COUNT(DISTINCT tl.id) as like_count,
    COUNT(DISTINCT tc.id) as comment_count,
    COUNT(DISTINCT tr.id) as reply_count
FROM threads t
JOIN users u ON t.author_id = u.id
LEFT JOIN thread_likes tl ON t.id = tl.thread_id
LEFT JOIN threads tc ON t.id = tc.parent_id AND tc.is_deleted = FALSE
LEFT JOIN threads tr ON t.id = tr.parent_id AND tr.is_deleted = FALSE
WHERE t.is_deleted = FALSE
GROUP BY t.id;

CREATE VIEW user_stats AS
SELECT 
    u.id,
    u.username,
    u.display_name,
    COUNT(DISTINCT f1.id) as followers_count,
    COUNT(DISTINCT f2.id) as following_count,
    COUNT(DISTINCT t.id) as threads_count
FROM users u
LEFT JOIN user_follows f1 ON u.id = f1.following_id
LEFT JOIN user_follows f2 ON u.id = f2.follower_id
LEFT JOIN threads t ON u.id = t.author_id AND t.is_deleted = FALSE
GROUP BY u.id;

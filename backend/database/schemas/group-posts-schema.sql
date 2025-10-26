-- Group Posts and Comments Schema
-- This extends the existing groups system with professional-grade features

-- Group posts table (like Facebook Groups posts)
CREATE TABLE IF NOT EXISTS group_posts (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    post_type TEXT DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'link', 'poll', 'event')),
    media_urls TEXT DEFAULT '[]', -- JSON array of media URLs
    link_url TEXT,
    link_preview TEXT, -- JSON object with link preview data
    poll_options TEXT DEFAULT '[]', -- JSON array of poll options
    poll_end_date DATETIME,
    event_start_date DATETIME,
    event_end_date DATETIME,
    event_location TEXT,
    is_pinned BOOLEAN DEFAULT 0,
    is_announcement BOOLEAN DEFAULT 0,
    visibility TEXT DEFAULT 'group' CHECK (visibility IN ('group', 'members_only')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT 0,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_group_posts_group (group_id),
    INDEX idx_group_posts_author (author_id),
    INDEX idx_group_posts_created (created_at),
    INDEX idx_group_posts_pinned (is_pinned),
    INDEX idx_group_posts_type (post_type)
);

-- Group post comments table
CREATE TABLE IF NOT EXISTS group_post_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    content TEXT NOT NULL,
    parent_id TEXT, -- For nested comments
    media_urls TEXT DEFAULT '[]', -- JSON array of media URLs
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT 0,
    FOREIGN KEY (post_id) REFERENCES group_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES group_post_comments(id) ON DELETE CASCADE,
    INDEX idx_comments_post (post_id),
    INDEX idx_comments_author (author_id),
    INDEX idx_comments_parent (parent_id),
    INDEX idx_comments_created (created_at)
);

-- Group post reactions table (like Facebook reactions)
CREATE TABLE IF NOT EXISTS group_post_reactions (
    id TEXT PRIMARY KEY,
    post_id TEXT,
    comment_id TEXT,
    user_id TEXT NOT NULL,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES group_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES group_post_comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(post_id, user_id), -- One reaction per user per post
    UNIQUE(comment_id, user_id), -- One reaction per user per comment
    INDEX idx_reactions_post (post_id),
    INDEX idx_reactions_comment (comment_id),
    INDEX idx_reactions_user (user_id),
    INDEX idx_reactions_type (reaction_type)
);

-- Group member roles table (admin, moderator, member)
CREATE TABLE IF NOT EXISTS group_member_roles (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'member')),
    assigned_by TEXT NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(group_id, user_id), -- One role per user per group
    INDEX idx_roles_group (group_id),
    INDEX idx_roles_user (user_id),
    INDEX idx_roles_role (role)
);

-- Group categories table
CREATE TABLE IF NOT EXISTS group_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT DEFAULT '📁',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Group category assignments
CREATE TABLE IF NOT EXISTS group_category_assignments (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES group_categories(id) ON DELETE CASCADE,
    UNIQUE(group_id, category_id)
);

-- Group events table
CREATE TABLE IF NOT EXISTS group_events (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME,
    location TEXT,
    is_virtual BOOLEAN DEFAULT 0,
    meeting_url TEXT,
    max_attendees INTEGER,
    attendees TEXT DEFAULT '[]', -- JSON array of user IDs
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT 0,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_events_group (group_id),
    INDEX idx_events_creator (created_by),
    INDEX idx_events_start (start_date)
);

-- Group notifications preferences
CREATE TABLE IF NOT EXISTS group_notification_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    new_posts BOOLEAN DEFAULT 1,
    new_comments BOOLEAN DEFAULT 1,
    new_reactions BOOLEAN DEFAULT 1,
    new_members BOOLEAN DEFAULT 1,
    new_events BOOLEAN DEFAULT 1,
    mentions BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    UNIQUE(user_id, group_id),
    INDEX idx_notif_prefs_user (user_id),
    INDEX idx_notif_prefs_group (group_id)
);

-- Group rules table
CREATE TABLE IF NOT EXISTS group_rules (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT 0,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_rules_group (group_id),
    INDEX idx_rules_order (order_index)
);

-- Insert default categories
INSERT OR IGNORE INTO group_categories (id, name, description, color, icon) VALUES
('cat_tech', 'Technology', 'Tech discussions and news', '#3B82F6', '💻'),
('cat_gaming', 'Gaming', 'Gaming communities and discussions', '#8B5CF6', '🎮'),
('cat_art', 'Art & Design', 'Creative communities', '#F59E0B', '🎨'),
('cat_music', 'Music', 'Music discussions and sharing', '#EF4444', '🎵'),
('cat_sports', 'Sports', 'Sports teams and discussions', '#10B981', '⚽'),
('cat_education', 'Education', 'Learning and academic discussions', '#6366F1', '📚'),
('cat_business', 'Business', 'Professional networking', '#059669', '💼'),
('cat_lifestyle', 'Lifestyle', 'General lifestyle discussions', '#EC4899', '🌟');

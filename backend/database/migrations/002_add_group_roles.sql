-- Migration: 002_add_group_roles.sql
-- Description: Add group roles and permissions
-- Created: 2024-01-15

-- Group roles table
CREATE TABLE IF NOT EXISTS group_roles (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    permissions TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(group_id, user_id)
);

-- Group posts table
CREATE TABLE IF NOT EXISTS group_posts (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    content TEXT NOT NULL,
    attachments TEXT DEFAULT '[]',
    likes TEXT DEFAULT '[]',
    dislikes TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Group post comments table
CREATE TABLE IF NOT EXISTS group_post_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES group_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Group post reactions table
CREATE TABLE IF NOT EXISTS group_post_reactions (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    reaction_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES group_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(post_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_group_roles_group_id ON group_roles(group_id);
CREATE INDEX IF NOT EXISTS idx_group_roles_user_id ON group_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_group_id ON group_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_author_id ON group_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_created_at ON group_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_post_comments_post_id ON group_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_group_post_comments_author_id ON group_post_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_group_post_reactions_post_id ON group_post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_group_post_reactions_user_id ON group_post_reactions(user_id);

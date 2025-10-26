-- Threads App Database Schema
-- Created for PostgreSQL (can be adapted for MySQL/SQLite)

-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar VARCHAR(500),
    password_hash VARCHAR(255) NOT NULL,
    following UUID[] DEFAULT '{}',
    followers UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Threads table
CREATE TABLE threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES threads(id) ON DELETE CASCADE,
    group_id UUID,
    topic_day_id UUID,
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'followers')),
    attachments TEXT[],
    likes UUID[] DEFAULT '{}',
    dislikes UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar VARCHAR(500),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    members UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Topic Days table
CREATE TABLE topic_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participants UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Settings table
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notifications JSONB DEFAULT '{}',
    privacy JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_threads_author_id ON threads(author_id);
CREATE INDEX idx_threads_parent_id ON threads(parent_id);
CREATE INDEX idx_threads_created_at ON threads(created_at DESC);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_threads_updated_at BEFORE UPDATE ON threads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topic_days_updated_at BEFORE UPDATE ON topic_days
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data (optional - for testing)
INSERT INTO users (id, email, username, display_name, bio, avatar, password_hash) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'john@example.com', 'john_doe', 'John Doe', 'Software developer and tech enthusiast', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', '$2b$10$example_hash'),
    ('550e8400-e29b-41d4-a716-446655440001', 'jane@example.com', 'jane_smith', 'Jane Smith', 'Designer and creative thinker', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', '$2b$10$example_hash'),
    ('550e8400-e29b-41d4-a716-446655440002', 'mike@example.com', 'mike_wilson', 'Mike Wilson', 'Product manager and team leader', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', '$2b$10$example_hash');

INSERT INTO groups (id, name, description, avatar, created_by, members) VALUES
    ('660e8400-e29b-41d4-a716-446655440000', 'Tech Enthusiasts', 'A group for technology discussions and news', 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=150&h=150&fit=crop', '550e8400-e29b-41d4-a716-446655440000', ARRAY['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001']),
    ('660e8400-e29b-41d4-a716-446655440001', 'Design Community', 'Share your design work and get feedback', 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=150&h=150&fit=crop', '550e8400-e29b-41d4-a716-446655440001', ARRAY['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002']);

INSERT INTO topic_days (id, title, description, date, created_by, participants) VALUES
    ('770e8400-e29b-41d4-a716-446655440000', 'AI and Machine Learning', 'Discuss the latest trends in AI and ML', CURRENT_DATE, '550e8400-e29b-41d4-a716-446655440000', ARRAY['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001']),
    ('770e8400-e29b-41d4-a716-446655440001', 'UI/UX Design Trends', 'Share your thoughts on current design trends', CURRENT_DATE + INTERVAL '1 day', '550e8400-e29b-41d4-a716-446655440001', ARRAY['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002']);

INSERT INTO threads (id, author_id, content, group_id, topic_day_id, attachments, likes, dislikes) VALUES
    ('880e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Just finished reading about the latest developments in AI. The future looks exciting! #AI #Technology', '660e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440000', ARRAY['https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop'], ARRAY['550e8400-e29b-41d4-a716-446655440001'], ARRAY[]::UUID[]),
    ('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Working on a new design system. Love how clean and modern it looks! 🎨', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', ARRAY['https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=300&fit=crop'], ARRAY['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002'], ARRAY[]::UUID[]);

INSERT INTO user_settings (user_id, notifications, privacy) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', '{"likes": true, "comments": true, "follows": true, "topicDays": true, "groups": true}', '{"showOnlineStatus": true, "allowDirectMessages": true, "showEmail": false, "showFollowers": true}'),
    ('550e8400-e29b-41d4-a716-446655440001', '{"likes": true, "comments": true, "follows": true, "topicDays": true, "groups": true}', '{"showOnlineStatus": true, "allowDirectMessages": true, "showEmail": false, "showFollowers": true}'),
    ('550e8400-e29b-41d4-a716-446655440002', '{"likes": true, "comments": true, "follows": true, "topicDays": true, "groups": true}', '{"showOnlineStatus": true, "allowDirectMessages": true, "showEmail": false, "showFollowers": true}');

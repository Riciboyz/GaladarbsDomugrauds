-- SQLite Sample Data for Threads App

-- Sample users
INSERT OR IGNORE INTO users (id, email, username, display_name, bio, avatar, password_hash) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'john@example.com', 'john_doe', 'John Doe', 'Software developer and tech enthusiast', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', '$2b$10$example_hash'),
    ('550e8400-e29b-41d4-a716-446655440001', 'jane@example.com', 'jane_smith', 'Jane Smith', 'Designer and creative thinker', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', '$2b$10$example_hash'),
    ('550e8400-e29b-41d4-a716-446655440002', 'mike@example.com', 'mike_wilson', 'Mike Wilson', 'Product manager and team leader', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', '$2b$10$example_hash');

-- Sample groups
INSERT OR IGNORE INTO groups (id, name, description, avatar, created_by, members) VALUES
    ('660e8400-e29b-41d4-a716-446655440000', 'Tech Enthusiasts', 'A group for technology discussions and news', 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=150&h=150&fit=crop', '550e8400-e29b-41d4-a716-446655440000', '["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]'),
    ('660e8400-e29b-41d4-a716-446655440001', 'Design Community', 'Share your design work and get feedback', 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=150&h=150&fit=crop', '550e8400-e29b-41d4-a716-446655440001', '["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"]');

-- Sample topic days
INSERT OR IGNORE INTO topic_days (id, title, description, date, created_by, participants) VALUES
    ('770e8400-e29b-41d4-a716-446655440000', 'AI and Machine Learning', 'Discuss the latest trends in AI and ML', date('now'), '550e8400-e29b-41d4-a716-446655440000', '["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]'),
    ('770e8400-e29b-41d4-a716-446655440001', 'UI/UX Design Trends', 'Share your thoughts on current design trends', date('now', '+1 day'), '550e8400-e29b-41d4-a716-446655440001', '["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"]');

-- Sample threads
INSERT OR IGNORE INTO threads (id, author_id, content, group_id, topic_day_id, attachments, likes, dislikes) VALUES
    ('880e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Just finished reading about the latest developments in AI. The future looks exciting! #AI #Technology', '660e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440000', '["https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop"]', '["550e8400-e29b-41d4-a716-446655440001"]', '[]'),
    ('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Working on a new design system. Love how clean and modern it looks! 🎨', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', '["https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=300&fit=crop"]', '["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440002"]', '[]');

-- Sample user settings
INSERT OR IGNORE INTO user_settings (user_id, notifications, privacy) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', '{"likes": true, "comments": true, "follows": true, "topicDays": true, "groups": true}', '{"showOnlineStatus": true, "allowDirectMessages": true, "showEmail": false, "showFollowers": true}'),
    ('550e8400-e29b-41d4-a716-446655440001', '{"likes": true, "comments": true, "follows": true, "topicDays": true, "groups": true}', '{"showOnlineStatus": true, "allowDirectMessages": true, "showEmail": false, "showFollowers": true}'),
    ('550e8400-e29b-41d4-a716-446655440002', '{"likes": true, "comments": true, "follows": true, "topicDays": true, "groups": true}', '{"showOnlineStatus": true, "allowDirectMessages": true, "showEmail": false, "showFollowers": true}');

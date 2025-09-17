# Groups Feature Documentation

## Overview

The Groups feature provides Instagram and Twitter-like functionality for creating and managing public and private groups with real-time chat capabilities.

## Features

### 1. Group Types

#### Public Groups
- Anyone can discover and join
- Visible in the groups list to all users
- No invitation required

#### Private Groups
- Only visible to members
- Requires invitation from existing members
- Invitations can only be sent to mutual followers

### 2. Group Management

#### Creating Groups
- Group name (required, max 100 characters)
- Description (optional, max 500 characters)
- Avatar URL (optional)
- Privacy setting (public/private)

#### Group Settings
- Edit group name, description, and avatar
- Delete group (creator only)
- Manage members (add/remove)

### 3. Member Management

#### Joining Groups
- Public groups: Direct join
- Private groups: Invitation required

#### Leaving Groups
- Members can leave anytime
- Creator cannot leave (must delete group)

#### Invitations
- Send invitations to mutual followers
- Accept/decline invitations
- Invitation notifications

### 4. Group Chat

#### Real-time Messaging
- Text messages
- File attachments (planned)
- Image sharing (planned)
- Message history

#### Chat Features
- Message timestamps
- User avatars
- Message deletion (sender or creator)
- Auto-scroll to latest messages

## API Endpoints

### Groups
- `GET /api/groups` - List all groups (public + user's private groups)
- `POST /api/groups` - Create new group
- `PUT /api/groups` - Update group (creator only)
- `DELETE /api/groups` - Delete group (creator only)

### Group Membership
- `POST /api/groups/join` - Join group
- `DELETE /api/groups/join` - Leave group
- `POST /api/groups/members` - Add member
- `DELETE /api/groups/members` - Remove member

### Group Invitations
- `POST /api/groups/invite` - Send invitation
- `PUT /api/groups/invite` - Respond to invitation
- `GET /api/groups/invite` - Get user's invitations

### Group Chat
- `GET /api/groups/chat` - Get messages
- `POST /api/groups/chat` - Send message
- `DELETE /api/groups/chat` - Delete message

## Database Schema

### Groups Table
```sql
CREATE TABLE groups (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar VARCHAR(500),
    is_private BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(36) NOT NULL,
    members TEXT DEFAULT '[]', -- JSON array of member IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);
```

### Group Messages Table
```sql
CREATE TABLE group_messages (
    id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('text', 'image', 'file', 'system') DEFAULT 'text',
    attachment_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);
```

### Group Invitations Table
```sql
CREATE TABLE group_invitations (
    id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) NOT NULL,
    inviter_id VARCHAR(36) NOT NULL,
    invitee_id VARCHAR(36) NOT NULL,
    status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL
);
```

## Components

### Groups.tsx
Main groups listing and management component
- Group discovery
- Create group modal
- Group cards with actions
- Invitation system

### GroupChat.tsx
Real-time group chat component
- Message display
- Message input
- File upload (planned)
- User avatars and timestamps

### GroupManagement.tsx
Group administration component
- Edit group settings
- Member management
- Delete group
- Group statistics

## Usage Examples

### Creating a Group
```typescript
const createGroup = async (groupData) => {
  const response = await fetch('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Tech Enthusiasts',
      description: 'Discussion about latest technology trends',
      isPrivate: false,
      avatar: 'https://example.com/avatar.jpg'
    })
  });
  
  const data = await response.json();
  return data.group;
};
```

### Joining a Group
```typescript
const joinGroup = async (groupId) => {
  const response = await fetch('/api/groups/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId })
  });
  
  return response.ok;
};
```

### Sending a Message
```typescript
const sendMessage = async (groupId, content) => {
  const response = await fetch('/api/groups/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      groupId,
      content,
      messageType: 'text'
    })
  });
  
  return response.ok;
};
```

## Security Features

### Access Control
- Private groups only visible to members
- Creator-only group management
- Member-only chat access

### Invitation System
- Mutual follow requirement for private groups
- Invitation status tracking
- Notification system

### Message Security
- Sender and creator can delete messages
- Soft delete for audit trail
- Content length validation

## Future Enhancements

### Planned Features
- File and image upload
- Message reactions
- Group roles (admin, moderator)
- Group categories/tags
- Group search and filtering
- Message threading
- Voice messages
- Group events/calendar

### Real-time Features
- WebSocket integration for live chat
- Typing indicators
- Online member status
- Push notifications

## Migration

To set up the groups feature, run:

```bash
node migrate-groups.js
```

This will:
- Update the groups table schema
- Create group_messages table
- Create group_invitations table
- Add necessary indexes
- Update existing data

## Testing

The groups feature can be tested by:
1. Creating a new group
2. Inviting users (for private groups)
3. Joining public groups
4. Sending messages in group chat
5. Managing group settings
6. Testing member removal

## Troubleshooting

### Common Issues
1. **Can't join private group**: Ensure you have a pending invitation
2. **Can't send messages**: Verify you're a group member
3. **Can't manage group**: Only group creators can manage groups
4. **Invitation not working**: Check mutual follow relationship

### Database Issues
- Ensure migration script ran successfully
- Check foreign key constraints
- Verify indexes are created
- Check for duplicate entries

function safeJsonParse(s, fallback) {
  try {
    return JSON.parse(s || '');
  } catch {
    return fallback;
  }
}

function rowToThread(row) {
  return {
    id: row.id,
    authorId: row.author_id,
    content: row.content,
    parentId: row.parent_id,
    groupId: row.group_id,
    topicDayId: row.topic_day_id,
    visibility: row.visibility,
    attachments: row.attachments,
    likes: row.likes,
    dislikes: row.dislikes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: {
      id: row.user_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url
    }
  };
}

function mapUserPublic(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    email: row.email,
    avatar: row.avatar || row.avatar_url,
    bio: row.bio,
    createdAt: row.created_at
  };
}

function getMembersArray(membersCol) {
  const m = safeJsonParse(membersCol, []);
  return Array.isArray(m) ? m : [];
}

module.exports = { safeJsonParse, rowToThread, mapUserPublic, getMembersArray };

function safeJsonParse(s, fallback) {
  try {
    return JSON.parse(s || '');
  } catch {
    return fallback;
  }
}


// parsē kā lokālo laiku vai Invalid Date. Konvertējam uz pilnu ISO 8601 UTC,
// lai frontend-am vienmēr ir viennozīmīgs laiks.
function toIsoUtc(s) {
  if (!s) return s;
  if (typeof s !== 'string') return s;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    return new Date(s.replace(' ', 'T') + 'Z').toISOString();
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toISOString();
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
    createdAt: toIsoUtc(row.created_at),
    updatedAt: toIsoUtc(row.updated_at),
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
    role: row.role || 'user',
    avatar: row.avatar || row.avatar_url,
    bio: row.bio,
    createdAt: toIsoUtc(row.created_at)
  };
}

function mapUserAdmin(row) {
  return {
    ...mapUserPublic(row),
    bannedUntil: toIsoUtc(row.banned_until) || null,
    mutedUntil: toIsoUtc(row.muted_until) || null,
    deletedAt: toIsoUtc(row.deleted_at) || null,
    lastActiveAt: toIsoUtc(row.last_active_at) || null
  };
}

function getMembersArray(membersCol) {
  const m = safeJsonParse(membersCol, []);
  return Array.isArray(m) ? m : [];
}

module.exports = { safeJsonParse, toIsoUtc, rowToThread, mapUserPublic, mapUserAdmin, getMembersArray };

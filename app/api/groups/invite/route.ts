import { NextRequest, NextResponse } from 'next/server'
const authDb = require('../../auth/db')

// POST - Send invitation (creator or member, with checks for private groups)
export async function POST(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token')?.value
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const decoded = authDb.verifyToken(authToken)
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { groupId, inviteeId } = body

    if (!groupId || !inviteeId) {
      return NextResponse.json(
        { success: false, error: 'Group ID and invitee ID are required' },
        { status: 400 }
      )
    }

    const group = await getGroupFromDB(groupId)
    if (!group || group.is_deleted) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      )
    }

    const members = JSON.parse(group.members || '[]')
    const isCreator = group.created_by === decoded.id
    const isMember = members.includes(decoded.id)
    if (!isCreator && !isMember) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to invite to this group' },
        { status: 403 }
      )
    }

    // If private group and inviter is not creator, require mutual follow
    if (group.is_private && !isCreator) {
      const mutualFollow = await checkMutualFollow(decoded.id, inviteeId)
      if (!mutualFollow) {
        return NextResponse.json(
          { success: false, error: 'You can only invite users who follow you back' },
          { status: 400 }
        )
      }
    }

    // Prevent inviting existing members
    if (members.includes(inviteeId)) {
      return NextResponse.json(
        { success: false, error: 'User is already a member of this group' },
        { status: 400 }
      )
    }

    // Upsert pending invitation (unique by groupId+inviteeId)
    await upsertInvitation({
      groupId,
      inviterId: decoded.id,
      inviteeId,
    })

    // Create notification for invitee using unified API
    try {
      const inviter = await authDb.getUserById(decoded.id);
      const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'group_invite',
          fromUserId: decoded.id,
          toUserId: inviteeId,
          data: { 
            fromUsername: inviter?.display_name || inviter?.username,
            groupId, 
            groupName: group.name 
          }
        })
      })
      
      if (notificationResponse.ok) {
        console.log('🔔 Group invitation notification sent successfully')
        
        // Send real-time notification via WebSocket
        try {
          const wsResponse = await fetch('http://localhost:3001', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'group_invite_notification',
              userId: inviteeId,
              data: {
                groupId,
                groupName: group.name,
                inviterName: inviter?.display_name || inviter?.username,
                inviterId: decoded.id
              }
            })
          })
          
          if (wsResponse.ok) {
            console.log('✅ Real-time group invite notification sent via WebSocket')
          }
        } catch (wsError) {
          console.error('❌ Error sending real-time group invite notification:', wsError)
        }
      }
    } catch (notificationError) {
      console.error('Error sending group invitation notification:', notificationError)
    }

    return NextResponse.json({ success: true, message: 'Invitation sent' })
  } catch (error) {
    console.error('Error sending invitation:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Respond to invitation (accept/decline)
export async function PUT(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token')?.value
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const decoded = authDb.verifyToken(authToken)
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { groupId, invitationId, status } = body // support both shapes

    if (!status || !['accepted', 'declined'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Valid status is required' },
        { status: 400 }
      )
    }

    // Resolve invitation either by id or by (groupId, invitee)
    let invitation: any = null
    if (invitationId) {
      invitation = await getInvitationById(invitationId)
    } else if (groupId) {
      invitation = await getInvitation(groupId, decoded.id)
    }
    if (!invitation || invitation.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'No pending invitation found' },
        { status: 404 }
      )
    }

    await updateInvitationStatus(invitation.id, status)

    if (status === 'accepted') {
      // Add user to group members
      const group = await getGroupFromDB(invitation.group_id)
      const members = JSON.parse(group.members || '[]')
      if (!members.includes(decoded.id)) {
        members.push(decoded.id)
        await updateGroupMembers(invitation.group_id, members)
        
        // Send real-time notification to group members about new member
        try {
          const user = await authDb.getUserById(decoded.id);
          const wsResponse = await fetch('http://localhost:3001', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'member_added',
              groupId: invitation.group_id,
              data: {
                userId: decoded.id,
                username: user?.username,
                displayName: user?.display_name || user?.displayName,
                avatar: user?.avatar,
                groupName: group.name
              }
            })
          })
          
          if (wsResponse.ok) {
            console.log('✅ Real-time member added notification sent via WebSocket')
          }
        } catch (wsError) {
          console.error('❌ Error sending real-time member added notification:', wsError)
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Invitation updated' })
  } catch (error) {
    console.error('Error responding to invitation:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get current user's invitations
export async function GET(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token')?.value
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const decoded = authDb.verifyToken(authToken)
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Clean up expired invitations first
    await cleanupExpiredInvitations()

    const invitations = await listInvitations(decoded.id)
    return NextResponse.json({ success: true, invitations })
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getGroupFromDB(groupId: string) {
  const sqlite3 = require('sqlite3').verbose()
  const path = require('path')
  const dbPath = path.join(process.cwd(), 'threads_app.db')
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath)
    const query = 'SELECT * FROM groups WHERE id = ? AND is_deleted = 0'
    db.get(query, [groupId], (err: any, row: any) => {
      if (err) {
        reject(err)
        return
      }
      db.close()
      resolve(row)
    })
  })
}

async function checkMutualFollow(userId1: string, userId2: string): Promise<boolean> {
  const user1 = await authDb.getUserById(userId1)
  const user2 = await authDb.getUserById(userId2)
  if (!user1 || !user2) return false
  const user1Following = JSON.parse(user1.following || '[]')
  const user2Following = JSON.parse(user2.following || '[]')
  return user1Following.includes(userId2) && user2Following.includes(userId1)
}

async function upsertInvitation({ groupId, inviterId, inviteeId }: { groupId: string, inviterId: string, inviteeId: string }) {
  const sqlite3 = require('sqlite3').verbose()
  const path = require('path')
  const dbPath = path.join(process.cwd(), 'threads_app.db')
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath)
    const select = 'SELECT id, status FROM group_invitations WHERE group_id = ? AND invitee_id = ?'
    db.get(select, [groupId, inviteeId], (err: any, row: any) => {
      if (err) {
        db.close()
        reject(err)
        return
      }
      const now = new Date().toISOString()
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now
      
      if (row) {
        // Update existing to pending and inviter
        const update = 'UPDATE group_invitations SET inviter_id = ?, status = \"pending\", responded_at = NULL, expires_at = ? WHERE id = ?'
        db.run(update, [inviterId, expiresAt, row.id], function(updateErr: any) {
          db.close()
          if (updateErr) {
            reject(updateErr)
            return
          }
          resolve(this.changes)
        })
      } else {
        const id = `invite_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
        const insert = 'INSERT INTO group_invitations (id, group_id, inviter_id, invitee_id, status, created_at, expires_at) VALUES (?, ?, ?, ?, \"pending\", CURRENT_TIMESTAMP, ?)'
        db.run(insert, [id, groupId, inviterId, inviteeId, expiresAt], function(insertErr: any) {
          db.close()
          if (insertErr) {
            reject(insertErr)
            return
          }
          resolve(this.lastID)
        })
      }
    })
  })
}

async function getInvitation(groupId: string, inviteeId: string) {
  const sqlite3 = require('sqlite3').verbose()
  const path = require('path')
  const dbPath = path.join(process.cwd(), 'threads_app.db')
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath)
    const query = 'SELECT * FROM group_invitations WHERE group_id = ? AND invitee_id = ?'
    db.get(query, [groupId, inviteeId], (err: any, row: any) => {
      if (err) {
        reject(err)
        return
      }
      db.close()
      resolve(row)
    })
  })
}

async function getInvitationById(invitationId: string) {
  const sqlite3 = require('sqlite3').verbose()
  const path = require('path')
  const dbPath = path.join(process.cwd(), 'threads_app.db')
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath)
    const query = 'SELECT * FROM group_invitations WHERE id = ?'
    db.get(query, [invitationId], (err: any, row: any) => {
      if (err) {
        reject(err)
        return
      }
      db.close()
      resolve(row)
    })
  })
}

async function updateInvitationStatus(invitationId: string, status: 'accepted' | 'declined') {
  const sqlite3 = require('sqlite3').verbose()
  const path = require('path')
  const dbPath = path.join(process.cwd(), 'threads_app.db')
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath)
    const query = 'UPDATE group_invitations SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?'
    db.run(query, [status, invitationId], function(err: any) {
      if (err) {
        reject(err)
        return
      }
      db.close()
      resolve(this.changes)
    })
  })
}

async function updateGroupMembers(groupId: string, members: string[]) {
  const sqlite3 = require('sqlite3').verbose()
  const path = require('path')
  const dbPath = path.join(process.cwd(), 'threads_app.db')
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath)
    const query = 'UPDATE groups SET members = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    db.run(query, [JSON.stringify(members), groupId], function(err: any) {
      if (err) {
        reject(err)
        return
      }
      db.close()
      resolve(this.changes)
    })
  })
}

async function listInvitations(userId: string) {
  const sqlite3 = require('sqlite3').verbose()
  const path = require('path')
  const dbPath = path.join(process.cwd(), 'threads_app.db')
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath)
    const query = `
      SELECT gi.id, gi.group_id, gi.inviter_id, gi.status, gi.created_at, gi.responded_at, gi.expires_at,
             g.name as group_name, g.avatar as group_avatar,
             u.username as inviter_username, u.display_name as inviter_display_name, u.avatar as inviter_avatar
      FROM group_invitations gi
      JOIN groups g ON gi.group_id = g.id
      JOIN users u ON gi.inviter_id = u.id
      WHERE gi.invitee_id = ? 
        AND (gi.status != 'pending' OR gi.expires_at > datetime('now'))
      ORDER BY gi.created_at DESC
    `
    db.all(query, [userId], (err: any, rows: any[]) => {
      if (err) {
        reject(err)
        return
      }
      db.close()
      resolve(rows)
    })
  })
}

// Helper to create a notification for the user
async function createNotification(userId: string, type: string, message: string, relatedId: string) {
  const sqlite3 = require('sqlite3').verbose()
  const path = require('path')
  const dbPath = path.join(process.cwd(), 'threads_app.db')
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath)
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    const query = `
      INSERT INTO notifications (id, user_id, type, message, related_id, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `
    db.run(query, [notificationId, userId, type, message, relatedId], function(err: any) {
      if (err) {
        reject(err)
        return
      }
      db.close()
      resolve(this.lastID)
    })
  })
}

// Clean up expired invitations
async function cleanupExpiredInvitations() {
  const sqlite3 = require('sqlite3').verbose()
  const path = require('path')
  const dbPath = path.join(process.cwd(), 'threads_app.db')
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath)
    
    const query = `
      DELETE FROM group_invitations 
      WHERE status = 'pending' AND expires_at < ?
    `
    
    const now = new Date().toISOString()
    
    db.run(query, [now], function(err: any) {
      if (err) {
        console.error('❌ Error cleaning up expired invitations:', err)
        reject(err)
        return
      }
      
      if (this.changes > 0) {
        console.log(`🧹 Cleaned up ${this.changes} expired invitations`)
      }
      
      db.close()
      resolve(this.changes)
    })
  })
}

// Duplicate definitions removed below to avoid conflicts

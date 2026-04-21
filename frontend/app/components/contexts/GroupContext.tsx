'use client'

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { useWebSocket } from './WebSocketContext'
import { useUser } from './UserContext'

// Types
export interface Group {
  id: string
  name: string
  description?: string
  avatar?: string
  members: string[]
  admins?: string[]
  createdBy: string
  memberCount?: number
  isMember?: boolean
  visibility?: 'public' | 'private'
  createdAt: Date | string
  threads?: string[]
  creator?: {
    id: string
    username: string
    displayName: string
    avatar?: string
  }
  // Real-time properties
  onlineMembers?: string[]
  typingUsers?: string[]
  lastActivity?: Date | string
}

// Context
interface GroupContextType {
  groups: Group[]
  setGroups: (groups: Group[]) => void
  addGroup: (group: Group) => void
  updateGroup: (groupId: string, updates: Partial<Group>) => void
  deleteGroup: (groupId: string) => void
  createGroup: (groupData: any) => Promise<void>
  loadGroups: () => Promise<void>
  // Real-time functions
  joinGroupRealtime: (groupId: string) => void
  leaveGroupRealtime: (groupId: string) => void
  sendGroupMessage: (groupId: string, content: string, messageType?: string, attachmentUrl?: string) => void
  sendTyping: (groupId: string) => void
  sendStopTyping: (groupId: string) => void
}

const GroupContext = createContext<GroupContextType | undefined>(undefined)

export function useGroup() {
  const context = useContext(GroupContext)
  if (context === undefined) {
    throw new Error('useGroup must be used within a GroupProvider')
  }
  return context
}

// Mock data
const mockGroups: Group[] = [
  {
    id: '1',
    name: 'Tech Enthusiasts',
    description: 'Discussion about latest technology trends and innovations',
    avatar: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=150&h=150&fit=crop',
    members: ['1', '2', '3', '5'],
    admins: ['1'],
    createdBy: '1',
    createdAt: new Date('2023-01-01'),
    threads: [],
  },
  {
    id: '2',
    name: 'Design Community',
    description: 'Share your designs and get feedback from fellow designers',
    avatar: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=150&h=150&fit=crop',
    members: ['2', '4', '6'],
    admins: ['2'],
    createdBy: '2',
    createdAt: new Date('2023-01-02'),
    threads: [],
  },
  {
    id: '3',
    name: 'Photography Lovers',
    description: 'Showcase your photography and learn from others',
    avatar: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=150&h=150&fit=crop',
    members: ['3', '1', '4'],
    admins: ['3'],
    createdBy: '3',
    createdAt: new Date('2023-01-03'),
    threads: [],
  },
  {
    id: '4',
    name: 'Startup Founders',
    description: 'Group for startup founders to share experiences',
    avatar: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=150&h=150&fit=crop',
    members: ['5', '1'],
    admins: ['5'],
    createdBy: '5',
    createdAt: new Date('2023-01-04'),
    threads: [],
  },
]

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const userIdRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    userIdRef.current = user?.id
  }, [user?.id])

  const { isConnected, sendGroupMessage: wsSendGroupMessage, joinGroup: wsJoinGroup, leaveGroup: wsLeaveGroup, sendTyping: wsSendTyping, sendStopTyping: wsSendStopTyping } = useWebSocket()
  
  // De-duplicate groups by id while preserving order (first occurrence wins).
  const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
    const seen = new Set<string>()
    const out: T[] = []
    for (const item of items) {
      if (!item || !item.id || seen.has(item.id)) continue
      seen.add(item.id)
      out.push(item)
    }
    return out
  }

  const [groups, setGroups] = useState<Group[]>(() => {
    if (typeof window !== 'undefined') {
      const savedGroups = localStorage.getItem('threads-groups')
      if (savedGroups) {
        try {
          const parsed = JSON.parse(savedGroups).map((group: any) => ({
            ...group,
            createdAt: new Date(group.createdAt),
            onlineMembers: [],
            typingUsers: [],
            lastActivity: new Date()
          }))
          return dedupeById(parsed)
        } catch (error) {
          console.error('Error parsing saved groups:', error)
        }
      }
    }
    return mockGroups.map(group => ({
      ...group,
      onlineMembers: [],
      typingUsers: [],
      lastActivity: new Date()
    }))
  })

  // Idempotent: if a group with the same id already exists, keep the existing
  // entry (merging any new fields) instead of appending a duplicate. This is
  // critical because `createGroup` and the `group_created` websocket event
  // can both try to insert the same group.
  const addGroup = (group: Group) => {
    setGroups(prev => {
      const existing = prev.find(g => g.id === group.id)
      const next = existing
        ? prev.map(g => g.id === group.id ? { ...g, ...group } : g)
        : [...prev, group]
      if (typeof window !== 'undefined') {
        localStorage.setItem('threads-groups', JSON.stringify(next))
      }
      return next
    })
  }

  const updateGroup = (groupId: string, updates: Partial<Group>) => {
    setGroups(prev => {
      const updatedGroups = prev.map(group => 
        group.id === groupId ? { ...group, ...updates } : group
      )
      localStorage.setItem('threads-groups', JSON.stringify(updatedGroups))
      return updatedGroups
    })
  }

  const deleteGroup = (groupId: string) => {
    setGroups(prev => {
      const filteredGroups = prev.filter(group => group.id !== groupId)
      localStorage.setItem('threads-groups', JSON.stringify(filteredGroups))
      return filteredGroups
    })
  }

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/groups', {
        credentials: 'include',
      })
      const data = await response.json()
      
      if (data.success) {
        const mapped: Group[] = (data.groups || []).map((g: any) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          avatar: g.avatar,
          members: Array.isArray(g.members) ? g.members : [],
          admins: g.admins || [],
          createdBy: g.createdBy,
          memberCount: g.memberCount,
          isMember: g.isMember,
          visibility: g.visibility === 'private' ? 'private' : 'public',
          createdAt: g.createdAt,
          threads: g.threads || [],
          creator: g.creator,
          onlineMembers: [],
          typingUsers: [],
          lastActivity: new Date(),
        }))
        const unique = dedupeById(mapped)
        setGroups(unique)
        if (typeof window !== 'undefined') {
          localStorage.setItem('threads-groups', JSON.stringify(unique))
        }
      } else {
        console.error('Error loading groups:', data.error)
        // Fallback to mock data
        setGroups(mockGroups)
      }
    } catch (error) {
      console.error('Error loading groups:', error)
      // Fallback to mock data
      setGroups(mockGroups)
    }
  }

  const createGroup = async (groupData: any) => {
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(groupData),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.group) addGroup(data.group)
      } else {
        const errBody = await response.json().catch(() => ({}))
        throw new Error(errBody.error || 'Failed to create group')
      }
    } catch (err) {
      console.error('Error creating group:', err)
      throw err
    }
  }

  // Real-time WebSocket message handlers.
  // The listener is registered once and relies on functional setState updates
  // so it always sees the freshest groups list without re-registering per change.
  useEffect(() => {
    const persist = (next: Group[]) => {
      try {
        localStorage.setItem('threads-groups', JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    }

    const applyUpdate = (groupId: string, updates: Partial<Group>) => {
      setGroups(prev => persist(prev.map(g => g.id === groupId ? { ...g, ...updates } : g)))
    }

    const handleWebSocketMessage = (event: Event) => {
      try {
        const message = (event as CustomEvent).detail
        if (!message || !message.type) return

        switch (message.type) {
          case 'group_created': {
            console.log('🆕 Group created:', message.data)
            const incoming = message.data?.group
            if (!incoming) return
            const mem = Array.isArray(incoming.members) ? incoming.members : []
            const vis = incoming.visibility === 'private' ? 'private' : 'public'
            const uid = userIdRef.current
            if (vis === 'private' && (!uid || !mem.includes(uid))) break
            setGroups(prev => {
              if (prev.some(g => g.id === incoming.id)) return prev
              const next: Group = {
                ...incoming,
                members: mem,
                visibility: vis,
                onlineMembers: [],
                typingUsers: [],
                lastActivity: new Date(),
              }
              return persist([...prev, next])
            })
            break
          }

          case 'group_updated': {
            console.log('🔄 Group updated:', message.data)
            const { groupId, updates, group } = message.data || {}
            const dropIfPrivate = (g: Group) => {
              const v = g.visibility === 'private' ? 'private' : 'public'
              const uid = userIdRef.current
              const m = g.members || []
              return v === 'private' && (!uid || !m.includes(uid))
            }
            if (group && group.id) {
              const merged: Group = {
                ...group,
                members: Array.isArray(group.members) ? group.members : [],
                visibility: group.visibility === 'private' ? 'private' : 'public',
              }
              if (dropIfPrivate(merged)) {
                setGroups(prev => persist(prev.filter((g) => g.id !== merged.id)))
              } else {
                applyUpdate(group.id, merged)
              }
            } else if (groupId && updates) {
              setGroups((prev) => {
                const next = prev.map((g) => (g.id === groupId ? { ...g, ...updates } : g))
                const hit = next.find((g) => g.id === groupId)
                if (hit && dropIfPrivate(hit)) {
                  return persist(prev.filter((g) => g.id !== groupId))
                }
                return persist(next)
              })
            }
            break
          }

          case 'group_deleted': {
            console.log('🗑️ Group deleted:', message.data)
            const { groupId } = message.data || {}
            if (!groupId) return
            setGroups(prev => persist(prev.filter(g => g.id !== groupId)))
            break
          }

          case 'group_member_joined': {
            console.log('👋 Member joined group:', message.data)
            const { groupId, userId, members } = message.data || {}
            if (!groupId) return
            setGroups(prev => persist(prev.map(g => {
              if (g.id !== groupId) return g
              const nextMembers = Array.isArray(members)
                ? members
                : (g.members.includes(userId) ? g.members : [...g.members, userId])
              return { ...g, members: nextMembers, memberCount: nextMembers.length, lastActivity: new Date() }
            })))
            break
          }

          case 'group_member_left': {
            console.log('👋 Member left group:', message.data)
            const { groupId, userId, members } = message.data || {}
            if (!groupId) return
            setGroups(prev => persist(prev.map(g => {
              if (g.id !== groupId) return g
              const nextMembers = Array.isArray(members)
                ? members
                : g.members.filter(id => id !== userId)
              return { ...g, members: nextMembers, memberCount: nextMembers.length, lastActivity: new Date() }
            })))
            break
          }

          case 'group_message': {
            console.log('💬 Group message received:', message.data)
            const groupId = message.data?.group_id || message.data?.groupId
            if (!groupId) return
            applyUpdate(groupId, { lastActivity: new Date() })
            break
          }

          case 'user_typing': {
            const { groupId, userId } = message.data || {}
            if (!groupId || !userId) return
            setGroups(prev => persist(prev.map(g => {
              if (g.id !== groupId) return g
              const typing = (g.typingUsers || []).filter(id => id !== userId)
              return { ...g, typingUsers: [...typing, userId] }
            })))
            break
          }

          case 'user_stopped_typing': {
            const { groupId, userId } = message.data || {}
            if (!groupId || !userId) return
            setGroups(prev => persist(prev.map(g => {
              if (g.id !== groupId) return g
              return { ...g, typingUsers: (g.typingUsers || []).filter(id => id !== userId) }
            })))
            break
          }

          case 'user_online': {
            const { userId } = message.data || {}
            if (!userId) return
            setGroups(prev => persist(prev.map(group =>
              group.members.includes(userId)
                ? { ...group, onlineMembers: [...(group.onlineMembers || []).filter(id => id !== userId), userId] }
                : group
            )))
            break
          }

          case 'user_offline': {
            const { userId } = message.data || {}
            if (!userId) return
            setGroups(prev => persist(prev.map(group =>
              group.members.includes(userId)
                ? { ...group, onlineMembers: (group.onlineMembers || []).filter(id => id !== userId) }
                : group
            )))
            break
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error)
      }
    }

    window.addEventListener('websocket-message', handleWebSocketMessage as EventListener)
    return () => {
      window.removeEventListener('websocket-message', handleWebSocketMessage as EventListener)
    }
  }, [])

  // Real-time functions
  const joinGroupRealtime = (groupId: string) => {
    if (isConnected) {
      wsJoinGroup(groupId)
      console.log('🔌 Joining group real-time:', groupId)
    }
  }

  const leaveGroupRealtime = (groupId: string) => {
    if (isConnected) {
      wsLeaveGroup(groupId)
      console.log('🔌 Leaving group real-time:', groupId)
    }
  }

  const sendGroupMessage = (groupId: string, content: string, messageType: string = 'text', attachmentUrl?: string) => {
    if (isConnected) {
      wsSendGroupMessage(groupId, content, messageType, attachmentUrl)
      console.log('💬 Sending group message:', { groupId, content, messageType })
    }
  }

  const sendTyping = (groupId: string) => {
    if (isConnected) {
      wsSendTyping(groupId)
    }
  }

  const sendStopTyping = (groupId: string) => {
    if (isConnected) {
      wsSendStopTyping(groupId)
    }
  }

  // Load groups on mount
  useEffect(() => {
    loadGroups()
  }, [])

  const value: GroupContextType = {
    groups,
    setGroups,
    addGroup,
    updateGroup,
    deleteGroup,
    createGroup,
    loadGroups,
    // Real-time functions
    joinGroupRealtime,
    leaveGroupRealtime,
    sendGroupMessage,
    sendTyping,
    sendStopTyping,
  }

  return (
    <GroupContext.Provider value={value}>
      {children}
    </GroupContext.Provider>
  )
}

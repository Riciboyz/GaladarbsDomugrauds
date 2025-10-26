'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useUser } from './UserContext'
import { io, Socket } from 'socket.io-client'

interface WebSocketMessage {
  type: string
  data: any
}

interface WebSocketContextType {
  isConnected: boolean
  lastMessage: WebSocketMessage | null
  sendMessage: (message: WebSocketMessage) => boolean
  sendGroupMessage: (groupId: string, content: string, messageType?: string, attachmentUrl?: string) => boolean
  joinGroup: (groupId: string) => boolean
  leaveGroup: (groupId: string) => boolean
  sendTyping: (groupId: string) => boolean
  sendStopTyping: (groupId: string) => boolean
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

interface WebSocketProviderProps {
  children: ReactNode
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const { user } = useUser()

  useEffect(() => {
    console.log('🔌 WebSocketProvider: Initializing Socket.IO connection...')
    
    const connect = () => {
      // Prevent duplicate connections
      if (socket) return
      
      const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
      const newSocket = io(WS_URL, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      })
      setSocket(newSocket)
      
      newSocket.on('connect', () => {
        console.log('🔌 WebSocketProvider: Connected to Socket.IO')
        setIsConnected(true)
        
        // Register user for notifications and authenticate if user is logged in
        if (user) {
          const token = document.cookie
            .split('; ')
            .find(row => row.startsWith('auth-token='))
            ?.split('=')[1]
          
          console.log('🔐 WebSocketProvider: Registering user for notifications:', user.id)
          newSocket.emit('register', {
            userId: user.id,
            token: token || undefined
          })
          
          if (token) {
            console.log('🔐 WebSocketProvider: Authenticating with token:', token.substring(0, 20) + '...')
            newSocket.emit('authenticate', { token })
          } else {
            console.log('🔐 WebSocketProvider: No auth token found')
          }
        } else {
          console.log('🔐 WebSocketProvider: No user logged in')
        }
      })
      
      newSocket.on('disconnect', () => {
        console.log('🔌 WebSocketProvider: Disconnected from Socket.IO')
        setIsConnected(false)
      })
      
      newSocket.on('connect_error', (error) => {
        console.error('❌ WebSocketProvider: Connection error:', error)
        setIsConnected(false)
      })
      
      // Listen for thread events
      newSocket.on('thread_created', (data) => {
        console.log('📝 WebSocketProvider: Thread created via Socket.IO:', data)
        const message = { type: 'thread_created', data }
        setLastMessage(message)
        window.dispatchEvent(new CustomEvent('websocket-message', { 
          detail: message
        }))
      })
      
      newSocket.on('thread_updated', (data) => {
        console.log('📝 WebSocketProvider: Thread updated via Socket.IO:', data)
        const message = { type: 'thread_updated', data }
        setLastMessage(message)
        window.dispatchEvent(new CustomEvent('websocket-message', { 
          detail: message
        }))
      })
      
      // Handle different message types
      newSocket.on('message', (data) => {
        console.log('📨 WebSocketProvider: Received message:', data.type)
        setLastMessage(data)
        
        // Dispatch message to window for other components to listen
        window.dispatchEvent(new CustomEvent('websocket-message', { 
          detail: data
        }))
        
        // Handle different message types
        switch (data.type) {
          case 'authenticated':
            console.log('✅ WebSocketProvider: Authentication successful')
            break
          case 'auth_error':
            console.error('❌ WebSocketProvider: Authentication failed:', data.message)
            break
          case 'group_message':
            console.log('💬 WebSocketProvider: Group message received:', data)
            break
          case 'user_typing':
            console.log('⌨️ WebSocketProvider: User typing:', data)
            break
          case 'user_stopped_typing':
            console.log('⌨️ WebSocketProvider: User stopped typing:', data)
            break
          case 'new_thread':
          case 'thread_created':
            console.log('📝 WebSocketProvider: New thread received:', data)
            break
          case 'thread_updated':
            console.log('📝 WebSocketProvider: Thread updated:', data)
            break
          case 'thread_deleted':
            console.log('📝 WebSocketProvider: Thread deleted:', data)
            break
          case 'notification':
            console.log('📬 WebSocketProvider: Notification received:', data)
            // Dispatch notification event for other components
            window.dispatchEvent(new CustomEvent('notification-received', { 
              detail: data 
            }))
            break
          case 'member_added':
            console.log('👥 WebSocketProvider: Member added:', data)
            // Dispatch member added event
            window.dispatchEvent(new CustomEvent('member_added', { 
              detail: data 
            }))
            break
          case 'member_removed':
            console.log('👥 WebSocketProvider: Member removed:', data)
            // Dispatch member removed event
            window.dispatchEvent(new CustomEvent('member_removed', { 
              detail: data 
            }))
            break
          case 'added_to_group':
            console.log('👥 WebSocketProvider: Added to group:', data)
            // Dispatch added to group event
            window.dispatchEvent(new CustomEvent('added_to_group', { 
              detail: data 
            }))
            break
          case 'removed_from_group':
            console.log('👥 WebSocketProvider: Removed from group:', data)
            // Dispatch removed from group event
            window.dispatchEvent(new CustomEvent('removed_from_group', { 
              detail: data 
            }))
            break
          case 'invite_expired':
            console.log('⏰ WebSocketProvider: Invite expired:', data)
            // Dispatch invite expired event
            window.dispatchEvent(new CustomEvent('invite_expired', { 
              detail: data 
            }))
            break
          case 'topic_submission_created':
            console.log('📝 WebSocketProvider: Topic submission created:', data)
            // Dispatch topic submission created event
            window.dispatchEvent(new CustomEvent('topic_submission_created', { 
              detail: data 
            }))
            break
          case 'topic_submission_notification':
            console.log('📬 WebSocketProvider: Topic submission notification:', data)
            // Dispatch topic submission notification event
            window.dispatchEvent(new CustomEvent('topic_submission_notification', { 
              detail: data 
            }))
            break
          case 'group_invite_notification':
            console.log('📬 WebSocketProvider: Group invite notification:', data)
            // Dispatch group invite notification event
            window.dispatchEvent(new CustomEvent('group_invite_notification', { 
              detail: data 
            }))
            break
          case 'group_created':
            console.log('🏗️ WebSocketProvider: Group created notification:', data)
            // Dispatch group created event
            window.dispatchEvent(new CustomEvent('group_created', { 
              detail: data 
            }))
            break
          case 'profile_updated':
            console.log('👤 WebSocketProvider: Profile updated notification:', data)
            // Dispatch profile updated event
            window.dispatchEvent(new CustomEvent('profile_updated', { 
              detail: data 
            }))
            break
          case 'notification_update':
            console.log('📬 WebSocketProvider: Notification update received:', data)
            // Dispatch notification update event for cross-tab synchronization
            window.dispatchEvent(new CustomEvent('notification-update', { 
              detail: data 
            }))
            break
          case 'registered':
            console.log('✅ WebSocketProvider: User registered for notifications')
            break
          default:
            console.log('📨 WebSocketProvider: Unknown message type:', data.type, data)
        }
      })
      
      // Store Socket.IO instance globally for other hooks to use
      ;(window as any).__socket = newSocket
    }
    
    connect()
    
    return () => {
      if (socket) {
        socket.disconnect()
        setSocket(null)
      }
    }
  }, [user?.id]) // Only depend on user ID, not the entire user object

  const sendMessage = (message: WebSocketMessage): boolean => {
    if (socket && socket.connected) {
      socket.emit('message', message)
      return true
    }
    return false
  }

  const sendGroupMessage = (groupId: string, content: string, messageType: string = 'text', attachmentUrl?: string): boolean => {
    const token = typeof document !== 'undefined'
      ? document.cookie.split('; ').find(r => r.startsWith('auth-token='))?.split('=')[1]
      : undefined
    console.log('🔌 WebSocketContext: Sending group message:', { groupId, content, messageType, hasToken: !!token })
    return sendMessage({
      type: 'group_message',
      data: { groupId, content, messageType, attachmentUrl, token }
    })
  }

  const joinGroup = (groupId: string): boolean => {
    const token = typeof document !== 'undefined'
      ? document.cookie.split('; ').find(r => r.startsWith('auth-token='))?.split('=')[1]
      : undefined
    console.log('🔌 WebSocketContext: Joining group:', groupId, 'with token:', token ? 'yes' : 'no')
    return sendMessage({
      type: 'join_group',
      data: { groupId, token }
    })
  }

  const leaveGroup = (groupId: string): boolean => {
    console.log('🔌 WebSocketContext: Leaving group:', groupId)
    return sendMessage({
      type: 'leave_group',
      data: { groupId }
    })
  }

  const sendTyping = (groupId: string): boolean => {
    return sendMessage({
      type: 'typing',
      data: { groupId }
    })
  }

  const sendStopTyping = (groupId: string): boolean => {
    return sendMessage({
      type: 'stop_typing',
      data: { groupId }
    })
  }

  const value: WebSocketContextType = {
    isConnected,
    lastMessage,
    sendMessage,
    sendGroupMessage,
    joinGroup,
    leaveGroup,
    sendTyping,
    sendStopTyping
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}
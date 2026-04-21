'use client'

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
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
  sendDmMessage: (
    conversationId: string,
    content: string,
    messageType?: string,
    attachmentUrl?: string,
    replyToMessageId?: string
  ) => boolean
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

// Events that should be forwarded 1:1 to the global `websocket-message` bus.
const FORWARDED_EVENTS = [
  'thread_created',
  'thread_updated',
  'thread_deleted',
  'new_notification',
  'group_created',
  'group_updated',
  'group_deleted',
  'group_member_joined',
  'group_member_left',
  'group_message',
  'dm_message',
  'dm_error',
  'user_typing',
  'user_stopped_typing',
  'user_online',
  'user_offline',
  'registered',
  'daily_topic_active_set',
  'daily_topic_updated',
  'daily_topic_deleted',
  'topic_submission_created',
  'topic_suggestion_created',
  'topic_suggestion_updated',
  'topic_suggestion_deleted',
  'topic_suggestion_vote_updated',
  'feature_suggestion_created',
  'feature_suggestion_updated',
  'feature_suggestion_deleted',
  'feature_suggestion_vote_updated',
] as const

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const { user } = useUser()
  const userIdRef = useRef<string | undefined>(user?.id)

  useEffect(() => {
    userIdRef.current = user?.id
  }, [user?.id])

  useEffect(() => {
    console.log('🔌 WebSocketProvider: Initializing Socket.IO connection...')

    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'
    const newSocket: Socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      withCredentials: true,
    })

    const publishEvent = (type: string, data: any) => {
      const message = { type, data }
      setLastMessage(message)
      window.dispatchEvent(new CustomEvent('websocket-message', { detail: message }))
    }

    const registerIfPossible = () => {
      const uid = userIdRef.current
      if (uid) {
        console.log('🔐 WebSocketProvider: Registering user for notifications:', uid)
        newSocket.emit('register', { userId: uid })
      } else {
        console.log('🔐 WebSocketProvider: No user yet, skipping register')
      }
    }

    newSocket.on('connect', () => {
      console.log('🔌 WebSocketProvider: Connected to Socket.IO')
      setIsConnected(true)
      registerIfPossible()
    })

    newSocket.on('disconnect', () => {
      console.log('🔌 WebSocketProvider: Disconnected from Socket.IO')
      setIsConnected(false)
    })

    newSocket.on('connect_error', (error) => {
      console.error('❌ WebSocketProvider: Connection error:', error)
      setIsConnected(false)
    })

    for (const eventName of FORWARDED_EVENTS) {
      newSocket.on(eventName, (data: any) => {
        publishEvent(eventName, data)
      })
    }

    newSocket.on('message', (data: any) => publishEvent(data?.type || 'message', data?.data ?? data))

    setSocket(newSocket)
    ;(window as any).__socket = newSocket

    return () => {
      newSocket.disconnect()
      setSocket(null)
      setIsConnected(false)
      if ((window as any).__socket === newSocket) {
        delete (window as any).__socket
      }
    }
  }, [])

  // Re-register with the server when the authenticated user changes while the
  // socket is already connected (e.g. login happens after the initial connect).
  useEffect(() => {
    if (!socket || !socket.connected) return
    if (!user?.id) return
    console.log('🔐 WebSocketProvider: Re-registering user after user change:', user.id)
    socket.emit('register', { userId: user.id })
  }, [socket, user?.id, isConnected])

  const sendMessage = (message: WebSocketMessage): boolean => {
    if (socket && socket.connected) {
      socket.emit(message.type, message.data)
      return true
    }
    return false
  }

  const sendGroupMessage = (groupId: string, content: string, messageType: string = 'text', attachmentUrl?: string): boolean => {
    console.log('🔌 WebSocketContext: Sending group message:', { groupId, content, messageType })
    return sendMessage({
      type: 'group_message',
      data: { groupId, content, messageType, attachmentUrl }
    })
  }

  const sendDmMessage = (
    conversationId: string,
    content: string,
    messageType: string = 'text',
    attachmentUrl?: string,
    replyToMessageId?: string
  ): boolean => {
    return sendMessage({
      type: 'dm_message',
      data: {
        conversationId,
        content,
        messageType,
        attachmentUrl: attachmentUrl || '',
        replyToMessageId: replyToMessageId || ''
      }
    })
  }

  const joinGroup = (groupId: string): boolean => {
    console.log('🔌 WebSocketContext: Joining group:', groupId)
    return sendMessage({
      type: 'join_group',
      data: { groupId }
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
    const uid = userIdRef.current
    if (!uid) return false
    return sendMessage({
      type: 'typing',
      data: { groupId, userId: uid }
    })
  }

  const sendStopTyping = (groupId: string): boolean => {
    const uid = userIdRef.current
    if (!uid) return false
    return sendMessage({
      type: 'stop_typing',
      data: { groupId, userId: uid }
    })
  }

  const value: WebSocketContextType = {
    isConnected,
    lastMessage,
    sendMessage,
    sendGroupMessage,
    sendDmMessage,
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

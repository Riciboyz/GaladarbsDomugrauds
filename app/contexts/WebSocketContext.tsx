'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useUser } from './UserContext'

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
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const { user } = useUser()
  // Keep refs for stability logic
  const reconnectAttemptsRef = (globalThis as any).__wsReconnectAttemptsRef || { current: 0 }
  ;(globalThis as any).__wsReconnectAttemptsRef = reconnectAttemptsRef
  const heartbeatTimerRef = (globalThis as any).__wsHeartbeatTimerRef || { current: null as any }
  ;(globalThis as any).__wsHeartbeatTimerRef = heartbeatTimerRef
  const connectInProgressRef = (globalThis as any).__wsConnectInProgressRef || { current: false }
  ;(globalThis as any).__wsConnectInProgressRef = connectInProgressRef

  useEffect(() => {
    console.log('🔌 WebSocketProvider: Initializing WebSocket connection...')
    
    const connect = () => {
      // Prevent duplicate connections
      if (ws || connectInProgressRef.current) return
      connectInProgressRef.current = true
      
      const websocket = new WebSocket('ws://localhost:3001')
      setWs(websocket)
      
      websocket.onopen = () => {
        console.log('🔌 WebSocketProvider: Connected to WebSocket')
        setIsConnected(true)
        reconnectAttemptsRef.current = 0
        connectInProgressRef.current = false

        // Start heartbeat pings
        if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
        heartbeatTimerRef.current = setInterval(() => {
          try {
            if (websocket.readyState === WebSocket.OPEN) {
              websocket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
            }
          } catch {}
        }, 25000)
        
        // Authenticate if user is logged in
        if (user) {
          const token = document.cookie
            .split('; ')
            .find(row => row.startsWith('auth-token='))
            ?.split('=')[1]
          
          if (token) {
            console.log('🔐 WebSocketProvider: Authenticating...')
            websocket.send(JSON.stringify({
              type: 'authenticate',
              data: { token }
            }))
          }
        }
      }
      
      websocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log('📨 WebSocketProvider: Received message:', message.type)
          setLastMessage(message)
          
          // Dispatch message to window for other components to listen
          window.dispatchEvent(new CustomEvent('websocket-message', { 
            detail: event.data 
          }))
          
          // Handle different message types
          switch (message.type) {
            case 'authenticated':
              console.log('✅ WebSocketProvider: Authentication successful')
              break
            case 'auth_error':
              console.error('❌ WebSocketProvider: Authentication failed:', message.data.message)
              break
            case 'group_message':
              console.log('💬 WebSocketProvider: Group message received')
              break
            case 'user_typing':
              console.log('⌨️ WebSocketProvider: User typing')
              break
            case 'user_stopped_typing':
              console.log('⌨️ WebSocketProvider: User stopped typing')
              break
            case 'new_thread':
              console.log('📝 WebSocketProvider: New thread received')
              break
            case 'thread_updated':
              console.log('📝 WebSocketProvider: Thread updated')
              break
            case 'thread_deleted':
              console.log('📝 WebSocketProvider: Thread deleted')
              break
            default:
              console.log('📨 WebSocketProvider: Unknown message type:', message.type)
          }
        } catch (error) {
          console.error('❌ WebSocketProvider: Error parsing message:', error)
        }
      }
      
      websocket.onclose = (event) => {
        console.log('🔌 WebSocketProvider: Disconnected:', event.code, event.reason)
        setIsConnected(false)
        setWs(null)
        connectInProgressRef.current = false
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current)
          heartbeatTimerRef.current = null
        }
        
        // Exponential backoff reconnect (max ~30s)
        const attempt = Math.min(reconnectAttemptsRef.current + 1, 6)
        reconnectAttemptsRef.current = attempt
        const delay = Math.min(3000 * Math.pow(2, attempt - 1), 30000)
        setTimeout(() => {
          console.log(`🔄 WebSocketProvider: Reconnecting (attempt ${attempt})...`)
          connect()
        }, delay)
      }
      
      websocket.onerror = (error) => {
        console.error('❌ WebSocketProvider: WebSocket error:', error)
      }
    }
    
    // Singleton: if a global websocket exists, reuse it
    if ((globalThis as any).__appWebSocket && (globalThis as any).__appWebSocket.readyState === WebSocket.OPEN) {
      setWs((globalThis as any).__appWebSocket)
      setIsConnected(true)
    } else {
      connect()
    }
    
    return () => {
      if (ws) {
        try { ws.close() } catch {}
        setWs(null)
      }
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
        heartbeatTimerRef.current = null
      }
    }
  }, [user])

  const sendMessage = (message: WebSocketMessage): boolean => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
      return true
    }
    return false
  }

  const sendGroupMessage = (groupId: string, content: string, messageType: string = 'text', attachmentUrl?: string): boolean => {
    return sendMessage({
      type: 'group_message',
      data: { groupId, content, messageType, attachmentUrl }
    })
  }

  const joinGroup = (groupId: string): boolean => {
    return sendMessage({
      type: 'join_group',
      data: { groupId }
    })
  }

  const leaveGroup = (groupId: string): boolean => {
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
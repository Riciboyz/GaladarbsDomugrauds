'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
import { useToast } from './ToastContext'
import { useUser } from './UserContext'

interface WebSocketMessage {
  type: 'thread_created' | 'thread_updated' | 'thread_deleted' | 'user_joined' | 'user_left' | 'notification_received' | 'follow_updated' | 'authenticate'
  data: any
}

interface WebSocketContextType {
  isConnected: boolean
  sendMessage: (message: WebSocketMessage) => void
  lastMessage: WebSocketMessage | null
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    // Return a default context instead of throwing an error
    return {
      isConnected: false,
      sendMessage: () => console.warn('WebSocket not available'),
      lastMessage: null
    }
  }
  return context
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { success, error: showError } = useToast()
  const { user } = useUser()

  const connect = () => {
    // Only connect in browser environment
    if (typeof window === 'undefined') return
    
    try {
      const ws = new WebSocket('ws://localhost:3001')
      
      ws.onopen = () => {
        console.log('🔌 WebSocket connected')
        setIsConnected(true)
        success('Connected', 'Real-time updates enabled')
        
        // Authenticate user if logged in
        if (user) {
          ws.send(JSON.stringify({
            type: 'authenticate',
            data: { userId: user.id }
          }))
          console.log('🔐 WebSocket authenticated for user:', user.id)
        }
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          setLastMessage(message)
          console.log('📨 WebSocket message received:', message)
          
          // Handle notification messages
          if (message.type === 'notification_received') {
            console.log('🔔 Real-time notification received:', message.data)
            // The notification will be handled by the notification context
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err)
        }
      }

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected')
        setIsConnected(false)
        
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect WebSocket...')
          connect()
        }, 3000)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        // Don't show error toast for connection failures, just log
        console.warn('WebSocket server not available - real-time features disabled')
      }

      wsRef.current = ws
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err)
      console.warn('WebSocket not available - real-time features disabled')
    }
  }

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, cannot send message')
    }
  }

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  // Authenticate when user changes
  useEffect(() => {
    if (isConnected && user && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'authenticate',
        data: { userId: user.id }
      }))
      console.log('🔐 WebSocket re-authenticated for user:', user.id)
    }
  }, [user, isConnected])

  const value: WebSocketContextType = {
    isConnected,
    sendMessage,
    lastMessage
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

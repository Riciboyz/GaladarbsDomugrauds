'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useUser } from '../contexts/UserContext'
import { useNotification } from '../contexts/NotificationContext'
import { useWebSocket } from '../contexts/WebSocketContext'

export function useRealtimeNotifications() {
  const { user } = useUser()
  const { addNotification } = useNotification()
  const { lastMessage } = useWebSocket()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!user) return

    // Poll for new notifications every 3 seconds
    const pollNotifications = async () => {
      try {
        console.log('🔄 Polling notifications for user:', user.id)
        const response = await fetch(`/api/notifications?userId=${user.id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('📬 Polled notifications response:', data)
          if (data.success && data.notifications) {
            // Check for new notifications
            data.notifications.forEach((notification: any) => {
              console.log('📬 Checking notification:', notification)
              if (notification.user_id === user.id && !notification.is_read) {
                // Check if notification already exists in state
                const existingNotification = document.querySelector(`[data-notification-id="${notification.id}"]`)
                if (!existingNotification) {
                  console.log('📬 Adding new notification from polling:', notification)
                  addNotification({
                    id: notification.id,
                    type: notification.type,
                    message: notification.message,
                    userId: notification.user_id,
                    read: notification.is_read,
                    createdAt: new Date(notification.created_at)
                  })
                } else {
                  console.log('📬 Notification already exists in UI, skipping')
                }
              } else {
                console.log('📬 Notification not for current user or already read, skipping')
              }
            })
          }
        } else {
          console.error('❌ Failed to poll notifications:', response.status)
        }
      } catch (error) {
        console.error('Error polling notifications:', error)
      }
    }

    // Start polling every 2 minutes (reduced frequency to improve performance)
    intervalRef.current = setInterval(pollNotifications, 120000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [user?.id, addNotification])

  // Handle real-time notifications via Socket.IO
  useEffect(() => {
    if (!user) return
    
    console.log('🔌 Starting Socket.IO connection for user:', user.id)
    let socket: Socket | null = null
    
    try {
      socket = io('http://localhost:3001', {
        transports: ['websocket'],
        withCredentials: false,
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      })

      socket.on('connect', () => {
        console.log('🔌 Socket.IO connected successfully')
        const token = typeof document !== 'undefined'
          ? document.cookie.split('; ').find(r => r.startsWith('auth-token='))?.split('=')[1]
          : undefined
        console.log('🔐 Registering with userId:', user.id, 'token:', token ? 'present' : 'missing')
        socket?.emit('register', { userId: user.id, token })
      })

      socket.on('registered', (data) => {
        console.log('✅ Socket.IO registered successfully:', data)
      })

      socket.on('auth_error', (err) => {
        console.error('❌ Socket.IO auth error:', err)
      })

      socket.on('notification', (n: any) => {
        console.log('🔔 Socket.IO notification received:', n)
        if (!n) return
        
        // Handle different notification formats
        const notificationData = n.notification || n
        const targetUserId = notificationData.toUserId || notificationData.userId || n.toUserId
        
        console.log('🔔 Processing notification for user:', user.id, 'target:', targetUserId)
        
        // Only add notification if it's for the current user
        if (targetUserId === user.id) {
          console.log('🔔 Adding notification to UI:', notificationData)
          addNotification({
            id: notificationData.id || `notif_${Date.now()}`,
            type: notificationData.type || 'notification',
            message: notificationData.message || 'New notification',
            userId: targetUserId,
            read: false,
            createdAt: new Date(notificationData.createdAt || Date.now())
          })
        } else {
          console.log('🔔 Notification not for current user, ignoring')
        }
      })

      socket.on('disconnect', (reason) => {
        console.log('🔌 Socket.IO disconnected:', reason)
      })

      socket.on('connect_error', (err) => {
        console.error('❌ Socket.IO connection error:', err)
      })

      // Fallback: if no connection after 30 seconds, try again
      const timeout = setTimeout(() => {
        if (!socket?.connected) {
          console.log('🔄 Socket.IO connection timeout, retrying...')
          socket?.connect()
        }
      }, 30000)

      return () => {
        clearTimeout(timeout)
        try { socket?.disconnect() } catch {}
      }
    } catch (e) {
      console.error('Socket.IO setup error:', e)
    }
  }, [user?.id, addNotification])

  // Note: Removed simulation code as we now have real automatic notifications
  // for likes, comments, follows, and group invitations

  const connectWebSocket = () => {
    console.log('WebSocket connection would be established here')
  }

  const disconnectWebSocket = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  return {
    connectWebSocket,
    disconnectWebSocket
  }
}

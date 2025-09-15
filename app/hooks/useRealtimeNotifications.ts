'use client'

import { useEffect, useRef } from 'react'
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
        const response = await fetch(`/api/notifications?userId=${user.id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.notifications) {
            // Check for new notifications
            data.notifications.forEach((notification: any) => {
              if (notification.userId === user.id && !notification.read) {
                // Check if notification already exists in state
                const existingNotification = document.querySelector(`[data-notification-id="${notification.id}"]`)
                if (!existingNotification) {
                  addNotification({
                    id: notification.id,
                    type: notification.type,
                    message: notification.message,
                    userId: notification.userId,
                    read: notification.read,
                    createdAt: new Date(notification.createdAt)
                  })
                }
              }
            })
          }
        }
      } catch (error) {
        console.error('Error polling notifications:', error)
      }
    }

    // Start polling
    intervalRef.current = setInterval(pollNotifications, 2000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [user, addNotification])

  // Handle real-time notifications from WebSocket
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'notification_received') {
      const notification = lastMessage.data
      if (notification && notification.userId === user?.id) {
        console.log('🔔 Processing real-time notification:', notification)
        addNotification({
          id: notification.id,
          type: notification.type,
          message: notification.message,
          userId: notification.userId,
          read: notification.read,
          createdAt: new Date(notification.createdAt)
        })
      }
    }
  }, [lastMessage, user, addNotification])

  // Simulate real-time notifications for demo purposes
  useEffect(() => {
    if (!user) return

    const simulateRealTimeNotifications = () => {
      // Only add notification occasionally (1% chance every 5 seconds)
      if (Math.random() > 0.99) {
        const notificationTypes = ['like', 'comment', 'follow', 'group_invite']
        const randomType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)]
        
        const messages = {
          like: 'Someone liked your thread! ❤️',
          comment: 'Someone commented on your thread! 💬',
          follow: 'Someone started following you! 👥',
          group_invite: 'You\'ve been invited to join a group! 🎉'
        }

        addNotification({
          id: Date.now().toString(),
          type: randomType as any,
          message: messages[randomType as keyof typeof messages],
          userId: user.id,
          read: false,
          createdAt: new Date()
        })
      }
    }

    // Simulate notifications every 5 seconds
    const simulationInterval = setInterval(simulateRealTimeNotifications, 5000)

    return () => {
      clearInterval(simulationInterval)
    }
  }, [user, addNotification])

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

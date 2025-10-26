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

    // Backup polling mechanism - only as fallback if WebSocket fails
    const pollNotifications = async () => {
      try {
        console.log('🔄 Backup polling notifications for user:', user.id)
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
              if (notification.userId === user.id && !notification.read) {
                // Check if notification already exists in state
                const existingNotification = document.querySelector(`[data-notification-id="${notification.id}"]`)
                if (!existingNotification) {
                  console.log('📬 Adding new notification from backup polling:', notification)
                  addNotification({
                    id: notification.id,
                    type: notification.type,
                    message: notification.message,
                    userId: notification.userId,
                    read: notification.read,
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

    // Start backup polling every 30 seconds (only as fallback)
    intervalRef.current = setInterval(pollNotifications, 30000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [user?.id, addNotification])

  // Handle real-time notifications via WebSocket
  useEffect(() => {
    if (!user) return
    
    console.log('🔌 Setting up notification listener for user:', user.id)
    
    // Listen for notification events from WebSocket context
    const handleNotificationEvent = (event: CustomEvent) => {
      try {
        const notification = event.detail
        console.log('📬 Received notification via event:', notification)
        addNotification(notification)
      } catch (error) {
        console.error('❌ Error handling notification event:', error)
      }
    }
    
    // Listen for notification updates (cross-tab synchronization)
    const handleNotificationUpdate = (event: CustomEvent) => {
      try {
        const notification = event.detail
        console.log('📬 Received notification update via event:', notification)
        // Only add if it's for the current user
        if (notification.userId === user.id) {
          addNotification(notification)
        }
      } catch (error) {
        console.error('❌ Error handling notification update event:', error)
      }
    }
    
    // Add event listeners for notifications
    window.addEventListener('notification-received', handleNotificationEvent as EventListener)
    window.addEventListener('notification-update', handleNotificationUpdate as EventListener)
    
    return () => {
      window.removeEventListener('notification-received', handleNotificationEvent as EventListener)
      window.removeEventListener('notification-update', handleNotificationUpdate as EventListener)
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

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useUser } from './UserContext'

// Types
export interface Notification {
  id: string
  userId: string
  type: 'like' | 'dislike' | 'comment' | 'follow' | 'topic_day' | 'dm'
  message: string
  read: boolean
  createdAt: Date
  relatedId?: string
}

// Context
interface NotificationContextType {
  notifications: Notification[]
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  markNotificationAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  loadNotificationsFromAPI: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotification() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

// Mock data
const mockNotifications: Notification[] = [
  {
    id: '1',
    userId: '1',
    type: 'like',
    message: 'Jane Smith liked your thread',
    read: false,
    createdAt: new Date('2023-12-01T10:30:00'),
    relatedId: '1'
  },
  {
    id: '2',
    userId: '1',
    type: 'follow',
    message: 'Sarah Jones started following you',
    read: false,
    createdAt: new Date('2023-12-01T11:00:00')
  },
  {
    id: '3',
    userId: '1',
    type: 'comment',
    message: 'Mike Wilson commented on your thread',
    read: true,
    createdAt: new Date('2023-12-01T12:00:00'),
    relatedId: '1'
  },
  {
    id: '4',
    userId: '1',
    type: 'topic_day',
    message: 'New topic day: "Show your pet" is now live!',
    read: false,
    createdAt: new Date('2023-12-01T09:00:00'),
    relatedId: '1'
  }
]

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { user } = useUser()

  // Load notifications from API when user is authenticated
  useEffect(() => {
    if (user?.id) {
      loadNotificationsFromAPI()
    } else {
      // Clear notifications when user logs out
      setNotifications([])
    }
  }, [user?.id]) // Only depend on user ID, not the entire user object

  // Listen for real-time notifications via the shared websocket-message bus.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (!detail || detail.type !== 'new_notification') return
      const raw = detail.data || {}
      const normalized: Notification = {
        id: raw.id,
        userId: raw.userId || raw.user_id,
        type: raw.type,
        message: raw.message || raw.title || '',
        read: !!raw.read,
        createdAt: new Date(raw.createdAt || raw.created_at || Date.now()),
        relatedId: raw.relatedId,
      }
      if (!normalized.id) return
      // Only accept notifications addressed to the currently logged-in user.
      if (user?.id && normalized.userId && normalized.userId !== user.id) return
      console.log('🔔 NotificationContext: Real-time notification received:', normalized)
      addNotification(normalized)
    }

    window.addEventListener('websocket-message', handler as EventListener)
    return () => window.removeEventListener('websocket-message', handler as EventListener)
  }, [user?.id])

  const loadNotificationsFromAPI = async () => {
    try {
      console.log('🔄 Loading notifications from API for user:', user?.id)
      const response = await fetch('/api/notifications', {
        credentials: 'include'
      })
      
      console.log('📡 Notifications API response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📡 Notifications API response data:', data)
      
      if (data.success) {
        // Convert string dates back to Date objects and normalize field names
        const notificationsWithDates = data.notifications.map((notification: any) => ({
          ...notification,
          userId: notification.userId, // Use consistent user ID field
          read: notification.read, // Use consistent read field
          createdAt: new Date(notification.createdAt || notification.created_at)
        }))
        setNotifications(notificationsWithDates)
        console.log('✅ Loaded notifications:', notificationsWithDates.length, 'notifications')
        console.log('📬 Notifications data:', notificationsWithDates)
      } else {
        console.error('❌ Failed to load notifications:', data.error)
        // Fallback to mock data if API fails
        setNotifications(mockNotifications)
      }
    } catch (error) {
      console.error('❌ Error loading notifications:', error)
      // Fallback to mock data if API fails
      setNotifications(mockNotifications)
    }
  }

  const addNotification = (notification: Notification) => {
    console.log('🔔 Adding notification:', notification)
    setNotifications(prev => {
      // Check if notification already exists to prevent duplicates
      const exists = prev.some(n => n.id === notification.id)
      if (exists) {
        console.log('🔔 Notification already exists, skipping duplicate')
        return prev
      }
      
      // Add new notification at the beginning
      const newNotifications = [notification, ...prev]
      console.log('🔔 Total notifications after adding:', newNotifications.length)
      return newNotifications
    })
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      // Optimistic UI update
      setNotifications(prev => prev.map(notification => 
        notification.id === notificationId ? { ...notification, read: true } : notification
      ))
      
      // Send API request to mark as read
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      
      if (!response.ok) {
        console.error('Failed to mark notification as read')
        // Revert optimistic update on failure
        setNotifications(prev => prev.map(notification => 
          notification.id === notificationId ? { ...notification, read: false } : notification
        ))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      // Revert optimistic update on error
      setNotifications(prev => prev.map(notification => 
        notification.id === notificationId ? { ...notification, read: false } : notification
      ))
    }
  }

  const markAllAsRead = async () => {
    try {
      // Optimistic UI update
      setNotifications(prev => prev.map(notification => ({ ...notification, read: true })))
      
      // Send API request to mark all as read
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      
      if (!response.ok) {
        console.error('Failed to mark all notifications as read')
        // Revert optimistic update on failure
        setNotifications(prev => prev.map(notification => ({ ...notification, read: false })))
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      // Revert optimistic update on error
      setNotifications(prev => prev.map(notification => ({ ...notification, read: false })))
    }
  }

  const value: NotificationContextType = {
    notifications,
    setNotifications,
    addNotification,
    markNotificationAsRead,
    markAllAsRead,
    loadNotificationsFromAPI,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

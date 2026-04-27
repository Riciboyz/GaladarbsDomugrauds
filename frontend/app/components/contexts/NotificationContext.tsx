'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useUser } from './UserContext'

// Types
export interface Notification {
  id: string
  userId: string
  type: 'like' | 'dislike' | 'comment' | 'follow' | 'topic_day' | 'dm' | 'group_added'
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

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { user } = useUser()

  const normalizeNotification = useCallback((raw: any): Notification | null => {
    if (!raw?.id) return null
    return {
      id: String(raw.id),
      userId: String(raw.userId || raw.user_id || ''),
      type: raw.type,
      message: raw.message || raw.title || '',
      read: raw.read === true || raw.read === 1 || raw.read === '1',
      createdAt: new Date(raw.createdAt || raw.created_at || Date.now()),
      relatedId: raw.relatedId || raw.related_id || raw?.data?.relatedId,
    }
  }, [])

  const loadNotificationsFromAPI = useCallback(async () => {
    if (!user?.id) return
    try {
      console.log('🔄 Loading notifications from API for user:', user.id)
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
        const notificationsNormalized = (
          (data.notifications || [])
            .map((notification: any) => normalizeNotification(notification))
            .filter(Boolean) as Notification[]
        )
          .filter((notification) => notification.userId === user.id)
        setNotifications(notificationsNormalized)
        console.log('✅ Loaded notifications:', notificationsNormalized.length, 'notifications')
      } else {
        console.error('❌ Failed to load notifications:', data.error)
        setNotifications([])
      }
    } catch (error) {
      console.error('❌ Error loading notifications:', error)
      setNotifications([])
    }
  }, [normalizeNotification, user?.id])

  // Load notifications from API when user is authenticated
  useEffect(() => {
    if (user?.id) {
      loadNotificationsFromAPI()
    } else {
      // Clear notifications when user logs out
      setNotifications([])
    }
  }, [user?.id, loadNotificationsFromAPI]) // Only depend on user ID, not the entire user object

  // Listen for real-time notifications via the shared websocket-message bus.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (!detail || detail.type !== 'new_notification') return
      const raw = detail.data || {}
      const normalized = normalizeNotification(raw)
      if (!normalized?.id) return
      // Only accept notifications addressed to the currently logged-in user.
      if (user?.id && normalized.userId && normalized.userId !== user.id) return
      console.log('🔔 NotificationContext: Real-time notification received:', normalized)
      addNotification(normalized)
    }

    window.addEventListener('websocket-message', handler as EventListener)
    return () => window.removeEventListener('websocket-message', handler as EventListener)
  }, [normalizeNotification, user?.id])

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

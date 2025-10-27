'use client'

import { useEffect, useState } from 'react'
import { useNotification } from '../../contexts/NotificationContext'
import { useUser } from '../../contexts/UserContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { 
  BellIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  UserPlusIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

export default function RealtimeNotificationsProvider() {
  const { notifications, markNotificationAsRead, markAllAsRead } = useNotification()
  const { user } = useUser()
  const { isConnected } = useWebSocket()
  const [lastNotificationCount, setLastNotificationCount] = useState(0)

  // Filter notifications for current user
  const filteredNotifications = notifications.filter(notification => {
    const notificationUserId = notification.userId || (notification as any).user_id
    return notificationUserId === user?.id
  })

  const unreadCount = filteredNotifications.filter(n => !n.read && !(n as any).is_read).length

  // Auto-refresh when new notifications arrive
  useEffect(() => {
    if (unreadCount > lastNotificationCount) {
      console.log('🔔 New notification detected! Count increased from', lastNotificationCount, 'to', unreadCount)
      // Force re-render by updating state
      setLastNotificationCount(unreadCount)
    }
  }, [unreadCount, lastNotificationCount])

  // Listen for WebSocket notification events
  useEffect(() => {
    if (!user) return

    const handleNotificationEvent = (event: CustomEvent) => {
      console.log('🔔 RealtimeNotificationsProvider: Received notification event:', event.detail)
      // The notification will be automatically added to context via useRealtimeNotifications hook
    }

    const handleNotificationUpdate = (event: CustomEvent) => {
      console.log('🔔 RealtimeNotificationsProvider: Received notification update:', event.detail)
      // Cross-tab synchronization
    }

    window.addEventListener('notification-received', handleNotificationEvent as EventListener)
    window.addEventListener('notification-update', handleNotificationUpdate as EventListener)

    return () => {
      window.removeEventListener('notification-received', handleNotificationEvent as EventListener)
      window.removeEventListener('notification-update', handleNotificationUpdate as EventListener)
    }
  }, [user?.id])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <HeartIcon className="w-5 h-5 text-red-500" />
      case 'dislike':
        return <HeartIcon className="w-5 h-5 text-gray-500 rotate-180" />
      case 'comment':
        return <ChatBubbleLeftIcon className="w-5 h-5 text-blue-500" />
      case 'follow':
        return <UserPlusIcon className="w-5 h-5 text-green-500" />
      default:
        return <BellIcon className="w-5 h-5 text-gray-500" />
    }
  }

  const getNotificationMessage = (notification: any) => {
    switch (notification.type) {
      case 'like':
        return `${notification.fromUser?.displayName || 'Someone'} liked your thread`
      case 'dislike':
        return `${notification.fromUser?.displayName || 'Someone'} disliked your thread`
      case 'comment':
        return `${notification.fromUser?.displayName || 'Someone'} commented on your thread`
      case 'follow':
        return `${notification.fromUser?.displayName || 'Someone'} started following you`
      default:
        return notification.message || 'New notification'
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      console.log('🔔 Marking notification as read:', notificationId)
      await markNotificationAsRead(notificationId)
      console.log('✅ Notification marked as read successfully')
    } catch (error) {
      console.error('❌ Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      console.log('🔔 Marking all notifications as read')
      await markAllAsRead()
      console.log('✅ All notifications marked as read successfully')
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header with connection status */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-1 text-gray-900">Notifications</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="body-regular text-gray-600">
                {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
              </p>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-500">
                {isConnected ? 'Live updates' : 'Offline'}
              </span>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="btn-secondary text-sm"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="card p-12 text-center">
            <BellIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="heading-3 text-gray-900 mb-2">
              No notifications yet
            </h3>
            <p className="body-regular text-gray-600">
              When you get notifications, they'll appear here automatically
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              data-notification-id={notification.id}
              className={`card-elevated transition-all duration-200 ${
                !notification.read && !(notification as any).is_read ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50/50 border-gray-200'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 ${
                    notification.read || (notification as any).is_read ? 'opacity-60' : ''
                  }`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`body-regular ${
                          notification.read || (notification as any).is_read ? 'text-gray-600' : 'text-gray-900'
                        }`}>
                          {getNotificationMessage(notification)}
                        </p>
                        <p className={`text-sm mt-1 ${
                          notification.read || (notification as any).is_read ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.read && !(notification as any).is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                        {!notification.read && !(notification as any).is_read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="btn-icon text-gray-400 hover:text-gray-600"
                          >
                            <CheckIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
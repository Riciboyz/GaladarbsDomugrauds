'use client'

import { useEffect } from 'react'
import { useNotification } from '../contexts/NotificationContext'
import { useUser } from '../contexts/UserContext'
import { 
  HeartIcon,
  ChatBubbleLeftIcon,
  UserPlusIcon,
  BellIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

export default function NotificationDropdown() {
  const { notifications, markNotificationAsRead, markAllAsRead } = useNotification()
  const { user } = useUser()

  const filteredNotifications = notifications.filter(notification => {
    // Only show notifications for current user - check both userId and user_id fields
    const notificationUserId = notification.userId || notification.user_id
    if (notificationUserId !== user?.id) return false
    
    // Only show unread notifications (hide read ones)
    return !notification.read && !notification.is_read
  })

  const unreadCount = notifications.filter(n => {
    const notificationUserId = n.userId || n.user_id
    return !n.read && !n.is_read && notificationUserId === user?.id
  }).length

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <HeartIcon className="w-4 h-4 text-red-500" />
      case 'dislike':
        return <HeartIcon className="w-4 h-4 text-gray-500 rotate-180" />
      case 'comment':
        return <ChatBubbleLeftIcon className="w-4 h-4 text-blue-500" />
      case 'follow':
        return <UserPlusIcon className="w-4 h-4 text-green-500" />
      default:
        return <BellIcon className="w-4 h-4 text-gray-500" />
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
      await markNotificationAsRead(notificationId)
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  if (!user) return null

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          <p className="text-xs text-gray-600">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-6">
            <BellIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No new notifications</p>
          </div>
        ) : (
          filteredNotifications.slice(0, 10).map((notification) => (
            <div
              key={notification.id}
              className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex-shrink-0 mt-0.5">
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 line-clamp-2">
                  {getNotificationMessage(notification)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>
              
              <div className="flex-shrink-0">
                <button
                  onClick={() => handleMarkAsRead(notification.id)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="Mark as read"
                >
                  <CheckIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {filteredNotifications.length > 10 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            View all notifications
          </button>
        </div>
      )}
    </div>
  )
}

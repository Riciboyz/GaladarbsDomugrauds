'use client'

import { useEffect } from 'react'
import { useNotification } from '../../contexts/NotificationContext'
import { useUser } from '../../contexts/UserContext'
import { useToast } from '../../contexts/ToastContext'
import { 
  BellIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  UserPlusIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

export default function Notifications() {
  const { notifications, markNotificationAsRead, markAllAsRead } = useNotification()
  const { user } = useUser()
  const { success, error: showError } = useToast()


  const filteredNotifications = notifications.filter(notification => {
    // Only show notifications for current user - check both userId and user_id fields
    const notificationUserId = notification.userId || (notification as any).user_id
    if (notificationUserId !== user?.id) return false
    
    // Only show unread notifications (hide read ones)
    return !notification.read && !(notification as any).is_read
  })

  const unreadCount = notifications.filter(n => {
    const notificationUserId = n.userId || (n as any).user_id
    return !n.read && !(n as any).is_read && notificationUserId === user?.id
  }).length

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

  return (
    <div className="max-w-2xl mx-auto">
      {/* Ultra-Minimal Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-1 text-gray-900">Notifications</h1>
            <p className="body-regular text-gray-600 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </p>
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
              When you get notifications, they'll appear here
            </p>
          </div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
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
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No notifications found
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
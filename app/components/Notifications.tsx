'use client'

import { useState, useEffect } from 'react'
import { useNotification } from '../contexts/NotificationContext'
import { useUser } from '../contexts/UserContext'
import { useToast } from '../contexts/ToastContext'
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications'
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
  const [filter, setFilter] = useState('all')
  const { connectWebSocket, disconnectWebSocket } = useRealtimeNotifications()

  // Connect to real-time notifications when component mounts
  useEffect(() => {
    connectWebSocket()
    return () => disconnectWebSocket()
  }, [connectWebSocket, disconnectWebSocket])

  const filteredNotifications = notifications.filter(notification => {
    // Only show notifications for current user
    if (notification.userId !== user?.id) return false
    
    if (filter === 'all') return true
    if (filter === 'unread') return !notification.read
    return notification.type === filter
  })

  const unreadCount = notifications.filter(n => !n.read && n.userId === user?.id).length

  // Debug logging
  useEffect(() => {
    console.log('🔔 Notifications component - Current user:', user?.id)
    console.log('🔔 Notifications component - All notifications:', notifications)
    console.log('🔔 Notifications component - Filtered notifications:', filteredNotifications)
  }, [notifications, user, filteredNotifications])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <HeartIcon className="w-5 h-5 text-red-500" />
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
      console.error('Error marking all as read:', error)
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

        {/* Filters */}
        <div className="flex items-center space-x-1 mt-4">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'like', label: 'Likes' },
            { id: 'comment', label: 'Comments' },
            { id: 'follow', label: 'Follows' }
          ].map((filterOption) => (
            <button
              key={filterOption.id}
              onClick={() => setFilter(filterOption.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                filter === filterOption.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="card p-12 text-center">
            <BellIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="heading-3 text-gray-900 mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="body-regular text-gray-600">
              {filter === 'unread' 
                ? 'You\'re all caught up!'
                : 'When you get notifications, they\'ll appear here'
              }
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`card-elevated transition-all duration-200 ${
                !notification.read ? 'bg-blue-50/50 border-blue-200' : ''
              }`}
            >
              <div className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="body-regular text-gray-900">
                          {getNotificationMessage(notification)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                        {!notification.read && (
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
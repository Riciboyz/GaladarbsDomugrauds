'use client'

import { useState } from 'react'
import { useApp } from '../providers'
import { formatDistanceToNow } from 'date-fns'
import { 
  BellIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  UserPlusIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  CheckIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartFilledIcon } from '@heroicons/react/24/solid'

export default function Notifications() {
  const { user, notifications, markNotificationAsRead, setNotifications } = useApp()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const userNotifications = notifications.filter(n => n.userId === user?.id)
  const filteredNotifications = filter === 'unread' 
    ? userNotifications.filter(n => !n.read)
    : userNotifications

  const unreadCount = userNotifications.filter(n => !n.read).length

  const handleMarkAsRead = (notificationId: string) => {
    markNotificationAsRead(notificationId)
  }

  const handleMarkAllAsRead = () => {
    userNotifications.forEach(notification => {
      if (!notification.read) {
        markNotificationAsRead(notification.id)
      }
    })
  }

  const handleDeleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <HeartFilledIcon className="h-5 w-5 text-red-500" />
      case 'comment':
        return <ChatBubbleLeftIcon className="h-5 w-5 text-blue-500" />
      case 'follow':
        return <UserPlusIcon className="h-5 w-5 text-green-500" />
      case 'topic_day':
        return <CalendarDaysIcon className="h-5 w-5 text-purple-500" />
      case 'group_invite':
        return <UserGroupIcon className="h-5 w-5 text-orange-500" />
      default:
        return <BellIcon className="h-5 w-5 text-secondary-500" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'like':
        return 'bg-red-50 border-red-200'
      case 'comment':
        return 'bg-blue-50 border-blue-200'
      case 'follow':
        return 'bg-green-50 border-green-200'
      case 'topic_day':
        return 'bg-purple-50 border-purple-200'
      case 'group_invite':
        return 'bg-orange-50 border-orange-200'
      default:
        return 'bg-secondary-50 border-secondary-200'
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-secondary-200 p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Notifications</h1>
            <p className="text-secondary-500">
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </p>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <CheckIcon className="h-4 w-4" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex space-x-1 bg-secondary-100 p-1 rounded-lg">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            All ({userNotifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="p-6">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <BellIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-secondary-500">
              {filter === 'unread' 
                ? 'You\'re all caught up! Check back later for new notifications.'
                : 'When people interact with your content, you\'ll see notifications here.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-xl border transition-all hover:shadow-sm ${
                  notification.read 
                    ? 'bg-white border-secondary-200' 
                    : `${getNotificationColor(notification.type)} border-l-4`
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${notification.read ? 'text-secondary-600' : 'text-secondary-900 font-medium'}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-secondary-500 mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-1 hover:bg-secondary-100 rounded-full transition-colors"
                        title="Mark as read"
                      >
                        <CheckIcon className="h-4 w-4 text-secondary-500" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="p-1 hover:bg-red-100 rounded-full transition-colors"
                      title="Delete notification"
                    >
                      <TrashIcon className="h-4 w-4 text-secondary-500 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification Types Info */}
      <div className="p-6 border-t border-secondary-200">
        <h3 className="text-sm font-medium text-secondary-900 mb-3">Notification Types</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <HeartFilledIcon className="h-4 w-4 text-red-500" />
            <span className="text-secondary-600">Likes on your threads</span>
          </div>
          <div className="flex items-center space-x-2">
            <ChatBubbleLeftIcon className="h-4 w-4 text-blue-500" />
            <span className="text-secondary-600">Comments on your threads</span>
          </div>
          <div className="flex items-center space-x-2">
            <UserPlusIcon className="h-4 w-4 text-green-500" />
            <span className="text-secondary-600">New followers</span>
          </div>
          <div className="flex items-center space-x-2">
            <CalendarDaysIcon className="h-4 w-4 text-purple-500" />
            <span className="text-secondary-600">New topic days</span>
          </div>
          <div className="flex items-center space-x-2">
            <UserGroupIcon className="h-4 w-4 text-orange-500" />
            <span className="text-secondary-600">Group invitations</span>
          </div>
          <div className="flex items-center space-x-2">
            <BellIcon className="h-4 w-4 text-secondary-500" />
            <span className="text-secondary-600">General notifications</span>
          </div>
        </div>
      </div>
    </div>
  )
}

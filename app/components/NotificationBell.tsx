'use client'

import { useState } from 'react'
import { BellIcon } from '@heroicons/react/24/outline'
import { useNotification } from '../contexts/NotificationContext'
import { useUser } from '../contexts/UserContext'
import NotificationDropdown from './NotificationDropdown'

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications } = useNotification()
  const { user } = useUser()

  const unreadCount = notifications.filter(n => {
    const notificationUserId = n.userId || n.user_id
    return !n.read && !n.is_read && notificationUserId === user?.id
  }).length

  if (!user) return null

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <BellIcon className="w-6 h-6" />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute right-0 top-full mt-2 w-96 max-w-sm bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <NotificationDropdown />
          </div>
        </>
      )}
    </div>
  )
}

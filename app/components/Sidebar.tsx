'use client'

import { useState, useEffect } from 'react'
import { useUser } from '../contexts/UserContext'
import { useNotification } from '../contexts/NotificationContext'
import { 
  HomeIcon, 
  UserIcon, 
  ChatBubbleLeftRightIcon, 
  BellIcon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import ThemeToggle from './ThemeToggle'

interface Tab {
  id: string
  label: string
  icon: any
}

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  tabs: Tab[]
}

export default function Sidebar({ activeTab, onTabChange, tabs }: SidebarProps) {
  const { user, setUser } = useUser()
  const { notifications } = useNotification()
  const unreadNotifications = notifications.filter(n => !n.read && n.userId === user?.id).length

  // Debug logging
  useEffect(() => {
    console.log('🔔 Sidebar - Current user:', user?.id)
    console.log('🔔 Sidebar - All notifications:', notifications)
    console.log('🔔 Sidebar - Unread count:', unreadNotifications)
  }, [notifications, user, unreadNotifications])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
    }
  }

  return (
    <div className="fixed left-0 top-0 h-full w-72 bg-white border-r border-gray-100 z-20">
      <div className="flex flex-col h-full">
        {/* Ultra-Minimal Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Threads</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              const isNotifications = tab.id === 'notifications'
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors ${
                    isActive 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="relative">
                    <Icon className="w-6 h-6" />
                    {isNotifications && unreadNotifications > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {unreadNotifications > 9 ? '9+' : unreadNotifications}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <img
              src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.displayName}&background=3b82f6&color=fff`}
              alt={user?.displayName}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.displayName || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                @{user?.username || 'username'}
              </p>
            </div>
          </div>

          {/* Settings and Logout */}
          <div className="space-y-2">
            {/* Settings button temporarily disabled */}
            {/* <button
              onClick={() => onTabChange('settings')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                activeTab === 'settings'
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium">Settings</span>
            </button> */}
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
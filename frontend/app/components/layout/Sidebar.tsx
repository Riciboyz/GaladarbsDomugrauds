'use client'

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
    <div className="hidden lg:block fixed left-0 top-0 h-full w-72 bg-white border-r border-gray-100 z-20">
      <div className="flex flex-col h-full">
        {/* Brand Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div
              className="w-9 h-9 rounded-xl bg-brand-green-700 flex items-center justify-center"
              style={{ width: 36, height: 36 }}
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" style={{ width: 20, height: 20 }} />
            </div>
            <span className="text-xl font-bold text-gray-900">DomuGrauds</span>
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
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                    isActive 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="relative">
                    <Icon className="w-6 h-6" />
                    {isNotifications && unreadNotifications > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-dg-sm">
                        <span className="text-white text-[10px] font-bold leading-none">
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
          <div className="flex items-center gap-3 mb-4">
            <img
              src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.displayName}&background=3b82f6&color=fff`}
              alt={user?.displayName}
              className="w-12 h-12 rounded-2xl object-cover shadow-dg-sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.displayName || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                @{user?.username || 'username'}
              </p>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-2">
            {(user as any)?.role === 'admin' && (
              <a
                href="/admin"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-brand-green-700 hover:bg-brand-rose-50/60 hover:text-brand-green-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0l1.403 5.777c.194.8.8 1.4 1.6 1.4h4.5c1.756 0 2.5 1.244 1.6 2.5l-3.6 2.6c-.8.6-1.2 1.6-1.2 2.6v4.5c0 1.756-1.244 2.5-2.5 1.6l-2.6-3.6c-.6-.8-1.6-1.2-2.6-1.2h-4.5c-1.756 0-2.5-1.244-1.6-2.5l2.6-3.6c.6-.8.6-1.8 0-2.6l-2.6-3.6c-.9-1.256-.156-2.5 1.6-2.5h4.5c.8 0 1.406-.6 1.6-1.4l1.403-5.777z" />
                </svg>
                <span className="font-medium">Admin Panel</span>
              </a>
            )}
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
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
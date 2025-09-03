'use client'

import { useApp } from '../providers'
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
  const { user, setUser, notifications } = useApp()
  const unreadNotifications = notifications.filter(n => !n.read).length

  const handleLogout = () => {
    setUser(null)
  }

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg border-r border-secondary-200 z-10">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-secondary-200">
          <h1 className="text-2xl font-bold text-primary-600">Threads</h1>
          <p className="text-sm text-secondary-500">Welcome back, {user?.displayName}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const showBadge = tab.id === 'notifications' && unreadNotifications > 0

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors relative ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                    : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                <span className="font-medium">{tab.label}</span>
                {showBadge && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User Profile & Actions */}
        <div className="p-4 border-t border-secondary-200">
          <div className="flex items-center space-x-3 mb-4">
            <img
              src={user?.avatar || 'https://via.placeholder.com/40'}
              alt={user?.displayName}
              className="h-10 w-10 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-secondary-900 truncate">
                {user?.displayName}
              </p>
              <p className="text-xs text-secondary-500 truncate">
                @{user?.username}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 mb-4">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center px-4 py-2 text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

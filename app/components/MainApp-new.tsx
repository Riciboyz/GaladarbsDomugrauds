'use client'

import { useState, useEffect } from 'react'
import { useUser } from '../contexts/UserContext'
import { useThread } from '../contexts/ThreadContext'
import { useGroup } from '../contexts/GroupContext'
import { useNotification } from '../contexts/NotificationContext'
import { useTopicDay } from '../contexts/TopicDayContext'
import { useToast } from '../contexts/ToastContext'
import Sidebar from './Sidebar'
import Feed from './Feed'
import Profile from './Profile'
import Notifications from './Notifications'
// import Settings from './Settings' // Temporarily disabled
import Search from './Search'
import Groups from './Groups'
import KeyboardShortcuts from './KeyboardShortcuts'
import SimpleCreateThread from './SimpleCreateThread'
import { 
  HomeIcon, 
  UserIcon, 
  BellIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  // Cog6ToothIcon // Temporarily disabled
} from '@heroicons/react/24/outline'

type Tab = 'home' | 'profile' | 'notifications' | 'search' | 'groups' | 'user-profile' // | 'settings' // Temporarily disabled

export default function MainApp() {
  const { user } = useUser()
  const { threads } = useThread()
  const { groups } = useGroup()
  const { notifications } = useNotification()
  const { topicDays } = useTopicDay()
  const { success, error } = useToast()
  
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateThread, setShowCreateThread] = useState(false)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)

  const handleUserClick = (userId: string) => {
    setViewingUserId(userId)
    setActiveTab('user-profile')
  }

  // Make handleUserClick available globally for modals
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).navigateToUser = handleUserClick
    }
  }, [])

  const tabs = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'search', label: 'Search', icon: MagnifyingGlassIcon },
    { id: 'groups', label: 'Groups', icon: UserGroupIcon },
    // { id: 'settings', label: 'Settings', icon: Cog6ToothIcon }, // Temporarily disabled
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Feed onUserClick={handleUserClick} />
      case 'profile':
        return <Profile />
      case 'notifications':
        return <Notifications />
      case 'search':
        return <Search onUserClick={handleUserClick} />
      case 'groups':
        return <Groups />
      case 'user-profile':
        return viewingUserId ? <Profile userId={viewingUserId} onBack={() => setActiveTab('home')} /> : <Feed />
      // case 'settings':
      //   return <Settings />
      default:
        return <Feed onUserClick={handleUserClick} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <KeyboardShortcuts
        onNewThread={() => setShowCreateThread(true)}
        onSearch={() => setActiveTab('search')}
        onHome={() => setActiveTab('home')}
        onProfile={() => setActiveTab('profile')}
        onNotifications={() => setActiveTab('notifications')}
        onGroups={() => setActiveTab('groups')}
        // onSettings={() => setActiveTab('settings')} // Temporarily disabled
      />
      
      <div className="flex min-h-screen">
        {/* Ultra-Minimal Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as Tab)} tabs={tabs} />
        
        {/* Ultra-Clean Main Content */}
        <div className="flex-1 ml-72">
          <div className="min-h-screen">
            <div className="container-padding py-8">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Ultra-Minimal Create Thread Modal */}
      {showCreateThread && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <SimpleCreateThread onClose={() => setShowCreateThread(false)} />
        </div>
      )}
    </div>
  )
}

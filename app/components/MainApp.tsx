'use client'

import { useState } from 'react'
import { useApp } from '../providers'
import Sidebar from './Sidebar'
import Feed from './Feed'
import Profile from './Profile'
import Groups from './Groups'
import Notifications from './Notifications'
import TopicDays from './TopicDays'
import Settings from './Settings'
import Search from './Search'
import KeyboardShortcuts from './KeyboardShortcuts'
import CreateThread from './CreateThread'
import { 
  HomeIcon, 
  UserIcon, 
  ChatBubbleLeftRightIcon, 
  BellIcon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

type Tab = 'home' | 'profile' | 'groups' | 'notifications' | 'topic-days' | 'search' | 'settings'

export default function MainApp() {
  const { user } = useApp()
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateThread, setShowCreateThread] = useState(false)

  const tabs = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'groups', label: 'Groups', icon: ChatBubbleLeftRightIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'topic-days', label: 'Topic Days', icon: CalendarDaysIcon },
    { id: 'search', label: 'Search', icon: MagnifyingGlassIcon },
    { id: 'settings', label: 'Settings', icon: Cog6ToothIcon },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Feed />
      case 'profile':
        return <Profile />
      case 'groups':
        return <Groups />
      case 'notifications':
        return <Notifications />
      case 'topic-days':
        return <TopicDays />
      case 'search':
        return <Search />
      case 'settings':
        return <Settings />
      default:
        return <Feed />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <KeyboardShortcuts
        onNewThread={() => setShowCreateThread(true)}
        onSearch={() => setActiveTab('search')}
        onHome={() => setActiveTab('home')}
        onProfile={() => setActiveTab('profile')}
        onGroups={() => setActiveTab('groups')}
        onNotifications={() => setActiveTab('notifications')}
        onTopicDays={() => setActiveTab('topic-days')}
        onSettings={() => setActiveTab('settings')}
      />
      
      <div className="flex">
        {/* Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />
        
        {/* Main Content */}
        <div className="flex-1 ml-64">
          <div className="min-h-screen">
            {renderContent()}
          </div>
        </div>
      </div>
      
      {/* Create Thread Modal */}
      {showCreateThread && (
        <CreateThread onClose={() => setShowCreateThread(false)} />
      )}
    </div>
  )
}

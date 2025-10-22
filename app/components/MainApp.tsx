'use client'

import { useState, useRef } from 'react'
import { useUser } from '../contexts/UserContext'
import { useThread } from '../contexts/ThreadContext'
import { useGroup } from '../contexts/GroupContext'
import { useNotification } from '../contexts/NotificationContext'
import { useTopicDay } from '../contexts/TopicDayContext'
import { useToast } from '../contexts/ToastContext'
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications'
import Sidebar from './Sidebar'
import Feed from './Feed'
import Profile from './Profile'
import RealtimeNotificationsProvider from './RealtimeNotificationsProvider'
// import Settings from './Settings' // Temporarily disabled
import Search from './Search'
import Groups from './Groups'
import RightSidebar from './RightSidebar'
import DailyTopicBanner from './DailyTopicBanner'
import TopicSubmission from './TopicSubmission'
import KeyboardShortcuts from './KeyboardShortcuts'
import SimpleCreateThread from './SimpleCreateThread'
import QuickSearchBar from './QuickSearchBar'
import { 
  HomeIcon, 
  UserIcon, 
  BellIcon,
  MagnifyingGlassIcon,
  // Cog6ToothIcon, // Temporarily disabled
  UserGroupIcon
} from '@heroicons/react/24/outline'

type Tab = 'home' | 'profile' | 'notifications' | 'search' | 'groups' | 'user-profile' | 'topic-submission' // | 'settings' // Temporarily disabled

export default function MainApp() {
  const { user } = useUser()
  const { threads } = useThread()
  const { groups } = useGroup()
  const { notifications } = useNotification()
  const { topicDays } = useTopicDay()
  const { success, error } = useToast()
  
  // Aktivizē reāllaika notifikācijas
  useRealtimeNotifications()
  
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateThread, setShowCreateThread] = useState(false)
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null)
  const [viewedUserId, setViewedUserId] = useState<string | null>(null)
  const quickSearchRef = useRef<{ focus: () => void }>(null)

  const tabs = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'search', label: 'Search', icon: MagnifyingGlassIcon },
    { id: 'groups', label: 'Groups', icon: UserGroupIcon },
    // { id: 'settings', label: 'Settings', icon: Cog6ToothIcon }, // Temporarily disabled
  ]

  const handleOpenTopicSubmission = (topicId: string) => {
    setCurrentTopicId(topicId)
    setActiveTab('topic-submission' as Tab)
  }

  const handleUserProfileClick = (userId: string) => {
    setViewedUserId(userId)
    setActiveTab('user-profile' as Tab)
  }

  const handleQuickSearch = () => {
    quickSearchRef.current?.focus()
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Feed onUserClick={handleUserProfileClick} />
      case 'profile':
        return <Profile />
      case 'notifications':
        return <RealtimeNotificationsProvider />
      case 'search':
        return <Search onUserClick={handleUserProfileClick} />
      case 'groups':
        return <Groups />
      case 'user-profile':
        return viewedUserId ? (
          <Profile 
            userId={viewedUserId} 
            onBack={() => {
              setViewedUserId(null)
              setActiveTab('home')
            }} 
          />
        ) : <Feed onUserClick={handleUserProfileClick} />
      case 'topic-submission':
        return currentTopicId ? (
          <TopicSubmission 
            topicId={currentTopicId} 
            onBack={() => setActiveTab('home')} 
          />
        ) : <Feed onUserClick={handleUserProfileClick} />
      // case 'settings':
      //   return <Settings />
      default:
        return <Feed onUserClick={handleUserProfileClick} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <KeyboardShortcuts
        onNewThread={() => setShowCreateThread(true)}
        onSearch={handleQuickSearch}
        onHome={() => setActiveTab('home')}
        onProfile={() => setActiveTab('profile')}
        onNotifications={() => setActiveTab('notifications')}
        onGroups={() => setActiveTab('groups')}
        onSettings={() => {}} // Temporarily disabled
      />
      
      <div className="flex min-h-screen">
        {/* Ultra-Minimal Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as Tab)} tabs={tabs} />
        
        {/* Main Content + Right Sidebar */}
        <div className="flex-1 ml-72">
          <div className="min-h-screen">
            <div className="container-padding py-8">
              <div className="mx-auto max-w-6xl flex gap-6">
                <div className="flex-1 max-w-2xl">
                  {renderContent()}
                </div>
                <RightSidebar onOpenTopicSubmission={handleOpenTopicSubmission} />
              </div>
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

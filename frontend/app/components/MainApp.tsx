'use client'

import { useState } from 'react'
import { useUser } from './contexts/UserContext'
import { useRealtimeNotifications } from './hooks/useRealtimeNotifications'
import Sidebar from './layout/Sidebar'
import Feed from './features/threads/Feed'
import Profile from './features/profile/Profile'
import RealtimeNotificationsProvider from './features/notifications/RealtimeNotificationsProvider'
import Search from './features/search/Search'
import Groups from './features/groups/Groups'
import RightSidebar from './layout/RightSidebar'
import TopicSubmission from './features/topics/TopicSubmission'
import KeyboardShortcuts from './utility/KeyboardShortcuts'
import SimpleCreateThread from './features/threads/SimpleCreateThread'
import { 
  HomeIcon, 
  UserIcon, 
  BellIcon,
  MagnifyingGlassIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

type Tab = 'home' | 'profile' | 'notifications' | 'search' | 'groups' | 'user-profile' | 'topic-submission'

export default function MainApp() {
  const { user } = useUser()
  
  useRealtimeNotifications()
  
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [showCreateThread, setShowCreateThread] = useState(false)
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null)
  const [viewedUserId, setViewedUserId] = useState<string | null>(null)

  const tabs = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'search', label: 'Search', icon: MagnifyingGlassIcon },
    { id: 'groups', label: 'Groups', icon: UserGroupIcon },
  ]

  const handleOpenTopicSubmission = (topicId: string) => {
    setCurrentTopicId(topicId)
    setActiveTab('topic-submission' as Tab)
  }

  const handleUserProfileClick = (userId: string) => {
    setViewedUserId(userId)
    setActiveTab('user-profile' as Tab)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Feed onUserClick={handleUserProfileClick} />
      case 'profile':
        return <Profile onUserClick={handleUserProfileClick} />
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
            onUserClick={handleUserProfileClick}
          />
        ) : <Feed onUserClick={handleUserProfileClick} />
      case 'topic-submission':
        return currentTopicId ? (
          <TopicSubmission 
            topicId={currentTopicId} 
            onBack={() => setActiveTab('home')} 
          />
        ) : <Feed onUserClick={handleUserProfileClick} />
      default:
        return <Feed onUserClick={handleUserProfileClick} />
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
        onSettings={() => {}}
      />
      
      <div className="flex min-h-screen">
        <Sidebar activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as Tab)} tabs={tabs} />
        
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
      
      {showCreateThread && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <SimpleCreateThread onClose={() => setShowCreateThread(false)} />
        </div>
      )}
    </div>
  )
}

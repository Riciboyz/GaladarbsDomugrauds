'use client'

import { useEffect, useState } from 'react'
import { useUser } from './contexts/UserContext'
import { useNotification } from './contexts/NotificationContext'
import { useRealtimeNotifications } from './hooks/useRealtimeNotifications'
import Sidebar from './layout/Sidebar'
import MobileTopBar from './layout/MobileTopBar'
import MobileDrawer from './layout/MobileDrawer'
import MobileBottomNav from './layout/MobileBottomNav'
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
  const { notifications } = useNotification()
  const unreadNotifications = notifications.filter(n => !n.read && n.userId === user?.id).length
  
  useRealtimeNotifications()

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = ''
    }
  }, [])

  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [showCreateThread, setShowCreateThread] = useState(false)
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null)
  const [viewedUserId, setViewedUserId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const tabs = [
    { id: 'home', label: 'Sākums', icon: HomeIcon },
    { id: 'search', label: 'Meklēt', icon: MagnifyingGlassIcon },
    { id: 'groups', label: 'Grupas', icon: UserGroupIcon },
    { id: 'notifications', label: 'Paziņojumi', icon: BellIcon },
    { id: 'profile', label: 'Profils', icon: UserIcon },
  ]

  const activeTitle =
    activeTab === 'user-profile'
      ? 'Profils'
      : activeTab === 'topic-submission'
      ? 'Tēma'
      : tabs.find(t => t.id === activeTab)?.label

  const handleOpenTopicSubmission = (topicId: string) => {
    setCurrentTopicId(topicId)
    setActiveTab('topic-submission' as Tab)
  }

  const handleUserProfileClick = (userId: string) => {
    setViewedUserId(userId)
    setActiveTab('user-profile' as Tab)
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as Tab)
    setDrawerOpen(false)
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
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <KeyboardShortcuts
        onNewThread={() => setShowCreateThread(true)}
        onSearch={() => setActiveTab('search')}
        onHome={() => setActiveTab('home')}
        onProfile={() => setActiveTab('profile')}
        onNotifications={() => setActiveTab('notifications')}
        onGroups={() => setActiveTab('groups')}
        onSettings={() => {}}
      />

      <MobileTopBar
        onOpenDrawer={() => setDrawerOpen(true)}
        onCompose={() => setShowCreateThread(true)}
        title={activeTitle}
      />
      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex min-h-screen w-full">
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} tabs={tabs} />
        
        <div className="flex-1 min-w-0 lg:ml-72">
          <div className="min-h-screen dg-mobile-safe-pad lg:pt-0 lg:pb-0">
            <div className="px-3 sm:px-4 lg:px-6 py-4 lg:py-8">
              <div className="mx-auto max-w-6xl flex gap-6 w-full">
                <div className="flex-1 min-w-0 lg:max-w-2xl">
                  {renderContent()}
                </div>
                <RightSidebar onOpenTopicSubmission={handleOpenTopicSubmission} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabs={tabs}
        unreadCount={unreadNotifications}
      />
      
      {showCreateThread && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <SimpleCreateThread onClose={() => setShowCreateThread(false)} />
        </div>
      )}
    </div>
  )
}

'use client'

import { useMemo, useEffect, useState } from 'react'
import { useUser } from '../contexts/UserContext'
import { useNotification } from '../contexts/NotificationContext'
import { useThread } from '../contexts/ThreadContext'
import { useWebSocket } from '../contexts/WebSocketContext'
import { CalendarDaysIcon, SparklesIcon, ArrowTopRightOnSquareIcon, UserPlusIcon, BellIcon } from '@heroicons/react/24/outline'
import WeatherWidget from '../features/weather/WeatherWidget'

interface RightSidebarProps {
  onOpenTopicSubmission?: (topicId: string) => void
}

export default function RightSidebar({ onOpenTopicSubmission }: RightSidebarProps) {
  const { user, users, followUser, unfollowUser, isFollowing } = useUser()
  const { notifications } = useNotification()
  const { threads } = useThread()
  const { lastMessage } = useWebSocket()

  // Daily topic from working API/WebSocket
  interface DailyTopic {
    id: string
    title: string
    description: string
    is_active: boolean
    created_at: string
    created_by_username: string
    created_by_display_name: string
  }

  const [topic, setTopic] = useState<DailyTopic | null>(null)
  const [isLoadingTopic, setIsLoadingTopic] = useState(true)

  useEffect(() => {
    const loadActiveTopic = async () => {
      try {
        const res = await fetch('/api/daily-topic')
        const data = await res.json()
        if (data.success && data.topic) setTopic(data.topic)
      } catch (e) {
        console.error('RightSidebar: loadActiveTopic failed', e)
      } finally {
        setIsLoadingTopic(false)
      }
    }
    loadActiveTopic()
  }, [])

  useEffect(() => {
    if (!lastMessage) return
    const { type, data } = lastMessage
    if (type === 'daily_topic_active_set') {
      setTopic(data)
    } else if (type === 'daily_topic_updated' && topic && data.id === topic.id) {
      setTopic({ ...topic, ...data })
    } else if (type === 'daily_topic_deleted' && topic && data.id === topic.id) {
      setTopic(null)
    }
  }, [lastMessage, topic])

  const unreadCount = useMemo(() => notifications.filter(n => !n.read && n.userId === user?.id).length, [notifications, user])

  const todayTopic = topic

  const suggestedUsers = useMemo(() => {
    if (!user || !users) return []
    // Get users that current user is not following and not themselves
    return users
      .filter(u => u.id !== user.id && !(user.following || []).includes(u.id))
      .slice(0, 5)
  }, [users, user])

  // Listen for real-time topic submission updates
  useEffect(() => {
    const handleTopicSubmissionCreated = (event: CustomEvent) => {
      const data = event.detail
      console.log('📝 RightSidebar: New submission created:', data)
      
      // Reload today's top to show new submissions
      // This will trigger a re-render with updated threads
    }

    const handleTopicSubmissionNotification = (event: CustomEvent) => {
      const data = event.detail
      console.log('📬 RightSidebar: Notification received:', data)
      
      // Reload today's top to show new submissions
      // This will trigger a re-render with updated threads
    }

    // Add event listeners
    window.addEventListener('topic_submission_created', handleTopicSubmissionCreated as EventListener)
    window.addEventListener('topic_submission_notification', handleTopicSubmissionNotification as EventListener)

    return () => {
      window.removeEventListener('topic_submission_created', handleTopicSubmissionCreated as EventListener)
      window.removeEventListener('topic_submission_notification', handleTopicSubmissionNotification as EventListener)
    }
  }, [])

  const todaysTop = useMemo(() => {
    if (!todayTopic) return [] as { id: string; title: string; score: number }[]
    const related = threads.filter(t => t.topicDayId === todayTopic.id)
    return related
      .map(t => ({ id: t.id, title: (t.content || '').slice(0, 80), score: (t.replies?.length || 0) + (t.likes?.length || 0) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }, [threads, todayTopic])

  return (
    <aside className="hidden lg:block w-[320px] shrink-0">
      <div className="sticky top-0 pt-2 pb-8" style={{ height: 'calc(100vh - 2rem)' }}>
        <div className="space-y-4">
          {/* Greeting / Profile Card */}
          <section className="rounded-3xl bg-white/70 backdrop-blur-md border border-gray-100 shadow-dg-md overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=22c55e&color=fff`}
                    alt={user?.displayName || 'User'}
                    className="w-12 h-12 rounded-2xl object-cover shadow-dg-sm"
                  />
                  <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-brand-green-600 to-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow-dg-sm">✨</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-gray-500">Welcome back</p>
                  <p className="font-semibold text-gray-900 truncate">{user?.displayName || 'DomuGrauds user'}</p>
                </div>
              </div>
              {/* Removed stats grid for a cleaner header */}
            </div>
          </section>

          {/* Weather Widget */}
          <WeatherWidget showDetails={true} />

          {/* Today Topic */}
          {!isLoadingTopic && todayTopic && (
            <section className="rounded-3xl bg-gradient-to-br from-brand-rose-50/70 via-white to-brand-green-50/60 border border-gray-100 shadow-dg-md overflow-hidden">
              <div className="p-5">
                <div className="flex items-center gap-2 text-brand-green-700">
                  <CalendarDaysIcon className="h-5 w-5" />
                  <span className="text-sm font-semibold">Today’s Topic</span>
                </div>
                <h3 
                  className="mt-2 font-playfair text-xl leading-snug text-gray-900 cursor-pointer hover:text-brand-green-700 transition-colors"
                  onClick={() => todayTopic && onOpenTopicSubmission?.(todayTopic.id)}
                >
                  {todayTopic.title || 'Daily Thoughts'}
                </h3>
                {todayTopic.description && (
                  <p className="mt-1 text-sm text-gray-600 line-clamp-3">{todayTopic.description}</p>
                )}
                <button
                  onClick={() => todayTopic && onOpenTopicSubmission?.(todayTopic.id)}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Share your take
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </button>
                {todaysTop.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {todaysTop.map(item => (
                      <a key={item.id} href={`#thread-${item.id}`} className="block group">
                        <p className="text-sm text-gray-900 line-clamp-2 group-hover:underline">{item.title || 'Untitled'}</p>
                        <p className="text-xs text-gray-500">Score {item.score}</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Discover / Suggestions */}
          <section className="rounded-3xl bg-white/70 backdrop-blur-md border border-gray-100 shadow-dg-md overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-2 text-gray-800">
                <SparklesIcon className="h-5 w-5" />
                <span className="text-sm font-semibold">Discover people</span>
              </div>
              <div className="mt-3 space-y-3">
                {suggestedUsers.length === 0 && (
                  <p className="text-sm text-gray-500">Fresh suggestions will appear here.</p>
                )}
                {suggestedUsers.map(suggestedUser => (
                  <div key={suggestedUser.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={suggestedUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(suggestedUser.displayName || suggestedUser.username)}&background=0ea5e9&color=fff`}
                        alt={suggestedUser.displayName}
                        className="w-9 h-9 rounded-2xl shadow-dg-sm object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{suggestedUser.displayName}</p>
                        <p className="text-xs text-gray-500 truncate">@{suggestedUser.username}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => followUser(suggestedUser.id)}
                      className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <UserPlusIcon className="h-4 w-4" /> Follow
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Notifications */}
          {unreadCount > 0 && (
            <section className="rounded-3xl bg-white/70 backdrop-blur-md border border-gray-100 shadow-dg-md overflow-hidden">
              <div className="p-5">
                <div className="flex items-center gap-2 text-gray-800">
                  <BellIcon className="h-5 w-5" />
                  <span className="text-sm font-semibold">Notifications</span>
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{unreadCount}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600">You have {unreadCount} unread notifications</p>
                <button className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
                  View all notifications
                </button>
              </div>
            </section>
          )}

          {/* Footer mini links */}
          <section className="rounded-3xl bg-white/50 border border-gray-100">
            <div className="p-5 text-[12px] text-gray-500 leading-relaxed">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <a className="hover:text-gray-700" href="#">About</a>
                <a className="hover:text-gray-700" href="#">Privacy</a>
                <a className="hover:text-gray-700" href="#">Terms</a>
                <a className="hover:text-gray-700" href="#">Help</a>
              </div>
              <p className="mt-2">© {new Date().getFullYear()} DomuGrauds</p>
            </div>
          </section>
        </div>
      </div>
    </aside>
  )
}

 

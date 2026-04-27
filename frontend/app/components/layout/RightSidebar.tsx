'use client'

import { useMemo, useEffect, useState } from 'react'
import { useUser } from '../contexts/UserContext'
import { useNotification } from '../contexts/NotificationContext'
import { useThread } from '../contexts/ThreadContext'
import { useWebSocket } from '../contexts/WebSocketContext'
import { CalendarDaysIcon, SparklesIcon, ArrowTopRightOnSquareIcon, UserPlusIcon, BellIcon } from '@heroicons/react/24/outline'

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
          <section className="rounded-3xl bg-surface-2/70 backdrop-blur-md border border-border-ui shadow-dg-md overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.displayName || 'Lietotājs'}&background=22c55e&color=fff`}
                    alt={user?.displayName || 'Lietotājs'}
                    className="w-12 h-12 rounded-2xl object-cover shadow-dg-sm"
                  />
                  <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-accent text-accent-fg text-[10px] font-bold flex items-center justify-center shadow-dg-sm">✨</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-ink-muted">Prieks tevi redzēt atpakaļ</p>
                  <p className="font-semibold text-ink truncate">{user?.displayName || 'DomuGrauds lietotājs'}</p>
                </div>
              </div>
              {/* Removed stats grid for a cleaner header */}
            </div>
          </section>

          {/* Today Topic */}
          {!isLoadingTopic && todayTopic && (
            <section className="rounded-3xl bg-gradient-to-br from-accent/15 to-surface-2 border border-border-ui shadow-dg-md overflow-hidden">
              <div className="p-5">
                <div className="flex items-center gap-2 text-accent">
                  <CalendarDaysIcon className="h-5 w-5" />
                  <span className="text-sm font-semibold">Šodienas tēma</span>
                </div>
                <h3
                  className="mt-2 font-playfair text-xl leading-snug text-ink cursor-pointer hover:text-accent transition-colors"
                  onClick={() => todayTopic && onOpenTopicSubmission?.(todayTopic.id)}
                >
                  {todayTopic.title || 'Dienas domas'}
                </h3>
                {todayTopic.description && (
                  <p className="mt-1 text-sm text-ink-muted line-clamp-3">{todayTopic.description}</p>
                )}
                <button
                  onClick={() => todayTopic && onOpenTopicSubmission?.(todayTopic.id)}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-accent text-accent-fg text-sm font-medium hover:bg-accent-hover transition-colors"
                >
                  Dalies ar savu viedokli
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </button>
                {todaysTop.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {todaysTop.map(item => (
                      <a key={item.id} href={`#thread-${item.id}`} className="block group">
                        <p className="text-sm text-ink line-clamp-2 group-hover:underline">{item.title || 'Bez virsraksta'}</p>
                        <p className="text-xs text-ink-muted">Punkti {item.score}</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Discover / Suggestions */}
          <section className="rounded-3xl bg-surface-2/70 backdrop-blur-md border border-border-ui shadow-dg-md overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-2 text-ink">
                <SparklesIcon className="h-5 w-5" />
                <span className="text-sm font-semibold">Atklāj cilvēkus</span>
              </div>
              <div className="mt-3 space-y-3">
                {suggestedUsers.length === 0 && (
                  <p className="text-sm text-ink-muted">Šeit parādīsies jauni ieteikumi.</p>
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
                        <p className="text-sm font-medium text-ink truncate">{suggestedUser.displayName}</p>
                        <p className="text-xs text-ink-muted truncate">@{suggestedUser.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => followUser(suggestedUser.id)}
                      className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-accent-fg bg-accent hover:bg-accent-hover transition-colors"
                    >
                      <UserPlusIcon className="h-4 w-4" /> Sekot
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Notifications */}
          {unreadCount > 0 && (
            <section className="rounded-3xl bg-surface-2/70 backdrop-blur-md border border-border-ui shadow-dg-md overflow-hidden">
              <div className="p-5">
                <div className="flex items-center gap-2 text-ink">
                  <BellIcon className="h-5 w-5" />
                  <span className="text-sm font-semibold">Paziņojumi</span>
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{unreadCount}</span>
                </div>
                <p className="mt-2 text-sm text-ink-muted">Tev ir {unreadCount} nelasīti paziņojumi</p>
                <button className="mt-3 text-sm text-accent hover:text-accent-hover font-medium">
                  Skatīt visus paziņojumus
                </button>
              </div>
            </section>
          )}

        </div>
      </div>
    </aside>
  )
}

 

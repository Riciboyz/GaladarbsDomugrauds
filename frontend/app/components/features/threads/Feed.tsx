'use client'

import { useState, useEffect } from 'react'
import { useThread } from '../../contexts/ThreadContext'
import { useUser } from '../../contexts/UserContext'
import { useToast } from '../../contexts/ToastContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { useLoading } from '../../hooks/useLoading'
import ThreadCard from './ThreadCard'
import SimpleCreateThread from './SimpleCreateThread'
import LoadingState, { ThreadLoadingSkeleton } from '../../utility/LoadingState'
import Button from '../../ui/Button'
import { 
  FireIcon,
  CalendarDaysIcon,
  UsersIcon,
  HomeIcon,
  ArrowPathIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

type Filter = 'all' | 'following'

interface FeedProps {
  onUserClick?: (userId: string) => void
}

export default function Feed({ onUserClick }: FeedProps) {
  const { threads, setThreads, loadThreadsFromAPI, addThread } = useThread()
  const { users, user } = useUser()
  const { success, error: showError } = useToast()
  const { lastMessage, isConnected } = useWebSocket()
  const [filter, setFilter] = useState<Filter>('all')
  const [showCreateThread, setShowCreateThread] = useState(false)
  const { loading, error, execute } = useLoading({
    onError: (error) => showError('Kļūda', `Neizdevās ielādēt domas: ${error.message}`)
  })
  

  useEffect(() => {
    loadThreadsFromAPI()
  }, [])

  // Thread events are handled in ThreadContext. Avoid duplicating here.
  useEffect(() => {
    if (lastMessage?.type) {
      if (lastMessage.type === 'thread_created' || lastMessage.type === 'new_thread') {
        // No-op: handled centrally in ThreadContext to prevent duplicates
        return
      }
    }
  }, [lastMessage])

  const loadThreads = async (feedType: Filter = 'all') => {
    await execute(async () => {
      const response = await fetch(`/api/threads?feedType=${feedType}&limit=50&offset=0`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        const normalizeArrayField = (value: any): any[] => {
          if (Array.isArray(value)) return value
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value)
              return Array.isArray(parsed) ? parsed : []
            } catch {
              return []
            }
          }
          return []
        }

        const threadsWithDates = (data.threads || []).map((thread: any) => ({
          ...thread,
          authorId: thread.author_id || thread.authorId,
          createdAt: new Date(thread.created_at || thread.createdAt || Date.now()),
          parentId: thread.parent_id || thread.parentId,
          topicDayId: thread.topic_day_id || thread.topicDayId,
          groupId: thread.group_id || thread.groupId,
          likes: normalizeArrayField(thread.likes),
          dislikes: normalizeArrayField(thread.dislikes),
          attachments: normalizeArrayField(thread.attachments),
          replies: Array.isArray(thread.replies) ? thread.replies : [],
          comments: Array.isArray(thread.comments) ? thread.comments : [],
        }))
        setThreads(threadsWithDates)
        console.log('✅ Loaded threads for feed:', feedType, threadsWithDates.length, 'threads')
      } else {
        throw new Error(data.error || 'Failed to load threads')
      }
    })
  }

  const handleRefresh = () => {
    loadThreads(filter)
  }

  const handleFilterChange = (newFilter: Filter) => {
    setFilter(newFilter)
    loadThreads(newFilter)
  }

  const filters = [
    { id: 'all', label: 'Visas Domas', icon: UsersIcon },
    { id: 'following', label: 'Seko', icon: FireIcon },
  ]

  // Apply client-side filtering for 'following' to ensure correctness and realtime
  const filteredThreads = filter === 'following' && user
    ? threads.filter(t => (user.following || []).includes(t.authorId) && t.authorId !== user.id)
    : threads

  return (
    <div className="max-w-2xl mx-auto">
      {/* Desktop-only header (mobile uses MobileTopBar) */}
      <div className="hidden lg:block sticky top-0 bg-surface-2/80 backdrop-blur-sm border-b border-border-ui z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-ink">Sākums</h1>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-ink-muted">
                {isConnected ? 'Tiešraide' : 'Bezsaistē'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowCreateThread(true)}
              leftIcon={<PlusIcon className="w-4 h-4" />}
              size="sm"
            >
              Jauns
            </Button>
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-surface rounded-full transition-colors"
              disabled={loading}
              aria-label="Atsvaidzināt"
            >
              <ArrowPathIcon className={`w-5 h-5 text-ink-muted ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter tabs — sticky under MobileTopBar on mobile, under desktop header on lg */}
      <div
        className="sticky bg-surface-2/90 backdrop-blur-xl border-b border-border-ui/70 z-10 lg:top-[57px]"
        style={{ top: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex lg:hidden items-center justify-between px-3 h-10 border-b border-border-ui">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="text-[11px] text-ink-muted font-medium">
              {isConnected ? 'Tiešraide' : 'Nav savienojuma'}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Atsvaidzināt"
            className="inline-flex items-center justify-center w-8 h-8 -mr-1 rounded-lg text-ink-muted hover:bg-surface active:bg-border-ui transition-colors"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex">
          {filters.map((filterOption) => {
            const Icon = filterOption.icon
            const isActive = filter === filterOption.id

            return (
              <button
                key={filterOption.id}
                onClick={() => handleFilterChange(filterOption.id as Filter)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 h-11 text-sm transition-colors relative ${
                  isActive ? 'text-ink font-semibold' : 'text-ink-muted hover:text-ink font-medium'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{filterOption.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[2.5px] rounded-full bg-accent" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Threads list */}
      <div className="space-y-3 mt-3">
        {loading ? (
          <ThreadLoadingSkeleton count={3} />
        ) : error ? (
          <div className="bg-surface-2 rounded-2xl border border-border-ui shadow-dg-sm p-10 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowPathIcon className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-1.5">Neizdevās ielādēt</h3>
            <p className="text-sm text-ink-muted mb-5">{error.message}</p>
            <button
              onClick={() => loadThreads(filter)}
              className="inline-flex items-center h-10 px-5 rounded-xl bg-accent text-accent-fg hover:bg-accent-hover transition-colors font-semibold text-sm"
            >
              Mēģināt vēlreiz
            </button>
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="bg-surface-2 rounded-2xl border border-border-ui shadow-dg-sm p-10 text-center">
            <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="w-6 h-6 text-ink-muted" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-1.5">Vēl nav ierakstu</h3>
            <p className="text-sm text-ink-muted mb-5">Esi pirmais, kas sāk sarunu!</p>
            <button
              onClick={() => setShowCreateThread(true)}
              className="inline-flex items-center h-10 px-5 rounded-xl bg-accent text-accent-fg hover:bg-accent-hover transition-colors font-semibold text-sm"
            >
              Izveidot ierakstu
            </button>
          </div>
        ) : (
          filteredThreads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} onUserClick={onUserClick} />
          ))
        )}
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
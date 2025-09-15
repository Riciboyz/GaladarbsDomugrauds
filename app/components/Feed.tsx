'use client'

import { useState, useEffect } from 'react'
import { useThread } from '../contexts/ThreadContext'
import { useUser } from '../contexts/UserContext'
import { useToast } from '../contexts/ToastContext'
import { useWebSocket } from '../contexts/WebSocketContext'
import { useLoading } from '../hooks/useLoading'
import ThreadCard from './ThreadCard'
import SimpleCreateThread from './SimpleCreateThread'
import LoadingState, { ThreadLoadingSkeleton } from './LoadingState'
import Button from './Button'
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
    onError: (error) => showError('Error', `Failed to load threads: ${error.message}`)
  })
  

  useEffect(() => {
    loadThreads()
  }, [])

  // Handle real-time WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'thread_created':
          const newThread = lastMessage.data
          addThread(newThread)
          success('New Thread', 'A new thread was posted!')
          break
        case 'thread_updated':
          // Handle thread updates if needed
          break
        case 'thread_deleted':
          // Handle thread deletion if needed
          break
      }
    }
  }, [lastMessage, addThread, success])

  const loadThreads = async (feedType: Filter = 'all') => {
    await execute(async () => {
      const response = await fetch(`/api/threads?feedType=${feedType}&limit=50&offset=0`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        // Convert string dates back to Date objects and normalize field names
        const threadsWithDates = data.threads.map((thread: any) => ({
          ...thread,
          authorId: thread.author_id || thread.authorId,
          createdAt: new Date(thread.created_at || thread.createdAt),
          parentId: thread.parent_id || thread.parentId,
          topicDayId: thread.topic_day_id || thread.topicDayId,
          groupId: thread.group_id || thread.groupId
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
    { id: 'all', label: 'All Threads', icon: UsersIcon },
    { id: 'following', label: 'Following', icon: FireIcon },
  ]

  // No need for client-side filtering since we're doing it on the server
  const filteredThreads = threads
  
  // Debug logging
  console.log('Feed render - threads:', threads.length, 'filteredThreads:', filteredThreads.length)
  console.log('Current filter:', filter)
  console.log('Loading state:', loading)
  console.log('Error state:', error)
  console.log('User:', user?.id, 'Users count:', users.length)
  console.log('Users:', users.map(u => ({ id: u.id, username: u.username })))

  return (
    <div className="max-w-2xl mx-auto">
      {/* Threads App Style Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-200 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Home</h1>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-500">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowCreateThread(true)}
              leftIcon={<PlusIcon className="w-4 h-4" />}
              size="sm"
            >
              Compose
            </Button>
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={loading}
            >
              <ArrowPathIcon className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Simple Filters */}
        <div className="flex border-b border-gray-200">
          {filters.map((filterOption) => {
            const Icon = filterOption.icon
            const isActive = filter === filterOption.id
            
            return (
              <button
                key={filterOption.id}
                onClick={() => handleFilterChange(filterOption.id as Filter)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 font-medium text-sm transition-colors ${
                  isActive
                    ? 'text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{filterOption.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Threads List */}
      <div className="divide-y divide-gray-200">
        {loading ? (
          <ThreadLoadingSkeleton count={3} />
        ) : error ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowPathIcon className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load threads</h3>
            <p className="text-gray-600 mb-6">{error.message}</p>
            <button
              onClick={() => loadThreads(filter)}
              className="bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No threads yet</h3>
            <p className="text-gray-600 mb-6">Be the first to start a conversation!</p>
            <button
              onClick={() => setShowCreateThread(true)}
              className="bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800 transition-colors font-medium"
            >
              Create First Thread
            </button>
          </div>
        ) : (
          filteredThreads.map((thread) => {
            console.log('Rendering thread:', thread.id, thread.content)
            return <ThreadCard key={thread.id} thread={thread} onUserClick={onUserClick} />
          })
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
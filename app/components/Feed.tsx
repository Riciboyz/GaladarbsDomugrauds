'use client'

import { useState } from 'react'
import { useApp } from '../providers'
import ThreadCard from './ThreadCard'
import CreateThread from './CreateThread'
import LoadingSkeleton from './LoadingSkeleton'
import { 
  FunnelIcon,
  FireIcon,
  CalendarDaysIcon,
  UsersIcon
} from '@heroicons/react/24/outline'

type Filter = 'all' | 'following' | 'popular' | 'topic-days'

export default function Feed() {
  const { threads, users, user } = useApp()
  const [filter, setFilter] = useState<Filter>('all')
  const [showCreateThread, setShowCreateThread] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const filters = [
    { id: 'all', label: 'All Threads', icon: UsersIcon },
    { id: 'following', label: 'Following', icon: UsersIcon },
    { id: 'popular', label: 'Popular Today', icon: FireIcon },
    { id: 'topic-days', label: 'Topic Days', icon: CalendarDaysIcon },
  ]

  const getFilteredThreads = () => {
    let filtered = [...threads]

    switch (filter) {
      case 'following':
        if (user) {
          filtered = threads.filter(thread => 
            user.following.includes(thread.authorId)
          )
        }
        break
      case 'popular':
        filtered = threads
          .filter(thread => {
            const today = new Date()
            const threadDate = new Date(thread.createdAt)
            return threadDate.toDateString() === today.toDateString()
          })
          .sort((a, b) => (b.likes.length - b.dislikes.length) - (a.likes.length - a.dislikes.length))
        break
      case 'topic-days':
        filtered = threads.filter(thread => thread.topicDayId)
        break
      default:
        break
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  const filteredThreads = getFilteredThreads()

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-secondary-200 p-4 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-secondary-900">Home</h1>
          <button
            onClick={() => setShowCreateThread(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            New Thread
          </button>
        </div>

        {/* Filters */}
        <div className="flex space-x-1 bg-secondary-100 p-1 rounded-lg">
          {filters.map((filterOption) => {
            const Icon = filterOption.icon
            const isActive = filter === filterOption.id
            
            return (
              <button
                key={filterOption.id}
                onClick={() => setFilter(filterOption.id as Filter)}
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-secondary-600 hover:text-secondary-900'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {filterOption.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Threads */}
      <div className="p-4 space-y-4">
        {isLoading ? (
          <LoadingSkeleton />
        ) : filteredThreads.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-secondary-400 mb-4">
              <UsersIcon className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              No threads found
            </h3>
            <p className="text-secondary-500 mb-4">
              {filter === 'following' 
                ? "You're not following anyone yet. Start following users to see their threads here."
                : "Be the first to start a conversation!"
              }
            </p>
            {filter !== 'following' && (
              <button
                onClick={() => setShowCreateThread(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Create First Thread
              </button>
            )}
          </div>
        ) : (
          filteredThreads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} />
          ))
        )}
      </div>

      {/* Create Thread Modal */}
      {showCreateThread && (
        <CreateThread onClose={() => setShowCreateThread(false)} />
      )}
    </div>
  )
}

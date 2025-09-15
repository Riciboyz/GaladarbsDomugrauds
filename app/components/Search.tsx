'use client'

import { useState, useEffect } from 'react'
import { useUser } from '../contexts/UserContext'
import { useThread } from '../contexts/ThreadContext'
import ThreadCard from './ThreadCard'
import { 
  MagnifyingGlassIcon,
  UserIcon,
  HashtagIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface SearchProps {
  onUserClick?: (userId: string) => void
}

export default function Search({ onUserClick }: SearchProps) {
  const { users, user, followUser, unfollowUser, isFollowing } = useUser()
  const { searchThreads } = useThread()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeTab, setActiveTab] = useState('threads')
  const [followLoading, setFollowLoading] = useState<string | null>(null)

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await searchThreads(searchQuery)
      setSearchResults(results)
    } catch (error) {
      console.error('Error searching:', error)
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  // Filter users to show only followers (people who follow the current user)
  const filteredUsers = users.filter(u => 
    u.id !== user?.id && // Don't show current user
    user?.followers?.includes(u.id) && // Only show users who follow the current user
    (u.displayName.toLowerCase().includes(query.toLowerCase()) ||
     u.username.toLowerCase().includes(query.toLowerCase()))
  )

  const handleFollow = async (userId: string) => {
    if (!user) return
    
    setFollowLoading(userId)
    try {
      const isCurrentlyFollowing = isFollowing(userId)
      const success = isCurrentlyFollowing 
        ? await unfollowUser(userId)
        : await followUser(userId)
      
      if (!success) {
        console.error('Failed to update follow status')
      }
    } catch (error) {
      console.error('Error updating follow status:', error)
    } finally {
      setFollowLoading(null)
    }
  }

  const tabs = [
    { id: 'threads', name: 'Threads', count: searchResults.length },
    { id: 'users', name: 'Users', count: filteredUsers.length },
    { id: 'hashtags', name: 'Hashtags', count: 0 }
  ]

  return (
    <div className="max-w-2xl mx-auto">
      {/* Ultra-Minimal Header */}
      <div className="mb-6">
        <h1 className="heading-1 text-gray-900">Search</h1>
        <p className="body-regular text-gray-600 mt-1">Find threads, people, and topics</p>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search threads, users, or hashtags..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input pl-10 pr-10"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Tabs */}
      <div className="flex items-center space-x-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {tab.name}
            {tab.count > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search Results */}
      {query ? (
        <div>
          {isSearching ? (
            <div className="card p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="body-regular text-gray-600">Searching...</p>
            </div>
          ) : (
            <>
              {/* Threads Tab */}
              {activeTab === 'threads' && (
                <div className="space-y-4">
                  {searchResults.length === 0 ? (
                    <div className="card p-12 text-center">
                      <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="heading-3 text-gray-900 mb-2">No threads found</h3>
                      <p className="body-regular text-gray-600">
                        Try searching with different keywords
                      </p>
                    </div>
                  ) : (
                    searchResults.map((thread) => (
                      <ThreadCard key={thread.id} thread={thread} onUserClick={onUserClick} />
                    ))
                  )}
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="space-y-3">
                  {filteredUsers.length === 0 ? (
                    <div className="card p-12 text-center">
                      <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="heading-3 text-gray-900 mb-2">No users found</h3>
                      <p className="body-regular text-gray-600">
                        Try searching with a different username or name
                      </p>
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div key={user.id} className="card-elevated">
                        <div className="p-4">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                              onClick={() => onUserClick?.(user.id)}
                            >
                              <img
                                src={user.avatar || `https://ui-avatars.com/api/?name=${user.displayName}&background=3b82f6&color=fff`}
                                alt={user.displayName}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate hover:text-blue-600">
                                  {user.displayName}
                                </h3>
                                <p className="text-sm text-gray-500">@{user.username}</p>
                                {user.bio && (
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                    {user.bio}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button 
                              onClick={() => handleFollow(user.id)}
                              disabled={followLoading === user.id}
                              className={`btn-secondary text-sm ${
                                isFollowing(user.id) 
                                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {followLoading === user.id ? (
                                <div className="flex items-center space-x-1">
                                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                                  <span>Loading...</span>
                                </div>
                              ) : isFollowing(user.id) ? (
                                'Unfollow'
                              ) : (
                                'Follow'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Hashtags Tab */}
              {activeTab === 'hashtags' && (
                <div className="card p-12 text-center">
                  <HashtagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="heading-3 text-gray-900 mb-2">Hashtag search coming soon</h3>
                  <p className="body-regular text-gray-600">
                    We're working on hashtag search functionality
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="card p-12 text-center">
          <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="heading-3 text-gray-900 mb-2">Start searching</h3>
          <p className="body-regular text-gray-600">
            Enter a search term to find threads, users, or hashtags
          </p>
        </div>
      )}
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useUser } from '../../contexts/UserContext'
import { 
  MagnifyingGlassIcon,
  UserIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface SearchProps {
  onUserClick?: (userId: string) => void
  onStartDm?: (userId: string) => void
}

export default function Search({ onUserClick, onStartDm }: SearchProps) {
  const { user, followUser, unfollowUser, isFollowing } = useUser()
  const [query, setQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeTab, setActiveTab] = useState('users')
  const [followLoading, setFollowLoading] = useState<string | null>(null)

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setUserSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      // Search users
      const userResponse = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
      if (userResponse.ok) {
        const userData = await userResponse.json()
        if (userData.success) {
          setUserSearchResults(userData.users)
        }
      }
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

  // Filter out current user from search results
  const filteredUsers = userSearchResults.filter(u => u.id !== user?.id)

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
    { id: 'users', name: 'Lietotāji', count: userSearchResults.length }
  ]

  return (
    <div className="max-w-2xl mx-auto">
      {/* Ultra-Minimal Header */}
      <div className="mb-6">
        <h1 className="heading-1 text-ink">Meklēšana</h1>
        <p className="body-regular text-ink-muted mt-1">Atrodi cilvēkus un sazinies ar lietotājiem</p>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <MagnifyingGlassIcon className="w-5 h-5 text-ink-muted/60 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <input
          type="text"
          placeholder="Meklēt lietotājus..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input pl-10 pr-10"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ink-muted/60 hover:text-ink"
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
                ? 'bg-accent/15 text-accent'
                : 'text-ink-muted hover:text-ink hover:bg-surface-2'
            }`}
          >
            {tab.name}
            {tab.count > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-surface-2 text-ink-muted rounded-full">
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
              <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="body-regular text-ink-muted">Meklē...</p>
            </div>
          ) : (
            <div>
              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="space-y-3">
                  {filteredUsers.length === 0 ? (
                    <div className="card p-12 text-center">
                      <UserIcon className="w-12 h-12 text-ink-muted/60 mx-auto mb-4" />
                      <h3 className="heading-3 text-ink mb-2">Lietotāji netika atrasti</h3>
                      <p className="body-regular text-ink-muted">
                        Pamēģini meklēt ar citu lietotājvārdu vai vārdu
                      </p>
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <div key={u.id} className="card-elevated">
                        <div className="p-4">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                              onClick={() => onUserClick?.(u.id)}
                            >
                              <img
                                src={u.avatar || `https://ui-avatars.com/api/?name=${u.displayName}&background=3b82f6&color=fff`}
                                alt={u.displayName}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-ink truncate hover:text-accent">
                                  {u.displayName}
                                </h3>
                                <p className="text-sm text-ink-muted">@{u.username}</p>
                                {u.bio && (
                                  <p className="text-sm text-ink-muted mt-1 line-clamp-2">
                                    {u.bio}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                              {user && u.id !== user.id && onStartDm && (
                                <button
                                  type="button"
                                  onClick={() => onStartDm(u.id)}
                                  className="px-3 py-2 rounded-lg font-medium text-sm border border-border-ui text-ink hover:bg-surface-2"
                                >
                                  Ziņa
                                </button>
                              )}
                              <button 
                                onClick={() => handleFollow(u.id)}
                                disabled={followLoading === u.id}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                                  isFollowing(u.id) 
                                    ? 'bg-surface text-ink border border-border-ui hover:bg-surface-2' 
                                    : 'bg-accent text-accent-fg hover:bg-accent-hover'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {followLoading === u.id ? (
                                  <div className="flex items-center space-x-1">
                                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                                    <span>Ielādē...</span>
                                  </div>
                                ) : isFollowing(u.id) ? (
                                  'Atsekot'
                                ) : (
                                  'Sekot'
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="card p-12 text-center">
          <UserIcon className="w-12 h-12 text-ink-muted/60 mx-auto mb-4" />
          <h3 className="heading-3 text-ink mb-2">Sāc meklēt lietotājus</h3>
          <p className="body-regular text-ink-muted">
            Ievadi vārdu vai lietotājvārdu, lai atrastu cilvēkus saziņai
          </p>
        </div>
      )}
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useApp } from '../providers'
import { 
  MagnifyingGlassIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  HashtagIcon
} from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'

export default function Search() {
  const { users, groups, topicDays, threads } = useApp()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'groups' | 'topics' | 'hashtags'>('all')
  const [searchResults, setSearchResults] = useState({
    users: [] as any[],
    groups: [] as any[],
    topics: [] as any[],
    hashtags: [] as string[]
  })

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch(searchQuery.trim())
    } else {
      setSearchResults({ users: [], groups: [], topics: [], hashtags: [] })
    }
  }, [searchQuery])

  const performSearch = (query: string) => {
    const lowercaseQuery = query.toLowerCase()

    // Search users
    const userResults = users.filter(user => 
      user.displayName.toLowerCase().includes(lowercaseQuery) ||
      user.username.toLowerCase().includes(lowercaseQuery) ||
      user.bio?.toLowerCase().includes(lowercaseQuery)
    )

    // Search groups
    const groupResults = groups.filter(group =>
      group.name.toLowerCase().includes(lowercaseQuery) ||
      group.description?.toLowerCase().includes(lowercaseQuery)
    )

    // Search topic days
    const topicResults = topicDays.filter(topic =>
      topic.title.toLowerCase().includes(lowercaseQuery) ||
      topic.description.toLowerCase().includes(lowercaseQuery)
    )

    // Search hashtags
    const hashtagResults = new Set<string>()
    threads.forEach(thread => {
      const hashtags = thread.content.match(/#\w+/g)
      if (hashtags) {
        hashtags.forEach(hashtag => {
          if (hashtag.toLowerCase().includes(lowercaseQuery)) {
            hashtagResults.add(hashtag)
          }
        })
      }
    })

    setSearchResults({
      users: userResults,
      groups: groupResults,
      topics: topicResults,
      hashtags: Array.from(hashtagResults)
    })
  }

  const tabs = [
    { id: 'all', label: 'All', icon: MagnifyingGlassIcon },
    { id: 'users', label: 'Users', icon: UserIcon },
    { id: 'groups', label: 'Groups', icon: ChatBubbleLeftRightIcon },
    { id: 'topics', label: 'Topics', icon: CalendarDaysIcon },
    { id: 'hashtags', label: 'Hashtags', icon: HashtagIcon },
  ]

  const renderUserResults = () => (
    <div className="space-y-4">
      {searchResults.users.map((user) => (
        <div key={user.id} className="bg-white rounded-xl border border-secondary-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-4">
            <img
              src={user.avatar || 'https://via.placeholder.com/50'}
              alt={user.displayName}
              className="h-12 w-12 rounded-full object-cover"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-secondary-900">{user.displayName}</h3>
              <p className="text-secondary-500">@{user.username}</p>
              {user.bio && (
                <p className="text-sm text-secondary-600 mt-1">{user.bio}</p>
              )}
              <div className="flex items-center space-x-4 mt-2 text-sm text-secondary-500">
                <span>{user.followers.length} followers</span>
                <span>{user.following.length} following</span>
              </div>
            </div>
            <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
              Follow
            </button>
          </div>
        </div>
      ))}
    </div>
  )

  const renderGroupResults = () => (
    <div className="space-y-4">
      {searchResults.groups.map((group) => (
        <div key={group.id} className="bg-white rounded-xl border border-secondary-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-4">
            <img
              src={group.avatar || 'https://via.placeholder.com/50'}
              alt={group.name}
              className="h-12 w-12 rounded-full object-cover"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-secondary-900">{group.name}</h3>
              <p className="text-sm text-secondary-600">{group.description}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-secondary-500">
                <span>{group.members.length} members</span>
                <span>{group.isPublic ? 'Public' : 'Private'}</span>
                <span>Created {formatDistanceToNow(new Date(group.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
            <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
              Join
            </button>
          </div>
        </div>
      ))}
    </div>
  )

  const renderTopicResults = () => (
    <div className="space-y-4">
      {searchResults.topics.map((topic) => (
        <div key={topic.id} className="bg-white rounded-xl border border-secondary-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <CalendarDaysIcon className="h-5 w-5 text-primary-600" />
                <span className="text-sm font-medium text-primary-600">
                  {formatDistanceToNow(new Date(topic.date), { addSuffix: true })}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">{topic.title}</h3>
              <p className="text-secondary-600 mb-4">{topic.description}</p>
              <div className="flex items-center space-x-4 text-sm text-secondary-500">
                <span>{topic.threads.length} threads</span>
              </div>
            </div>
            <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
              Join Discussion
            </button>
          </div>
        </div>
      ))}
    </div>
  )

  const renderHashtagResults = () => (
    <div className="space-y-4">
      {searchResults.hashtags.map((hashtag, index) => (
        <div key={index} className="bg-white rounded-xl border border-secondary-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <HashtagIcon className="h-6 w-6 text-primary-600" />
              <span className="text-lg font-semibold text-primary-600">{hashtag}</span>
            </div>
            <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
              View Posts
            </button>
          </div>
        </div>
      ))}
    </div>
  )

  const renderAllResults = () => {
    const hasResults = searchResults.users.length > 0 || 
                      searchResults.groups.length > 0 || 
                      searchResults.topics.length > 0 || 
                      searchResults.hashtags.length > 0

    if (!hasResults) {
      return (
        <div className="text-center py-12">
          <MagnifyingGlassIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">No results found</h3>
          <p className="text-secondary-500">Try searching for users, groups, topics, or hashtags</p>
        </div>
      )
    }

    return (
      <div className="space-y-8">
        {searchResults.users.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">Users ({searchResults.users.length})</h2>
            {renderUserResults()}
          </div>
        )}
        
        {searchResults.groups.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">Groups ({searchResults.groups.length})</h2>
            {renderGroupResults()}
          </div>
        )}
        
        {searchResults.topics.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">Topic Days ({searchResults.topics.length})</h2>
            {renderTopicResults()}
          </div>
        )}
        
        {searchResults.hashtags.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">Hashtags ({searchResults.hashtags.length})</h2>
            {renderHashtagResults()}
          </div>
        )}
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return searchResults.users.length > 0 ? renderUserResults() : (
          <div className="text-center py-12">
            <UserIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <p className="text-secondary-500">No users found</p>
          </div>
        )
      case 'groups':
        return searchResults.groups.length > 0 ? renderGroupResults() : (
          <div className="text-center py-12">
            <ChatBubbleLeftRightIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <p className="text-secondary-500">No groups found</p>
          </div>
        )
      case 'topics':
        return searchResults.topics.length > 0 ? renderTopicResults() : (
          <div className="text-center py-12">
            <CalendarDaysIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <p className="text-secondary-500">No topics found</p>
          </div>
        )
      case 'hashtags':
        return searchResults.hashtags.length > 0 ? renderHashtagResults() : (
          <div className="text-center py-12">
            <HashtagIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <p className="text-secondary-500">No hashtags found</p>
          </div>
        )
      default:
        return renderAllResults()
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-secondary-200 p-6 z-10">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-secondary-900">Search</h1>
          <p className="text-secondary-500">Find users, groups, topics, and hashtags</p>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
          <input
            type="text"
            placeholder="Search users, groups, topics, or hashtags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-secondary-100 p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-secondary-600 hover:text-secondary-900'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Results */}
      <div className="p-6">
        {searchQuery ? (
          renderContent()
        ) : (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">Start searching</h3>
            <p className="text-secondary-500">Enter a search term to find users, groups, topics, or hashtags</p>
          </div>
        )}
      </div>
    </div>
  )
}

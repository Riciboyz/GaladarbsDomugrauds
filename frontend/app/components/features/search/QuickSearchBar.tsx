'use client'

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useUser } from '../../contexts/UserContext'
import { 
  MagnifyingGlassIcon,
  UserIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface QuickSearchBarProps {
  onUserClick?: (userId: string) => void
  placeholder?: string
  className?: string
}

const QuickSearchBar = forwardRef<{ focus: () => void }, QuickSearchBarProps>(({ 
  onUserClick, 
  placeholder = "Meklēt lietotājus...",
  className = ""
}, ref) => {
  const { user } = useUser()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus()
    }
  }))

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=5`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Filter out current user from results
          const filteredResults = data.users.filter((u: any) => u.id !== user?.id)
          setSearchResults(filteredResults)
          setShowResults(true)
        }
      }
    } catch (error) {
      console.error('Error searching users:', error)
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

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleUserClick(searchResults[selectedIndex].id)
        }
        break
      case 'Escape':
        setShowResults(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const handleUserClick = (userId: string) => {
    setQuery('')
    setShowResults(false)
    setSelectedIndex(-1)
    onUserClick?.(userId)
  }

  const handleInputFocus = () => {
    if (searchResults.length > 0) {
      setShowResults(true)
    }
  }

  const handleInputBlur = () => {
    // Delay hiding results to allow for clicks
    setTimeout(() => {
      setShowResults(false)
      setSelectedIndex(-1)
    }, 150)
  }

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setShowResults(false)
              setSelectedIndex(-1)
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Meklē...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-4 text-center">
              <UserIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Nav atrasts neviens lietotājs</p>
            </div>
          ) : (
            <div className="py-1">
              {searchResults.map((user, index) => (
                <div
                  key={user.id}
                  onClick={() => handleUserClick(user.id)}
                  className={`px-4 py-3 cursor-pointer transition-colors flex items-center space-x-3 ${
                    index === selectedIndex
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <img
                    src={user.avatar || `https://ui-avatars.com/api/?name=${user.displayName}&background=3b82f6&color=fff`}
                    alt={user.displayName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-gray-500">@{user.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
})

QuickSearchBar.displayName = 'QuickSearchBar'

export default QuickSearchBar

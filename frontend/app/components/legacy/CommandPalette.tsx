'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  MagnifyingGlassIcon,
  CommandLineIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowRightOnRectangleIcon as EnterIcon
} from '@heroicons/react/24/outline'

interface CommandItem {
  id: string
  title: string
  description?: string
  icon?: React.ReactNode
  keywords?: string[]
  action: () => void
  category?: string
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  commands: CommandItem[]
  placeholder?: string
  className?: string
}

export default function CommandPalette({
  isOpen,
  onClose,
  commands,
  placeholder = 'Type a command or search...',
  className = ''
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filteredCommands = commands.filter(command => {
    const searchTerm = query.toLowerCase()
    return (
      command.title.toLowerCase().includes(searchTerm) ||
      command.description?.toLowerCase().includes(searchTerm) ||
      command.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm)) ||
      command.category?.toLowerCase().includes(searchTerm)
    )
  })

  const groupedCommands = filteredCommands.reduce((groups, command) => {
    const category = command.category || 'General'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(command)
    return groups
  }, {} as Record<string, CommandItem[]>)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (event: KeyboardEvent) => {
        switch (event.key) {
          case 'Escape':
            onClose()
            break
          case 'ArrowDown':
            event.preventDefault()
            setSelectedIndex(prev => 
              Math.min(prev + 1, filteredCommands.length - 1)
            )
            break
          case 'ArrowUp':
            event.preventDefault()
            setSelectedIndex(prev => Math.max(prev - 1, 0))
            break
          case 'Enter':
            event.preventDefault()
            if (filteredCommands[selectedIndex]) {
              filteredCommands[selectedIndex].action()
              onClose()
            }
            break
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, filteredCommands, selectedIndex, onClose])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Command Palette */}
      <div className="flex min-h-full items-start justify-center p-4 pt-16">
        <div className={`w-full max-w-2xl bg-white rounded-xl shadow-xl ${className}`}>
          {/* Header */}
          <div className="flex items-center border-b border-secondary-200 p-4">
            <MagnifyingGlassIcon className="h-5 w-5 text-secondary-400 mr-3" />
            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 text-lg border-none outline-none placeholder-secondary-500"
            />
            <div className="flex items-center space-x-1 text-xs text-secondary-500">
              <kbd className="px-2 py-1 bg-secondary-100 rounded">↑↓</kbd>
              <span>navigate</span>
              <kbd className="px-2 py-1 bg-secondary-100 rounded">↵</kbd>
              <span>select</span>
              <kbd className="px-2 py-1 bg-secondary-100 rounded">esc</kbd>
              <span>close</span>
            </div>
          </div>

          {/* Commands List */}
          <div ref={listRef} className="max-h-96 overflow-y-auto">
            {Object.keys(groupedCommands).length === 0 ? (
              <div className="p-8 text-center text-secondary-500">
                <CommandLineIcon className="h-12 w-12 mx-auto mb-4 text-secondary-300" />
                <p>No commands found</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, categoryCommands]) => (
                <div key={category}>
                  <div className="px-4 py-2 text-xs font-semibold text-secondary-500 uppercase tracking-wide bg-secondary-50">
                    {category}
                  </div>
                  {categoryCommands.map((command, index) => {
                    const globalIndex = filteredCommands.indexOf(command)
                    const isSelected = globalIndex === selectedIndex

                    return (
                      <button
                        key={command.id}
                        onClick={() => {
                          command.action()
                          onClose()
                        }}
                        className={`w-full flex items-center px-4 py-3 text-left hover:bg-secondary-50 transition-colors ${
                          isSelected ? 'bg-primary-50' : ''
                        }`}
                      >
                        {command.icon && (
                          <div className="mr-3 text-secondary-400">
                            {command.icon}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-secondary-900">
                            {command.title}
                          </div>
                          {command.description && (
                            <div className="text-sm text-secondary-500 truncate">
                              {command.description}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <div className="ml-3 text-primary-600">
                            <EnterIcon className="h-4 w-4" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook for command palette state management
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  const openCommandPalette = () => setIsOpen(true)
  const closeCommandPalette = () => setIsOpen(false)
  const toggleCommandPalette = () => setIsOpen(prev => !prev)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        toggleCommandPalette()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    isOpen,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette
  }
}
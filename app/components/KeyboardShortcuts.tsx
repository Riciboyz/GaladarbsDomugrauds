'use client'

import { useEffect } from 'react'
import { useApp } from '../providers'

interface KeyboardShortcutsProps {
  onNewThread: () => void
  onSearch: () => void
  onHome: () => void
  onProfile: () => void
  onGroups: () => void
  onNotifications: () => void
  onTopicDays: () => void
  onSettings: () => void
}

export default function KeyboardShortcuts({
  onNewThread,
  onSearch,
  onHome,
  onProfile,
  onGroups,
  onNotifications,
  onTopicDays,
  onSettings
}: KeyboardShortcutsProps) {
  const { user } = useApp()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when user is logged in and not typing in input/textarea
      if (!user || 
          event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return
      }

      // Check for modifier keys
      const isCtrlOrCmd = event.ctrlKey || event.metaKey
      const isShift = event.shiftKey

      // Global shortcuts
      if (isCtrlOrCmd) {
        switch (event.key) {
          case 'k':
            event.preventDefault()
            onSearch()
            break
          case 'n':
            event.preventDefault()
            onNewThread()
            break
          case '1':
            event.preventDefault()
            onHome()
            break
          case '2':
            event.preventDefault()
            onProfile()
            break
          case '3':
            event.preventDefault()
            onGroups()
            break
          case '4':
            event.preventDefault()
            onNotifications()
            break
          case '5':
            event.preventDefault()
            onTopicDays()
            break
          case ',':
            event.preventDefault()
            onSettings()
            break
        }
      }

      // Number shortcuts (without modifier)
      if (!isCtrlOrCmd && !isShift && event.key >= '1' && event.key <= '5') {
        event.preventDefault()
        switch (event.key) {
          case '1':
            onHome()
            break
          case '2':
            onProfile()
            break
          case '3':
            onGroups()
            break
          case '4':
            onNotifications()
            break
          case '5':
            onTopicDays()
            break
        }
      }

      // Quick shortcuts
      if (!isCtrlOrCmd && !isShift) {
        switch (event.key) {
          case '?':
            event.preventDefault()
            // Show help modal
            break
          case 'Escape':
            // Close any open modals
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [user, onNewThread, onSearch, onHome, onProfile, onGroups, onNotifications, onTopicDays, onSettings])

  return null
}

export function KeyboardShortcutsHelp() {
  const shortcuts = [
    { keys: ['Ctrl', 'K'], description: 'Search' },
    { keys: ['Ctrl', 'N'], description: 'New Thread' },
    { keys: ['Ctrl', '1'], description: 'Home' },
    { keys: ['Ctrl', '2'], description: 'Profile' },
    { keys: ['Ctrl', '3'], description: 'Groups' },
    { keys: ['Ctrl', '4'], description: 'Notifications' },
    { keys: ['Ctrl', '5'], description: 'Topic Days' },
    { keys: ['Ctrl', ','], description: 'Settings' },
    { keys: ['1-5'], description: 'Quick navigation' },
    { keys: ['?'], description: 'Show this help' },
    { keys: ['Esc'], description: 'Close modals' },
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-secondary-900">Keyboard Shortcuts</h3>
      <div className="grid grid-cols-1 gap-3">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm text-secondary-600">{shortcut.description}</span>
            <div className="flex items-center space-x-1">
              {shortcut.keys.map((key, keyIndex) => (
                <span key={keyIndex}>
                  <kbd className="px-2 py-1 text-xs font-semibold text-secondary-800 bg-secondary-100 border border-secondary-200 rounded">
                    {key}
                  </kbd>
                  {keyIndex < shortcut.keys.length - 1 && (
                    <span className="mx-1 text-secondary-400">+</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

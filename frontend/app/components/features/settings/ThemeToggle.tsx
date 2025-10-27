'use client'

import { useState, useEffect } from 'react'
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'

type Theme = 'light' | 'dark' | 'system'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme') as Theme
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }

    localStorage.setItem('theme', theme)
  }, [theme, mounted])

  if (!mounted) {
    return (
      <div className="h-8 w-8 rounded-lg bg-secondary-200 animate-pulse"></div>
    )
  }

  const themes = [
    { id: 'light', label: 'Light', icon: SunIcon },
    { id: 'dark', label: 'Dark', icon: MoonIcon },
    { id: 'system', label: 'System', icon: ComputerDesktopIcon },
  ]

  const currentTheme = themes.find(t => t.id === theme)
  const Icon = currentTheme?.icon || SunIcon

  return (
    <div className="relative">
      <button
        onClick={() => {
          const currentIndex = themes.findIndex(t => t.id === theme)
          const nextIndex = (currentIndex + 1) % themes.length
          setTheme(themes[nextIndex].id as Theme)
        }}
        className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
        title={`Current theme: ${currentTheme?.label}`}
      >
        <Icon className="h-5 w-5 text-secondary-600" />
      </button>
    </div>
  )
}

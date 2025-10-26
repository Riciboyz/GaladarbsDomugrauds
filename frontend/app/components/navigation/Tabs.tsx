'use client'

import { useState, ReactNode } from 'react'

interface Tab {
  id: string
  label: string
  content: ReactNode
  disabled?: boolean
  icon?: ReactNode
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  onChange?: (tabId: string) => void
  className?: string
  variant?: 'default' | 'pills' | 'underline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export default function Tabs({
  tabs,
  defaultTab,
  onChange,
  className = '',
  variant = 'default',
  size = 'md',
  fullWidth = false
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    onChange?.(tabId)
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'pills':
        return 'bg-secondary-100 p-1 rounded-lg'
      case 'underline':
        return 'border-b border-secondary-200'
      default:
        return 'bg-secondary-100 p-1 rounded-lg'
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2 text-sm'
      case 'lg':
        return 'px-6 py-3 text-lg'
      default:
        return 'px-4 py-2 text-base'
    }
  }

  const getTabClasses = (tab: Tab) => {
    const isActive = activeTab === tab.id
    const baseClasses = 'flex items-center justify-center font-medium transition-colors'
    const sizeClasses = getSizeClasses()
    const widthClasses = fullWidth ? 'flex-1' : ''
    
    if (variant === 'underline') {
      return `${baseClasses} ${sizeClasses} ${widthClasses} ${
        isActive
          ? 'text-primary-600 border-b-2 border-primary-600'
          : 'text-secondary-600 hover:text-secondary-900'
      }`
    }
    
    return `${baseClasses} ${sizeClasses} ${widthClasses} rounded-md ${
      isActive
        ? 'bg-white text-primary-700 shadow-sm'
        : 'text-secondary-600 hover:text-secondary-900'
    }`
  }

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content

  return (
    <div className={className}>
      {/* Tab Headers */}
      <div className={`flex ${getVariantClasses()}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && handleTabChange(tab.id)}
            disabled={tab.disabled}
            className={getTabClasses(tab)}
          >
            {tab.icon && (
              <span className="mr-2">{tab.icon}</span>
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTabContent}
      </div>
    </div>
  )
}

// Hook for tab state management
export function useTabs(tabs: Tab[], defaultTab?: string) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  const changeTab = (tabId: string) => {
    setActiveTab(tabId)
  }

  return {
    activeTab,
    changeTab
  }
}

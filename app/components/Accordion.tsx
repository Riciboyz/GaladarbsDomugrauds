'use client'

import { useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface AccordionItem {
  id: string
  title: string
  content: React.ReactNode
  disabled?: boolean
  defaultOpen?: boolean
}

interface AccordionProps {
  items: AccordionItem[]
  allowMultiple?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'bordered' | 'flush'
}

export default function Accordion({
  items,
  allowMultiple = false,
  className = '',
  size = 'md',
  variant = 'default'
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>(
    items.filter(item => item.defaultOpen).map(item => item.id)
  )

  const toggleItem = (itemId: string) => {
    setOpenItems(prev => {
      if (allowMultiple) {
        return prev.includes(itemId)
          ? prev.filter(id => id !== itemId)
          : [...prev, itemId]
      } else {
        return prev.includes(itemId) ? [] : [itemId]
      }
    })
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'p-3'
      case 'lg':
        return 'p-6'
      default:
        return 'p-4'
    }
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'bordered':
        return 'border border-secondary-200 rounded-lg'
      case 'flush':
        return 'border-0'
      default:
        return 'border border-secondary-200 rounded-lg'
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item) => {
        const isOpen = openItems.includes(item.id)
        const isDisabled = item.disabled

        return (
          <div
            key={item.id}
            className={`${getVariantClasses()} ${isDisabled ? 'opacity-50' : ''}`}
          >
            <button
              onClick={() => !isDisabled && toggleItem(item.id)}
              disabled={isDisabled}
              className={`w-full flex items-center justify-between ${getSizeClasses()} text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset ${
                isDisabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-secondary-50'
              }`}
            >
              <span className="font-medium text-secondary-900">{item.title}</span>
              <ChevronDownIcon
                className={`h-5 w-5 text-secondary-500 transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            
            {isOpen && (
              <div className={`${getSizeClasses()} pt-0 border-t border-secondary-200`}>
                {item.content}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Hook for accordion state management
export function useAccordion(initialItems: string[] = []) {
  const [openItems, setOpenItems] = useState<string[]>(initialItems)

  const toggleItem = (itemId: string) => {
    setOpenItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const openItem = (itemId: string) => {
    setOpenItems(prev => 
      prev.includes(itemId) ? prev : [...prev, itemId]
    )
  }

  const closeItem = (itemId: string) => {
    setOpenItems(prev => prev.filter(id => id !== itemId))
  }

  const openAll = () => {
    setOpenItems(prev => [...new Set([...prev, ...items])])
  }

  const closeAll = () => {
    setOpenItems([])
  }

  const isOpen = (itemId: string) => openItems.includes(itemId)

  return {
    openItems,
    toggleItem,
    openItem,
    closeItem,
    openAll,
    closeAll,
    isOpen
  }
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface PopoverProps {
  trigger: React.ReactNode
  content: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  className?: string
  closeOnClickOutside?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
  onOpen?: () => void
  onClose?: () => void
}

export default function Popover({
  trigger,
  content,
  position = 'auto',
  className = '',
  closeOnClickOutside = true,
  closeOnEscape = true,
  showCloseButton = false,
  onOpen,
  onClose
}: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState(position)
  const triggerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const openPopover = () => {
    setIsOpen(true)
    onOpen?.()
  }

  const closePopover = () => {
    setIsOpen(false)
    onClose?.()
  }

  const togglePopover = () => {
    if (isOpen) {
      closePopover()
    } else {
      openPopover()
    }
  }

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        closePopover()
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (closeOnClickOutside && 
          triggerRef.current && 
          popoverRef.current &&
          !triggerRef.current.contains(event.target as Node) &&
          !popoverRef.current.contains(event.target as Node)) {
        closePopover()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, closeOnClickOutside, closeOnEscape])

  useEffect(() => {
    if (!isOpen || position !== 'auto') return

    const updatePosition = () => {
      if (triggerRef.current && popoverRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect()
        const popoverRect = popoverRef.current.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        let newPosition = position

        // Check if popover fits on the right
        if (triggerRect.right + popoverRect.width > viewportWidth) {
          newPosition = 'left'
        }

        // Check if popover fits on the bottom
        if (triggerRect.bottom + popoverRect.height > viewportHeight) {
          newPosition = 'top'
        }

        setPopoverPosition(newPosition)
      }
    }

    updatePosition()
  }, [isOpen, position])

  const getPositionClasses = () => {
    switch (popoverPosition) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2'
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2'
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2'
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2'
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2'
    }
  }

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger */}
      <div ref={triggerRef} onClick={togglePopover}>
        {trigger}
      </div>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute z-50 bg-white border border-secondary-200 rounded-lg shadow-lg ${getPositionClasses()}`}
        >
          {showCloseButton && (
            <div className="flex justify-end p-2 border-b border-secondary-200">
              <button
                onClick={closePopover}
                className="p-1 hover:bg-secondary-100 rounded transition-colors"
              >
                <XMarkIcon className="h-4 w-4 text-secondary-500" />
              </button>
            </div>
          )}
          <div className="p-4">
            {content}
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for popover state management
export function usePopover() {
  const [isOpen, setIsOpen] = useState(false)

  const openPopover = () => setIsOpen(true)
  const closePopover = () => setIsOpen(false)
  const togglePopover = () => setIsOpen(prev => !prev)

  return {
    isOpen,
    openPopover,
    closePopover,
    togglePopover
  }
}
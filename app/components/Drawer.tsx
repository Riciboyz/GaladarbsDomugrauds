'use client'

import { useEffect, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  position?: 'left' | 'right' | 'top' | 'bottom'
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  className?: string
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = ''
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onClose()
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (closeOnOverlayClick && 
          drawerRef.current && 
          !drawerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)

    // Prevent body scroll when drawer is open
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, closeOnEscape, closeOnOverlayClick])

  if (!isOpen) return null

  const getPositionClasses = () => {
    switch (position) {
      case 'left':
        return 'left-0 top-0 h-full'
      case 'right':
        return 'right-0 top-0 h-full'
      case 'top':
        return 'top-0 left-0 w-full'
      case 'bottom':
        return 'bottom-0 left-0 w-full'
      default:
        return 'right-0 top-0 h-full'
    }
  }

  const getSizeClasses = () => {
    switch (position) {
      case 'left':
      case 'right':
        switch (size) {
          case 'sm':
            return 'w-80'
          case 'lg':
            return 'w-96'
          case 'xl':
            return 'w-[32rem]'
          case 'full':
            return 'w-full'
          default:
            return 'w-80'
        }
      case 'top':
      case 'bottom':
        switch (size) {
          case 'sm':
            return 'h-80'
          case 'lg':
            return 'h-96'
          case 'xl':
            return 'h-[32rem]'
          case 'full':
            return 'h-full'
          default:
            return 'h-80'
        }
      default:
        return 'w-80'
    }
  }

  const getAnimationClasses = () => {
    switch (position) {
      case 'left':
        return 'transform transition-transform duration-300 ease-in-out'
      case 'right':
        return 'transform transition-transform duration-300 ease-in-out'
      case 'top':
        return 'transform transition-transform duration-300 ease-in-out'
      case 'bottom':
        return 'transform transition-transform duration-300 ease-in-out'
      default:
        return 'transform transition-transform duration-300 ease-in-out'
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      
      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`absolute ${getPositionClasses()} ${getSizeClasses()} ${getAnimationClasses()} bg-white shadow-xl ${className}`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-secondary-200">
            {title && (
              <h2 className="text-lg font-semibold text-secondary-900">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-secondary-500" />
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  )
}

// Hook for drawer state management
export function useDrawer() {
  const [isOpen, setIsOpen] = useState(false)

  const openDrawer = () => setIsOpen(true)
  const closeDrawer = () => setIsOpen(false)
  const toggleDrawer = () => setIsOpen(prev => !prev)

  return {
    isOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer
  }
}
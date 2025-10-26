'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronRightIcon } from '@heroicons/react/24/outline'

interface ContextMenuItem {
  id: string
  label: string
  icon?: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  children?: ContextMenuItem[]
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  onClose?: () => void
  className?: string
}

export default function ContextMenu({
  items,
  onClose,
  className = ''
}: ContextMenuProps) {
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose?.()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return

    if (item.children && item.children.length > 0) {
      setActiveSubmenu(item.id)
    } else {
      item.onClick?.()
      onClose?.()
    }
  }

  const handleSubmenuClose = () => {
    setActiveSubmenu(null)
  }

  const renderMenuItem = (item: ContextMenuItem) => (
    <button
      key={item.id}
      onClick={() => handleItemClick(item)}
      disabled={item.disabled}
      className={`w-full flex items-center justify-between px-3 py-2 text-sm text-secondary-700 hover:bg-secondary-100 transition-colors ${
        item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <div className="flex items-center space-x-2">
        {item.icon && <span>{item.icon}</span>}
        <span>{item.label}</span>
      </div>
      {item.children && item.children.length > 0 && (
        <ChevronRightIcon className="h-4 w-4" />
      )}
    </button>
  )

  return (
    <div
      ref={menuRef}
      className={`bg-white border border-secondary-200 rounded-lg shadow-lg py-1 min-w-48 ${className}`}
    >
      {items.map(renderMenuItem)}
      
      {/* Submenu */}
      {activeSubmenu && (
        <div className="absolute left-full top-0 ml-1 bg-white border border-secondary-200 rounded-lg shadow-lg py-1 min-w-48">
          {items
            .find(item => item.id === activeSubmenu)
            ?.children?.map(renderMenuItem)}
        </div>
      )}
    </div>
  )
}

// Hook for context menu state management
export function useContextMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [items, setItems] = useState<ContextMenuItem[]>([])

  const openContextMenu = (x: number, y: number, menuItems: ContextMenuItem[]) => {
    setPosition({ x, y })
    setItems(menuItems)
    setIsOpen(true)
  }

  const closeContextMenu = () => {
    setIsOpen(false)
  }

  const handleContextMenu = (e: React.MouseEvent, menuItems: ContextMenuItem[]) => {
    e.preventDefault()
    openContextMenu(e.clientX, e.clientY, menuItems)
  }

  return {
    isOpen,
    position,
    items,
    openContextMenu,
    closeContextMenu,
    handleContextMenu
  }
}

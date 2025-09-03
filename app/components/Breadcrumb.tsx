'use client'

import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
  current?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  separator?: React.ReactNode
  showHome?: boolean
  homeHref?: string
  className?: string
  onItemClick?: (item: BreadcrumbItem, index: number) => void
}

export default function Breadcrumb({
  items,
  separator,
  showHome = true,
  homeHref = '/',
  className = '',
  onItemClick
}: BreadcrumbProps) {
  const defaultSeparator = <ChevronRightIcon className="h-4 w-4 text-secondary-400" />
  const breadcrumbSeparator = separator || defaultSeparator

  const handleItemClick = (item: BreadcrumbItem, index: number) => {
    if (item.href || onItemClick) {
      onItemClick?.(item, index)
    }
  }

  const allItems = showHome
    ? [
        {
          label: 'Home',
          href: homeHref,
          icon: <HomeIcon className="h-4 w-4" />
        },
        ...items
      ]
    : items

  return (
    <nav className={`flex ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1
          const isClickable = item.href || onItemClick

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="mx-2">{breadcrumbSeparator}</span>
              )}
              
              {isClickable ? (
                <button
                  onClick={() => handleItemClick(item, index)}
                  className={`flex items-center text-sm font-medium transition-colors ${
                    item.current || isLast
                      ? 'text-secondary-900'
                      : 'text-secondary-500 hover:text-secondary-700'
                  }`}
                >
                  {item.icon && (
                    <span className="mr-1">{item.icon}</span>
                  )}
                  {item.label}
                </button>
              ) : (
                <span
                  className={`flex items-center text-sm font-medium ${
                    item.current || isLast
                      ? 'text-secondary-900'
                      : 'text-secondary-500'
                  }`}
                >
                  {item.icon && (
                    <span className="mr-1">{item.icon}</span>
                  )}
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Hook for breadcrumb state management
export function useBreadcrumb(initialItems: BreadcrumbItem[] = []) {
  const [items, setItems] = useState<BreadcrumbItem[]>(initialItems)

  const addItem = (item: BreadcrumbItem) => {
    setItems(prev => [...prev, item])
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, updates: Partial<BreadcrumbItem>) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    ))
  }

  const clearItems = () => {
    setItems([])
  }

  const setItems = (newItems: BreadcrumbItem[]) => {
    setItems(newItems)
  }

  return {
    items,
    addItem,
    removeItem,
    updateItem,
    clearItems,
    setItems
  }
}

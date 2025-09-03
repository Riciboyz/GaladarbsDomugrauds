'use client'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
  removable?: boolean
  onRemove?: () => void
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  onClick,
  removable = false,
  onRemove
}: BadgeProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-100 text-primary-800 border-primary-200'
      case 'secondary':
        return 'bg-secondary-100 text-secondary-800 border-secondary-200'
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs'
      case 'lg':
        return 'px-4 py-2 text-base'
      default:
        return 'px-3 py-1 text-sm'
    }
  }

  const baseClasses = 'inline-flex items-center font-medium rounded-full border transition-colors'
  const variantClasses = getVariantClasses()
  const sizeClasses = getSizeClasses()
  const interactiveClasses = onClick ? 'cursor-pointer hover:opacity-80' : ''

  return (
    <span
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${interactiveClasses} ${className}`}
      onClick={onClick}
    >
      {children}
      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove?.()
          }}
          className="ml-1 hover:opacity-70 focus:outline-none"
        >
          <span className="sr-only">Remove</span>
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </span>
  )
}

// Specialized badge components
export function StatusBadge({ status }: { status: string }) {
  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'online':
      case 'published':
        return 'success'
      case 'inactive':
      case 'offline':
      case 'draft':
        return 'secondary'
      case 'pending':
      case 'loading':
        return 'warning'
      case 'error':
      case 'failed':
        return 'error'
      default:
        return 'default'
    }
  }

  return (
    <Badge variant={getStatusVariant(status)}>
      {status}
    </Badge>
  )
}

export function CountBadge({ count, max = 99 }: { count: number; max?: number }) {
  const displayCount = count > max ? `${max}+` : count.toString()

  return (
    <Badge
      variant="error"
      size="sm"
      className="min-w-[20px] h-5 flex items-center justify-center"
    >
      {displayCount}
    </Badge>
  )
}

export function NotificationBadge({ count }: { count: number }) {
  if (count === 0) return null

  return (
    <Badge
      variant="error"
      size="sm"
      className="absolute -top-2 -right-2 min-w-[20px] h-5 flex items-center justify-center"
    >
      {count > 99 ? '99+' : count}
    </Badge>
  )
}

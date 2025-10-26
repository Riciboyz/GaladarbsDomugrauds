'use client'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: boolean | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  animate?: boolean
}

export default function Skeleton({
  className = '',
  width,
  height,
  rounded = false,
  animate = true
}: SkeletonProps) {
  const getRoundedClasses = () => {
    if (rounded === true) return 'rounded'
    if (typeof rounded === 'string') {
      switch (rounded) {
        case 'sm':
          return 'rounded-sm'
        case 'md':
          return 'rounded-md'
        case 'lg':
          return 'rounded-lg'
        case 'xl':
          return 'rounded-xl'
        case 'full':
          return 'rounded-full'
        default:
          return 'rounded'
      }
    }
    return ''
  }

  const getWidth = () => {
    if (typeof width === 'number') return `${width}px`
    if (typeof width === 'string') return width
    return '100%'
  }

  const getHeight = () => {
    if (typeof height === 'number') return `${height}px`
    if (typeof height === 'string') return height
    return '1rem'
  }

  const baseClasses = 'bg-secondary-200'
  const roundedClasses = getRoundedClasses()
  const animateClasses = animate ? 'animate-pulse' : ''

  return (
    <div
      className={`${baseClasses} ${roundedClasses} ${animateClasses} ${className}`}
      style={{
        width: getWidth(),
        height: getHeight()
      }}
    />
  )
}

// Specialized skeleton components
export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height="1rem"
          width={index === lines - 1 ? '75%' : '100%'}
          className="h-4"
        />
      ))}
    </div>
  )
}

export function SkeletonAvatar({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const getSize = () => {
    switch (size) {
      case 'sm':
        return 'h-8 w-8'
      case 'lg':
        return 'h-12 w-12'
      default:
        return 'h-10 w-10'
    }
  }

  return (
    <Skeleton
      rounded="full"
      className={`${getSize()} ${className}`}
    />
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-secondary-200 p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-4">
        <SkeletonAvatar />
        <div className="flex-1">
          <Skeleton height="1rem" width="60%" className="mb-2" />
          <Skeleton height="0.75rem" width="40%" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  )
}

export function SkeletonTable({ rows = 5, columns = 4, className = '' }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-secondary-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-secondary-50 px-6 py-3 border-b border-secondary-200">
        <div className="flex space-x-4">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} height="1rem" width="25%" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-secondary-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="flex space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton key={colIndex} height="1rem" width="25%" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

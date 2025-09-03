'use client'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  clickable?: boolean
  onClick?: () => void
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  border?: boolean
}

export default function Card({
  children,
  className = '',
  hover = false,
  clickable = false,
  onClick,
  padding = 'md',
  shadow = 'md',
  border = true
}: CardProps) {
  const getPaddingClasses = () => {
    switch (padding) {
      case 'none':
        return ''
      case 'sm':
        return 'p-3'
      case 'lg':
        return 'p-8'
      default:
        return 'p-6'
    }
  }

  const getShadowClasses = () => {
    switch (shadow) {
      case 'none':
        return ''
      case 'sm':
        return 'shadow-sm'
      case 'lg':
        return 'shadow-lg'
      default:
        return 'shadow-md'
    }
  }

  const baseClasses = 'bg-white rounded-xl'
  const paddingClasses = getPaddingClasses()
  const shadowClasses = getShadowClasses()
  const borderClasses = border ? 'border border-secondary-200' : ''
  const interactiveClasses = clickable || onClick ? 'cursor-pointer' : ''
  const hoverClasses = hover ? 'hover:shadow-lg transition-shadow duration-200' : ''

  return (
    <div
      className={`${baseClasses} ${paddingClasses} ${shadowClasses} ${borderClasses} ${interactiveClasses} ${hoverClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// Specialized card components
interface CardHeaderProps {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export function CardHeader({ title, subtitle, action, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div>
        {title && (
          <h3 className="text-lg font-semibold text-secondary-900">{title}</h3>
        )}
        {subtitle && (
          <p className="text-sm text-secondary-600 mt-1">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`mt-4 pt-4 border-t border-secondary-200 ${className}`}>
      {children}
    </div>
  )
}

// Stats card component
interface StatsCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
  }
  icon?: React.ReactNode
  className?: string
}

export function StatsCard({ title, value, change, icon, className = '' }: StatsCardProps) {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-secondary-600">{title}</p>
          <p className="text-2xl font-bold text-secondary-900">{value}</p>
          {change && (
            <p className={`text-sm ${change.type === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
              {change.type === 'increase' ? '+' : '-'}{Math.abs(change.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="text-primary-600">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}

// Feature card component
interface FeatureCardProps {
  title: string
  description: string
  icon: React.ReactNode
  onClick?: () => void
  className?: string
}

export function FeatureCard({ title, description, icon, onClick, className = '' }: FeatureCardProps) {
  return (
    <Card
      clickable={!!onClick}
      onClick={onClick}
      hover
      className={`text-center ${className}`}
    >
      <div className="text-primary-600 mb-4 flex justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-secondary-900 mb-2">{title}</h3>
      <p className="text-secondary-600">{description}</p>
    </Card>
  )
}

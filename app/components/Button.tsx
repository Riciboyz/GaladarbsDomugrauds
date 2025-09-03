'use client'

import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  children: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}, ref) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500'
      case 'secondary':
        return 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200 focus:ring-secondary-500'
      case 'outline':
        return 'border border-secondary-300 text-secondary-700 hover:bg-secondary-50 focus:ring-secondary-500'
      case 'ghost':
        return 'text-secondary-700 hover:bg-secondary-100 focus:ring-secondary-500'
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
      default:
        return 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500'
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'px-2 py-1 text-xs'
      case 'sm':
        return 'px-3 py-2 text-sm'
      case 'lg':
        return 'px-6 py-3 text-lg'
      case 'xl':
        return 'px-8 py-4 text-xl'
      default:
        return 'px-4 py-2 text-base'
    }
  }

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const variantClasses = getVariantClasses()
  const sizeClasses = getSizeClasses()
  const widthClasses = fullWidth ? 'w-full' : ''
  const loadingClasses = loading ? 'cursor-wait' : ''

  return (
    <button
      ref={ref}
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${widthClasses} ${loadingClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      
      {!loading && leftIcon && (
        <span className="mr-2">{leftIcon}</span>
      )}
      
      {children}
      
      {!loading && rightIcon && (
        <span className="ml-2">{rightIcon}</span>
      )}
    </button>
  )
})

Button.displayName = 'Button'

export default Button

// Specialized button components
export function IconButton({
  icon,
  ...props
}: Omit<ButtonProps, 'children'> & { icon: React.ReactNode }) {
  return (
    <Button {...props}>
      {icon}
    </Button>
  )
}

export function LoadingButton({
  loading,
  children,
  ...props
}: ButtonProps) {
  return (
    <Button loading={loading} {...props}>
      {children}
    </Button>
  )
}

export function ButtonGroup({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`inline-flex rounded-lg ${className}`}>
      {children}
    </div>
  )
}

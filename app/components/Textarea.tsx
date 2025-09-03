'use client'

import { forwardRef } from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
  variant?: 'default' | 'filled' | 'outlined'
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
  maxLength?: number
  showCharCount?: boolean
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  helperText,
  fullWidth = false,
  variant = 'default',
  resize = 'vertical',
  maxLength,
  showCharCount = false,
  className = '',
  ...props
}, ref) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'filled':
        return 'bg-secondary-100 border-transparent focus:bg-white focus:border-primary-500'
      case 'outlined':
        return 'bg-transparent border-2 focus:border-primary-500'
      default:
        return 'bg-white border border-secondary-300 focus:border-primary-500'
    }
  }

  const getResizeClasses = () => {
    switch (resize) {
      case 'none':
        return 'resize-none'
      case 'vertical':
        return 'resize-y'
      case 'horizontal':
        return 'resize-x'
      case 'both':
        return 'resize'
      default:
        return 'resize-y'
    }
  }

  const baseClasses = 'block w-full rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0'
  const variantClasses = getVariantClasses()
  const errorClasses = error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
  const widthClasses = fullWidth ? 'w-full' : ''
  const resizeClasses = getResizeClasses()

  const currentLength = (props.value as string)?.length || 0
  const isOverLimit = maxLength && currentLength > maxLength

  return (
    <div className={`${widthClasses} ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-secondary-700 mb-2">
          {label}
        </label>
      )}
      
      <textarea
        ref={ref}
        className={`${baseClasses} ${variantClasses} ${errorClasses} ${resizeClasses} px-3 py-2`}
        maxLength={maxLength}
        {...props}
      />
      
      {(error || helperText || showCharCount) && (
        <div className="mt-1 flex justify-between items-start">
          <div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            {helperText && !error && (
              <p className="text-sm text-secondary-500">{helperText}</p>
            )}
          </div>
          
          {showCharCount && maxLength && (
            <p className={`text-sm ${isOverLimit ? 'text-red-600' : 'text-secondary-500'}`}>
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'

export default Textarea

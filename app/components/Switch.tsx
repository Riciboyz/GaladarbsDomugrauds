'use client'

import { forwardRef } from 'react'

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(({
  label,
  error,
  helperText,
  fullWidth = false,
  size = 'md',
  className = '',
  ...props
}, ref) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-7'
      case 'lg':
        return 'h-6 w-11'
      default:
        return 'h-5 w-9'
    }
  }

  const getThumbSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3'
      case 'lg':
        return 'h-5 w-5'
      default:
        return 'h-4 w-4'
    }
  }

  const getTranslateClasses = () => {
    switch (size) {
      case 'sm':
        return 'translate-x-3'
      case 'lg':
        return 'translate-x-5'
      default:
        return 'translate-x-4'
    }
  }

  const widthClasses = fullWidth ? 'w-full' : ''

  return (
    <div className={`${widthClasses} ${className}`}>
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              ref={ref}
              type="checkbox"
              className="sr-only peer"
              {...props}
            />
            <div className={`${getSizeClasses()} bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:${getTranslateClasses()} peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:transition-all peer-checked:bg-primary-600`}>
              <div className={`${getThumbSizeClasses()} absolute top-0.5 left-[2px] bg-white border border-secondary-300 rounded-full transition-all peer-checked:${getTranslateClasses()} peer-checked:border-white`} />
            </div>
          </label>
        </div>
        
        {(label || helperText || error) && (
          <div className="ml-3 text-sm">
            {label && (
              <label className="font-medium text-secondary-700 cursor-pointer">
                {label}
              </label>
            )}
            
            {error && (
              <p className="text-red-600 mt-1">{error}</p>
            )}
            
            {helperText && !error && (
              <p className="text-secondary-500 mt-1">{helperText}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

Switch.displayName = 'Switch'

export default Switch

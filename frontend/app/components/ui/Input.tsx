'use client'

import { forwardRef, useState } from 'react'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  variant?: 'default' | 'filled' | 'outlined'
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  variant = 'default',
  type = 'text',
  className = '',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

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

  const baseClasses = 'block w-full rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0'
  const variantClasses = getVariantClasses()
  const errorClasses = error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
  const widthClasses = fullWidth ? 'w-full' : ''
  const paddingClasses = leftIcon ? 'pl-10' : 'pl-3'
  const rightPaddingClasses = rightIcon || isPassword ? 'pr-10' : 'pr-3'

  return (
    <div className={`${widthClasses} ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-secondary-700 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-secondary-400">{leftIcon}</span>
          </div>
        )}
        
        <input
          ref={ref}
          type={inputType}
          className={`${baseClasses} ${variantClasses} ${errorClasses} ${paddingClasses} ${rightPaddingClasses} py-2`}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {isPassword && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5 text-secondary-400 hover:text-secondary-600" />
            ) : (
              <EyeIcon className="h-5 w-5 text-secondary-400 hover:text-secondary-600" />
            )}
          </button>
        )}
        
        {rightIcon && !isPassword && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-secondary-400">{rightIcon}</span>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-secondary-500">{helperText}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input

// Specialized input components
export function SearchInput({
  placeholder = 'Search...',
  ...props
}: Omit<InputProps, 'leftIcon'>) {
  return (
    <Input
      leftIcon={
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      }
      placeholder={placeholder}
      {...props}
    />
  )
}

export function EmailInput(props: Omit<InputProps, 'type' | 'leftIcon'>) {
  return (
    <Input
      type="email"
      leftIcon={
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
        </svg>
      }
      {...props}
    />
  )
}

export function PasswordInput(props: Omit<InputProps, 'type'>) {
  return (
    <Input
      type="password"
      {...props}
    />
  )
}

'use client'

import { forwardRef } from 'react'

interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
}

const Radio = forwardRef<HTMLInputElement, RadioProps>(({
  label,
  error,
  helperText,
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  const getRadioClasses = () => {
    const baseClasses = 'h-4 w-4 text-primary-600 border-secondary-300 focus:ring-primary-500 focus:ring-2'
    const errorClasses = error ? 'border-red-500 focus:ring-red-500' : ''
    return `${baseClasses} ${errorClasses}`
  }

  const widthClasses = fullWidth ? 'w-full' : ''

  return (
    <div className={`${widthClasses} ${className}`}>
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            ref={ref}
            type="radio"
            className={getRadioClasses()}
            {...props}
          />
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

Radio.displayName = 'Radio'

export default Radio

// Radio group component
interface RadioGroupProps {
  options: Array<{
    id: string
    label: string
    value: any
    disabled?: boolean
  }>
  value: any
  onChange: (value: any) => void
  label?: string
  error?: string
  helperText?: string
  className?: string
  orientation?: 'vertical' | 'horizontal'
}

export function RadioGroup({
  options,
  value,
  onChange,
  label,
  error,
  helperText,
  className = '',
  orientation = 'vertical'
}: RadioGroupProps) {
  const handleChange = (optionValue: any) => {
    onChange(optionValue)
  }

  const containerClasses = orientation === 'horizontal' 
    ? 'flex flex-wrap gap-6' 
    : 'space-y-3'

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-secondary-700 mb-3">
          {label}
        </label>
      )}
      
      <div className={containerClasses}>
        {options.map((option) => (
          <Radio
            key={option.id}
            name={option.id}
            checked={value === option.value}
            onChange={() => handleChange(option.value)}
            disabled={option.disabled}
            label={option.label}
          />
        ))}
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="mt-2 text-sm text-secondary-500">{helperText}</p>
      )}
    </div>
  )
}

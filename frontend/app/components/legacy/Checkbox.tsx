'use client'

import { forwardRef } from 'react'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
  helperText?: string
  indeterminate?: boolean
  fullWidth?: boolean
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  error,
  helperText,
  indeterminate = false,
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  const getCheckboxClasses = () => {
    const baseClasses = 'h-4 w-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500 focus:ring-2'
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
            type="checkbox"
            className={getCheckboxClasses()}
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

Checkbox.displayName = 'Checkbox'

export default Checkbox

// Checkbox group component
interface CheckboxGroupProps {
  options: Array<{
    id: string
    label: string
    value: any
    disabled?: boolean
  }>
  value: any[]
  onChange: (value: any[]) => void
  label?: string
  error?: string
  helperText?: string
  className?: string
}

export function CheckboxGroup({
  options,
  value,
  onChange,
  label,
  error,
  helperText,
  className = ''
}: CheckboxGroupProps) {
  const handleChange = (optionValue: any, checked: boolean) => {
    if (checked) {
      onChange([...value, optionValue])
    } else {
      onChange(value.filter(v => v !== optionValue))
    }
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-secondary-700 mb-3">
          {label}
        </label>
      )}
      
      <div className="space-y-3">
        {options.map((option) => (
          <Checkbox
            key={option.id}
            checked={value.includes(option.value)}
            onChange={(e) => handleChange(option.value, e.target.checked)}
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

'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface DropdownOption {
  id: string
  label: string
  value: any
  icon?: React.ReactNode
  disabled?: boolean
  onClick?: () => void
}

interface DropdownProps {
  options: DropdownOption[]
  value?: any
  onChange?: (value: any) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  searchable?: boolean
  multiSelect?: boolean
}

export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className = '',
  disabled = false,
  searchable = false,
  multiSelect = false
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = searchable
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options

  const selectedOption = options.find(option => option.value === value)
  const selectedOptions = multiSelect
    ? options.filter(option => Array.isArray(value) && value.includes(option.value))
    : []

  const handleOptionClick = (option: DropdownOption) => {
    if (option.disabled) return

    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : []
      const newValues = currentValues.includes(option.value)
        ? currentValues.filter(v => v !== option.value)
        : [...currentValues, option.value]
      onChange?.(newValues)
    } else {
      onChange?.(option.value)
      setIsOpen(false)
    }

    option.onClick?.()
  }

  const getDisplayText = () => {
    if (multiSelect) {
      if (selectedOptions.length === 0) return placeholder
      if (selectedOptions.length === 1) return selectedOptions[0].label
      return `${selectedOptions.length} selected`
    }
    return selectedOption?.label || placeholder
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-4 py-2 border border-secondary-300 rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-secondary-400'
        }`}
      >
        <span className={`${!selectedOption && !selectedOptions.length ? 'text-secondary-500' : 'text-secondary-900'}`}>
          {getDisplayText()}
        </span>
        <ChevronDownIcon 
          className={`h-5 w-5 text-secondary-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {searchable && (
            <div className="p-2 border-b border-secondary-200">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-2 text-secondary-500 text-sm">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = multiSelect
                  ? Array.isArray(value) && value.includes(option.value)
                  : value === option.value

                return (
                  <button
                    key={option.id}
                    onClick={() => handleOptionClick(option)}
                    disabled={option.disabled}
                    className={`w-full flex items-center px-4 py-2 text-left hover:bg-secondary-50 transition-colors ${
                      option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${isSelected ? 'bg-primary-50 text-primary-700' : 'text-secondary-900'}`}
                  >
                    {option.icon && (
                      <span className="mr-3">{option.icon}</span>
                    )}
                    <span className="flex-1">{option.label}</span>
                    {isSelected && (
                      <span className="text-primary-600">✓</span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for dropdown state management
export function useDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValue] = useState<any>(null)

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)
  const toggle = () => setIsOpen(prev => !prev)

  return {
    isOpen,
    value,
    setValue,
    open,
    close,
    toggle
  }
}

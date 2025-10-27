'use client'

import { useState } from 'react'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
  icon?: React.ReactNode
}

export default function Alert({
  type,
  title,
  message,
  dismissible = false,
  onDismiss,
  className = '',
  icon
}: AlertProps) {
  const [isVisible, setIsVisible] = useState(true)

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  if (!isVisible) return null

  const getTypeClasses = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const getIcon = () => {
    if (icon) return icon

    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5" />
      case 'error':
        return <XCircleIcon className="h-5 w-5" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5" />
      case 'info':
        return <InformationCircleIcon className="h-5 w-5" />
      default:
        return <InformationCircleIcon className="h-5 w-5" />
    }
  }

  return (
    <div className={`rounded-lg border p-4 ${getTypeClasses()} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">
              {title}
            </h3>
          )}
          <p className="text-sm">
            {message}
          </p>
        </div>
        {dismissible && (
          <div className="ml-auto pl-3">
            <button
              onClick={handleDismiss}
              className="inline-flex rounded-md p-1.5 hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-current focus:ring-current"
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Specialized alert components
export function SuccessAlert({ message, title, ...props }: Omit<AlertProps, 'type'>) {
  return <Alert type="success" message={message} title={title} {...props} />
}

export function ErrorAlert({ message, title, ...props }: Omit<AlertProps, 'type'>) {
  return <Alert type="error" message={message} title={title} {...props} />
}

export function WarningAlert({ message, title, ...props }: Omit<AlertProps, 'type'>) {
  return <Alert type="warning" message={message} title={title} {...props} />
}

export function InfoAlert({ message, title, ...props }: Omit<AlertProps, 'type'>) {
  return <Alert type="info" message={message} title={title} {...props} />
}

'use client'

import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
}

interface ToastProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastComponent({ toast, onRemove }: ToastProps) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-red-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
      case 'info':
        return <InformationCircleIcon className="h-6 w-6 text-accent" />
      default:
        return <InformationCircleIcon className="h-6 w-6 text-accent" />
    }
  }

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-green-500/40'
      case 'error':
        return 'border-red-500/40'
      case 'warning':
        return 'border-yellow-500/40'
      case 'info':
        return 'border-accent/40'
      default:
        return 'border-accent/40'
    }
  }

  return (
    <div
      className={`max-w-sm w-full bg-surface-2 shadow-lg rounded-lg pointer-events-auto border border-border-ui border-l-4 ${getBackgroundColor()} transform transition-all duration-300 ease-in-out`}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-ink">
              {toast.title}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {toast.message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => onRemove(toast.id)}
              className="bg-surface-2 rounded-md inline-flex text-ink-muted/60 hover:text-ink focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (!toasts || toasts.length === 0) return null

  return (
    <div
      aria-live="assertive"
      className="fixed top-0 right-0 flex flex-col items-end px-4 py-6 pointer-events-none sm:p-6 z-50 max-w-sm w-full"
    >
      <div className="w-full flex flex-col items-center space-y-4 sm:items-end pointer-events-none">
        {toasts.map((toast) => (
          <ToastComponent
            key={toast.id}
            toast={toast}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  )
}

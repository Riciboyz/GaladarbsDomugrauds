'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

// Types
export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
  duration?: number
}

// Context
interface ToastContextType {
  toasts: Toast[]
  success: (title: string, message: string, duration?: number) => void
  error: (title: string, message: string, duration?: number) => void
  info: (title: string, message: string, duration?: number) => void
  warning: (title: string, message: string, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }
    
    setToasts(prev => [...prev, newToast])
    
    // Auto remove toast after duration
    const duration = toast.duration || 5000
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const success = (title: string, message: string, duration?: number) => {
    addToast({ type: 'success', title, message, duration })
  }

  const error = (title: string, message: string, duration?: number) => {
    addToast({ type: 'error', title, message, duration })
  }

  const info = (title: string, message: string, duration?: number) => {
    addToast({ type: 'info', title, message, duration })
  }

  const warning = (title: string, message: string, duration?: number) => {
    addToast({ type: 'warning', title, message, duration })
  }

  const value: ToastContextType = {
    toasts,
    success,
    error,
    info,
    warning,
    removeToast,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}

'use client'

import React from 'react'
import { 
  ArrowPathIcon,
  ChatBubbleLeftIcon,
  UserIcon,
  CalendarIcon,
  BellIcon
} from '@heroicons/react/24/outline'

interface LoadingStateProps {
  type?: 'page' | 'card' | 'button' | 'inline' | 'skeleton'
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function LoadingState({ 
  type = 'page', 
  message = 'Loading...', 
  size = 'md',
  className = '' 
}: LoadingStateProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4'
      case 'lg':
        return 'w-8 h-8'
      default:
        return 'w-6 h-6'
    }
  }

  const getMessageSize = () => {
    switch (size) {
      case 'sm':
        return 'text-sm'
      case 'lg':
        return 'text-lg'
      default:
        return 'text-base'
    }
  }

  const Spinner = () => (
    <ArrowPathIcon className={`${getSizeClasses()} animate-spin text-gray-400`} />
  )

  if (type === 'button') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Spinner />
      </div>
    )
  }

  if (type === 'inline') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Spinner />
        <span className={`text-gray-600 ${getMessageSize()}`}>{message}</span>
      </div>
    )
  }

  if (type === 'skeleton') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'card') {
    return (
      <div className={`card p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <Spinner />
            <p className={`mt-3 text-gray-600 ${getMessageSize()}`}>{message}</p>
          </div>
        </div>
      </div>
    )
  }

  // Default page loading
  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 ${className}`}>
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Spinner />
        </div>
        <h2 className="heading-3 text-gray-900 mb-2">{message}</h2>
        <p className="body-regular text-gray-600">Please wait while we load your content...</p>
      </div>
    </div>
  )
}

// Specialized loading components
export function ThreadLoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card p-6">
          <div className="animate-pulse">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function UserLoadingSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3 p-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="space-y-1 flex-1">
            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function NotificationLoadingSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-start space-x-3 p-4 border-b border-gray-100">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

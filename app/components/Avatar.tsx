'use client'

import { useState } from 'react'

interface AvatarProps {
  src?: string
  alt?: string
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  shape?: 'circle' | 'square'
  status?: 'online' | 'offline' | 'away' | 'busy'
  className?: string
  onClick?: () => void
}

export default function Avatar({
  src,
  alt = '',
  name = '',
  size = 'md',
  shape = 'circle',
  status,
  className = '',
  onClick
}: AvatarProps) {
  const [imageError, setImageError] = useState(false)

  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'h-6 w-6 text-xs'
      case 'sm':
        return 'h-8 w-8 text-sm'
      case 'lg':
        return 'h-12 w-12 text-lg'
      case 'xl':
        return 'h-16 w-16 text-xl'
      case '2xl':
        return 'h-20 w-20 text-2xl'
      default:
        return 'h-10 w-10 text-base'
    }
  }

  const getShapeClasses = () => {
    return shape === 'circle' ? 'rounded-full' : 'rounded-lg'
  }

  const getStatusClasses = () => {
    if (!status) return ''
    
    const baseClasses = 'absolute bottom-0 right-0 border-2 border-white'
    const sizeClasses = size === 'xs' || size === 'sm' ? 'h-2 w-2' : 'h-3 w-3'
    const shapeClasses = shape === 'circle' ? 'rounded-full' : 'rounded'
    
    switch (status) {
      case 'online':
        return `${baseClasses} ${sizeClasses} ${shapeClasses} bg-green-500`
      case 'offline':
        return `${baseClasses} ${sizeClasses} ${shapeClasses} bg-gray-400`
      case 'away':
        return `${baseClasses} ${sizeClasses} ${shapeClasses} bg-yellow-500`
      case 'busy':
        return `${baseClasses} ${sizeClasses} ${shapeClasses} bg-red-500`
      default:
        return ''
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getBackgroundColor = (name: string) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-gray-500'
    ]
    
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  const sizeClasses = getSizeClasses()
  const shapeClasses = getShapeClasses()
  const statusClasses = getStatusClasses()
  const interactiveClasses = onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''

  return (
    <div className={`relative inline-block ${interactiveClasses} ${className}`} onClick={onClick}>
      {src && !imageError ? (
        <img
          src={src}
          alt={alt}
          className={`${sizeClasses} ${shapeClasses} object-cover`}
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          className={`${sizeClasses} ${shapeClasses} ${getBackgroundColor(name)} flex items-center justify-center text-white font-medium`}
        >
          {name ? getInitials(name) : '?'}
        </div>
      )}
      
      {status && (
        <div className={statusClasses} />
      )}
    </div>
  )
}

// Avatar group component
interface AvatarGroupProps {
  avatars: Array<{
    src?: string
    name?: string
    alt?: string
  }>
  max?: number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

export function AvatarGroup({ avatars, max = 3, size = 'md', className = '' }: AvatarGroupProps) {
  const visibleAvatars = avatars.slice(0, max)
  const remainingCount = avatars.length - max

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          src={avatar.src}
          name={avatar.name}
          alt={avatar.alt}
          size={size}
          className="border-2 border-white"
        />
      ))}
      
      {remainingCount > 0 && (
        <div className={`${size === 'xs' ? 'h-6 w-6' : size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : size === 'xl' ? 'h-16 w-16' : size === '2xl' ? 'h-20 w-20' : 'h-10 w-10'} rounded-full bg-secondary-200 border-2 border-white flex items-center justify-center text-secondary-600 font-medium text-xs`}>
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

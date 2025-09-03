'use client'

import { useState, useRef, useEffect } from 'react'

interface LazyLoadProps {
  children: React.ReactNode
  placeholder?: React.ReactNode
  threshold?: number
  rootMargin?: string
  className?: string
  onLoad?: () => void
}

export default function LazyLoad({
  children,
  placeholder,
  threshold = 0.1,
  rootMargin = '50px',
  className = '',
  onLoad
}: LazyLoadProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isIntersecting, setIsIntersecting] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          setIsLoaded(true)
          onLoad?.()
          observer.disconnect()
        }
      },
      {
        threshold,
        rootMargin
      }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [threshold, rootMargin, onLoad])

  return (
    <div ref={elementRef} className={className}>
      {isLoaded ? children : placeholder}
    </div>
  )
}

// Hook for lazy loading state management
export function useLazyLoad(threshold: number = 0.1, rootMargin: string = '50px') {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isIntersecting, setIsIntersecting] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          setIsLoaded(true)
          observer.disconnect()
        }
      },
      {
        threshold,
        rootMargin
      }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [threshold, rootMargin])

  return {
    isLoaded,
    isIntersecting,
    elementRef
  }
}

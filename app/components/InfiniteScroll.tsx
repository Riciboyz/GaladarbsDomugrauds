'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface InfiniteScrollProps {
  children: React.ReactNode
  hasMore: boolean
  loadMore: () => void
  threshold?: number
  className?: string
  loadingComponent?: React.ReactNode
  endMessage?: React.ReactNode
}

export default function InfiniteScroll({
  children,
  hasMore,
  loadMore,
  threshold = 100,
  className = '',
  loadingComponent,
  endMessage
}: InfiniteScrollProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isIntersecting, setIsIntersecting] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      setIsIntersecting(entry.isIntersecting)

      if (entry.isIntersecting && hasMore && !isLoading) {
        setIsLoading(true)
        loadMore()
      }
    },
    [hasMore, isLoading, loadMore]
  )

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold: 0.1,
      rootMargin: `${threshold}px`
    })

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [handleIntersection, threshold])

  useEffect(() => {
    if (isLoading) {
      // Simulate loading delay
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [isLoading])

  return (
    <div className={className}>
      {children}
      
      {/* Sentinel element for intersection observer */}
      <div ref={sentinelRef} className="h-1" />
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-4">
          {loadingComponent || (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              <span className="text-secondary-600">Loading more...</span>
            </div>
          )}
        </div>
      )}
      
      {/* End message */}
      {!hasMore && !isLoading && endMessage && (
        <div className="flex justify-center py-4">
          {endMessage}
        </div>
      )}
    </div>
  )
}

// Hook for infinite scroll state management
export function useInfiniteScroll<T>(
  initialData: T[] = [],
  loadMoreData: (page: number) => Promise<T[]>
) {
  const [data, setData] = useState<T[]>(initialData)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    try {
      const newData = await loadMoreData(page)
      if (newData.length === 0) {
        setHasMore(false)
      } else {
        setData(prev => [...prev, ...newData])
        setPage(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error loading more data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [page, isLoading, hasMore, loadMoreData])

  const reset = useCallback(() => {
    setData(initialData)
    setPage(1)
    setHasMore(true)
    setIsLoading(false)
  }, [initialData])

  return {
    data,
    hasMore,
    isLoading,
    loadMore,
    reset
  }
}

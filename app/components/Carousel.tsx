'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface CarouselProps {
  items: React.ReactNode[]
  autoPlay?: boolean
  autoPlayInterval?: number
  showDots?: boolean
  showArrows?: boolean
  className?: string
  itemClassName?: string
  infinite?: boolean
}

export default function Carousel({
  items,
  autoPlay = false,
  autoPlayInterval = 3000,
  showDots = true,
  showArrows = true,
  className = '',
  itemClassName = '',
  infinite = true
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const goToSlide = (index: number) => {
    if (isTransitioning) return
    
    setIsTransitioning(true)
    setCurrentIndex(index)
    
    setTimeout(() => {
      setIsTransitioning(false)
    }, 300)
  }

  const goToPrevious = () => {
    if (isTransitioning) return
    
    const newIndex = infinite
      ? (currentIndex - 1 + items.length) % items.length
      : Math.max(0, currentIndex - 1)
    
    goToSlide(newIndex)
  }

  const goToNext = () => {
    if (isTransitioning) return
    
    const newIndex = infinite
      ? (currentIndex + 1) % items.length
      : Math.min(items.length - 1, currentIndex + 1)
    
    goToSlide(newIndex)
  }

  useEffect(() => {
    if (autoPlay) {
      intervalRef.current = setInterval(() => {
        goToNext()
      }, autoPlayInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoPlay, autoPlayInterval, currentIndex])

  if (items.length === 0) return null

  return (
    <div className={`relative ${className}`}>
      {/* Carousel Container */}
      <div className="relative overflow-hidden rounded-lg">
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {items.map((item, index) => (
            <div
              key={index}
              className={`w-full flex-shrink-0 ${itemClassName}`}
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {showArrows && items.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            disabled={!infinite && currentIndex === 0}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-secondary-600 hover:text-secondary-900 rounded-full p-2 shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          
          <button
            onClick={goToNext}
            disabled={!infinite && currentIndex === items.length - 1}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-secondary-600 hover:text-secondary-900 rounded-full p-2 shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {showDots && items.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex
                  ? 'bg-primary-600'
                  : 'bg-secondary-300 hover:bg-secondary-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Hook for carousel state management
export function useCarousel(totalItems: number, infinite: boolean = true) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const goToSlide = (index: number) => {
    if (index >= 0 && index < totalItems) {
      setCurrentIndex(index)
    }
  }

  const goToPrevious = () => {
    const newIndex = infinite
      ? (currentIndex - 1 + totalItems) % totalItems
      : Math.max(0, currentIndex - 1)
    
    setCurrentIndex(newIndex)
  }

  const goToNext = () => {
    const newIndex = infinite
      ? (currentIndex + 1) % totalItems
      : Math.min(totalItems - 1, currentIndex + 1)
    
    setCurrentIndex(newIndex)
  }

  return {
    currentIndex,
    goToSlide,
    goToPrevious,
    goToNext
  }
}

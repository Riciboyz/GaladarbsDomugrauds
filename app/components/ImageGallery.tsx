'use client'

import { useState } from 'react'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  XMarkIcon,
  ArrowDownTrayIcon as DownloadIcon,
  ShareIcon
} from '@heroicons/react/24/outline'

interface Image {
  id: string
  src: string
  alt: string
  title?: string
  description?: string
  thumbnail?: string
}

interface ImageGalleryProps {
  images: Image[]
  className?: string
  showThumbnails?: boolean
  showControls?: boolean
  autoPlay?: boolean
  autoPlayInterval?: number
  onImageClick?: (image: Image, index: number) => void
}

export default function ImageGallery({
  images,
  className = '',
  showThumbnails = true,
  showControls = true,
  autoPlay = false,
  autoPlayInterval = 3000,
  onImageClick
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const currentImage = images[currentIndex]

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length)
  }

  const goToNext = () => {
    setCurrentIndex(prev => (prev + 1) % images.length)
  }

  const goToImage = (index: number) => {
    setCurrentIndex(index)
  }

  const openFullscreen = () => {
    setIsFullscreen(true)
  }

  const closeFullscreen = () => {
    setIsFullscreen(false)
  }

  const downloadImage = () => {
    if (currentImage) {
      const link = document.createElement('a')
      link.href = currentImage.src
      link.download = currentImage.alt || 'image'
      link.click()
    }
  }

  const shareImage = async () => {
    if (navigator.share && currentImage) {
      try {
        await navigator.share({
          title: currentImage.title || currentImage.alt,
          text: currentImage.description,
          url: currentImage.src
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    }
  }

  if (images.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-secondary-100 rounded-lg ${className}`}>
        <p className="text-secondary-500">No images to display</p>
      </div>
    )
  }

  return (
    <>
      {/* Main Gallery */}
      <div className={`relative ${className}`}>
        {/* Main Image */}
        <div className="relative bg-black rounded-lg overflow-hidden">
          <img
            src={currentImage?.src}
            alt={currentImage?.alt}
            className="w-full h-64 object-cover cursor-pointer"
            onClick={() => {
              onImageClick?.(currentImage, currentIndex)
              openFullscreen()
            }}
          />
          
          {/* Image Info */}
          {(currentImage?.title || currentImage?.description) && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              {currentImage.title && (
                <h3 className="text-white font-semibold mb-1">{currentImage.title}</h3>
              )}
              {currentImage.description && (
                <p className="text-white/80 text-sm">{currentImage.description}</p>
              )}
            </div>
          )}

          {/* Controls */}
          {showControls && images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {showThumbnails && images.length > 1 && (
          <div className="flex space-x-2 mt-4 overflow-x-auto">
            {images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => goToImage(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  index === currentIndex
                    ? 'border-primary-500'
                    : 'border-secondary-200 hover:border-secondary-300'
                }`}
              >
                <img
                  src={image.thumbnail || image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
          <div className="relative max-w-7xl max-h-full p-4">
            {/* Close Button */}
            <button
              onClick={closeFullscreen}
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>

            {/* Fullscreen Image */}
            <img
              src={currentImage?.src}
              alt={currentImage?.alt}
              className="max-w-full max-h-full object-contain"
            />

            {/* Fullscreen Controls */}
            {images.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors"
                >
                  <ChevronLeftIcon className="h-6 w-6" />
                </button>
                
                <button
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors"
                >
                  <ChevronRightIcon className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Action Buttons */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              <button
                onClick={downloadImage}
                className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              >
                <DownloadIcon className="h-5 w-5" />
              </button>
              
              <button
                onClick={shareImage}
                className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              >
                <ShareIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Image Info */}
            {(currentImage?.title || currentImage?.description) && (
              <div className="absolute bottom-4 left-4 right-4 bg-black/50 text-white p-4 rounded-lg">
                {currentImage.title && (
                  <h3 className="text-lg font-semibold mb-2">{currentImage.title}</h3>
                )}
                {currentImage.description && (
                  <p className="text-white/80">{currentImage.description}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

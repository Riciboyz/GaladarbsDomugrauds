'use client'

import { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  showPrevNext?: boolean
  maxVisiblePages?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  showPrevNext = true,
  maxVisiblePages = 5,
  className = '',
  size = 'md'
}: PaginationProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-sm'
      case 'lg':
        return 'px-4 py-2 text-lg'
      default:
        return 'px-3 py-2 text-base'
    }
  }

  const getVisiblePages = () => {
    const pages: (number | string)[] = []
    const halfVisible = Math.floor(maxVisiblePages / 2)
    
    let startPage = Math.max(1, currentPage - halfVisible)
    let endPage = Math.min(totalPages, currentPage + halfVisible)
    
    // Adjust if we're near the beginning or end
    if (endPage - startPage + 1 < maxVisiblePages) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
      } else {
        startPage = Math.max(1, endPage - maxVisiblePages + 1)
      }
    }
    
    // Add first page and ellipsis if needed
    if (startPage > 1) {
      pages.push(1)
      if (startPage > 2) {
        pages.push('...')
      }
    }
    
    // Add visible pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    
    // Add ellipsis and last page if needed
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push('...')
      }
      pages.push(totalPages)
    }
    
    return pages
  }

  const visiblePages = getVisiblePages()

  if (totalPages <= 1) return null

  return (
    <nav className={`flex items-center justify-center space-x-1 ${className}`}>
      {/* First page */}
      {showFirstLast && currentPage > 1 && (
        <button
          onClick={() => onPageChange(1)}
          className={`${getSizeClasses()} rounded-lg border border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-primary-500`}
        >
          First
        </button>
      )}

      {/* Previous page */}
      {showPrevNext && currentPage > 1 && (
        <button
          onClick={() => onPageChange(currentPage - 1)}
          className={`${getSizeClasses()} rounded-lg border border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-primary-500`}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
      )}

      {/* Page numbers */}
      {visiblePages.map((page, index) => {
        if (page === '...') {
          return (
            <span
              key={`ellipsis-${index}`}
              className={`${getSizeClasses()} text-secondary-500`}
            >
              ...
            </span>
          )
        }

        const pageNumber = page as number
        const isCurrentPage = pageNumber === currentPage

        return (
          <button
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            className={`${getSizeClasses()} rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              isCurrentPage
                ? 'border-primary-500 bg-primary-600 text-white'
                : 'border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50'
            }`}
          >
            {pageNumber}
          </button>
        )
      })}

      {/* Next page */}
      {showPrevNext && currentPage < totalPages && (
        <button
          onClick={() => onPageChange(currentPage + 1)}
          className={`${getSizeClasses()} rounded-lg border border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-primary-500`}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      )}

      {/* Last page */}
      {showFirstLast && currentPage < totalPages && (
        <button
          onClick={() => onPageChange(totalPages)}
          className={`${getSizeClasses()} rounded-lg border border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-primary-500`}
        >
          Last
        </button>
      )}
    </nav>
  )
}

// Hook for pagination state management
export function usePagination(totalItems: number, itemsPerPage: number = 10) {
  const [currentPage, setCurrentPage] = useState(1)
  
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }
  
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }
  
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }
  
  const goToFirstPage = () => {
    setCurrentPage(1)
  }
  
  const goToLastPage = () => {
    setCurrentPage(totalPages)
  }
  
  return {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage
  }
}

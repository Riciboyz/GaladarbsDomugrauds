'use client'

export default function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="bg-white rounded-xl border border-secondary-200 p-4 animate-fade-in">
          {/* Header skeleton */}
          <div className="flex items-center space-x-3 mb-3">
            <div className="loading-skeleton h-10 w-10 rounded-full"></div>
            <div className="flex-1">
              <div className="loading-skeleton h-4 w-32 mb-2"></div>
              <div className="loading-skeleton h-3 w-24"></div>
            </div>
          </div>
          
          {/* Content skeleton */}
          <div className="space-y-2 mb-4">
            <div className="loading-skeleton h-4 w-full"></div>
            <div className="loading-skeleton h-4 w-3/4"></div>
            <div className="loading-skeleton h-4 w-1/2"></div>
          </div>
          
          {/* Actions skeleton */}
          <div className="flex items-center space-x-6 pt-3 border-t border-secondary-100">
            <div className="loading-skeleton h-6 w-16"></div>
            <div className="loading-skeleton h-6 w-16"></div>
            <div className="loading-skeleton h-6 w-16"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Profile Header Skeleton */}
      <div className="bg-white rounded-xl border border-secondary-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="loading-skeleton h-24 w-24 rounded-full"></div>
            <div className="space-y-2">
              <div className="loading-skeleton h-6 w-48"></div>
              <div className="loading-skeleton h-4 w-32"></div>
              <div className="loading-skeleton h-4 w-64"></div>
            </div>
          </div>
          <div className="loading-skeleton h-10 w-24"></div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-secondary-100">
          <div className="text-center">
            <div className="loading-skeleton h-8 w-12 mx-auto mb-2"></div>
            <div className="loading-skeleton h-4 w-16 mx-auto"></div>
          </div>
          <div className="text-center">
            <div className="loading-skeleton h-8 w-12 mx-auto mb-2"></div>
            <div className="loading-skeleton h-4 w-20 mx-auto"></div>
          </div>
          <div className="text-center">
            <div className="loading-skeleton h-8 w-12 mx-auto mb-2"></div>
            <div className="loading-skeleton h-4 w-20 mx-auto"></div>
          </div>
        </div>
      </div>

      {/* Threads skeleton */}
      <LoadingSkeleton />
    </div>
  )
}

export function GroupSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="bg-white rounded-xl border border-secondary-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="loading-skeleton h-12 w-12 rounded-full"></div>
              <div>
                <div className="loading-skeleton h-4 w-24 mb-2"></div>
                <div className="loading-skeleton h-3 w-16"></div>
              </div>
            </div>
            <div className="loading-skeleton h-5 w-5"></div>
          </div>

          <div className="loading-skeleton h-4 w-full mb-2"></div>
          <div className="loading-skeleton h-4 w-3/4 mb-4"></div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="loading-skeleton h-4 w-16"></div>
              <div className="loading-skeleton h-4 w-20"></div>
            </div>
            <div className="loading-skeleton h-6 w-16"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

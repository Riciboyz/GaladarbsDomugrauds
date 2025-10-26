'use client'

import { useState, useEffect } from 'react'

interface ProgressBarProps {
  progress: number
  className?: string
}

export default function ProgressBar({ progress, className = '' }: ProgressBarProps) {
  return (
    <div className={`w-full bg-secondary-200 rounded-full h-2 ${className}`}>
      <div
        className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  )
}

export function LoadingProgressBar() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 10
      })
    }, 200)

    return () => clearInterval(interval)
  }, [])

  return <ProgressBar progress={progress} />
}

export function UploadProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-secondary-600 mb-1">
        <span>Uploading...</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <ProgressBar progress={progress} />
    </div>
  )
}

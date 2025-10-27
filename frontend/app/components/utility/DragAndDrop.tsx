'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface DragAndDropProps {
  onDrop: (files: File[]) => void
  accept?: string
  multiple?: boolean
  maxSize?: number // in MB
  maxFiles?: number
  className?: string
  disabled?: boolean
  children?: React.ReactNode
}

interface DroppedFile {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

export default function DragAndDrop({
  onDrop,
  accept,
  multiple = false,
  maxSize = 10,
  maxFiles = 5,
  className = '',
  disabled = false,
  children
}: DragAndDropProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([])
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`
    }
    return null
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    if (disabled) return
    
    const files = Array.from(e.dataTransfer.files)
    const validFiles: File[] = []
    const errors: string[] = []

    files.forEach(file => {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push(file)
      }
    })

    if (errors.length > 0) {
      alert(errors.join('\n'))
    }

    if (validFiles.length > 0) {
      onDrop(validFiles)
      
      // Add files to state for progress tracking
      const newFiles: DroppedFile[] = validFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        progress: 0,
        status: 'uploading'
      }))
      setDroppedFiles(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (fileId: string) => {
    setDroppedFiles(prev => prev.filter(file => file.id !== fileId))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (file: File) => {
    const type = file.type
    if (type.startsWith('image/')) {
      return '🖼️'
    } else if (type.startsWith('video/')) {
      return '🎥'
    } else if (type.startsWith('audio/')) {
      return '🎵'
    } else if (type.includes('pdf')) {
      return '📄'
    } else if (type.includes('word')) {
      return '📝'
    } else if (type.includes('excel') || type.includes('spreadsheet')) {
      return '📊'
    } else {
      return '📁'
    }
  }

  return (
    <div className={className}>
      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-primary-500 bg-primary-50'
            : 'border-secondary-300 hover:border-secondary-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {children || (
          <>
            <CloudArrowUpIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              Drop files here
            </h3>
            <p className="text-secondary-600 mb-4">
              Drag and drop files here, or click to select files
            </p>
            <p className="text-sm text-secondary-500">
              Max file size: {maxSize}MB • Max files: {maxFiles}
            </p>
          </>
        )}
      </div>

      {/* Dropped Files */}
      {droppedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-secondary-900">Dropped Files</h4>
          {droppedFiles.map((droppedFile) => (
            <div
              key={droppedFile.id}
              className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getFileIcon(droppedFile.file)}</span>
                <div>
                  <p className="text-sm font-medium text-secondary-900">
                    {droppedFile.file.name}
                  </p>
                  <p className="text-xs text-secondary-500">
                    {formatFileSize(droppedFile.file.size)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {droppedFile.status === 'uploading' && (
                  <div className="w-16 bg-secondary-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${droppedFile.progress}%` }}
                    />
                  </div>
                )}
                
                {droppedFile.status === 'completed' && (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                )}
                
                {droppedFile.status === 'error' && (
                  <span className="text-red-500 text-sm">{droppedFile.error}</span>
                )}
                
                <button
                  onClick={() => removeFile(droppedFile.id)}
                  className="p-1 hover:bg-secondary-200 rounded transition-colors"
                >
                  <XMarkIcon className="h-4 w-4 text-secondary-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Hook for drag and drop state management
export function useDragAndDrop() {
  const [isDragOver, setIsDragOver] = useState(false)
  const [droppedFiles, setDroppedFiles] = useState<File[]>([])

  const handleDrop = (files: File[]) => {
    setDroppedFiles(prev => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setDroppedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const clearFiles = () => {
    setDroppedFiles([])
  }

  return {
    isDragOver,
    droppedFiles,
    handleDrop,
    removeFile,
    clearFiles
  }
}

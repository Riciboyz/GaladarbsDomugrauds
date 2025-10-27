'use client'

import { useState, useRef } from 'react'
import { 
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface FileUploadProps {
  onFileSelect?: (files: File[]) => void
  onFileUpload?: (files: File[]) => Promise<void>
  accept?: string
  multiple?: boolean
  maxSize?: number // in MB
  maxFiles?: number
  className?: string
  disabled?: boolean
}

interface UploadedFile {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

export default function FileUpload({
  onFileSelect,
  onFileUpload,
  accept,
  multiple = false,
  maxSize = 10,
  maxFiles = 5,
  className = '',
  disabled = false
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`
    }
    return null
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    const validFiles: File[] = []
    const errors: string[] = []

    fileArray.forEach(file => {
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
      onFileSelect?.(validFiles)
      
      if (onFileUpload) {
        uploadFiles(validFiles)
      } else {
        // Just add files without uploading
        const newFiles: UploadedFile[] = validFiles.map(file => ({
          id: Math.random().toString(36).substr(2, 9),
          file,
          progress: 100,
          status: 'completed'
        }))
        setUploadedFiles(prev => [...prev, ...newFiles])
      }
    }
  }

  const uploadFiles = async (files: File[]) => {
    const newFiles: UploadedFile[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'uploading'
    }))

    setUploadedFiles(prev => [...prev, ...newFiles])

    try {
      await onFileUpload?.(files)
      
      // Update status to completed
      setUploadedFiles(prev => prev.map(file => 
        newFiles.some(nf => nf.id === file.id) 
          ? { ...file, progress: 100, status: 'completed' }
          : file
      ))
    } catch (error) {
      // Update status to error
      setUploadedFiles(prev => prev.map(file => 
        newFiles.some(nf => nf.id === file.id) 
          ? { ...file, status: 'error', error: 'Upload failed' }
          : file
      ))
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (disabled) return
    
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId))
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
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-primary-500 bg-primary-50'
            : 'border-secondary-300 hover:border-secondary-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <CloudArrowUpIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 mb-2">
          Upload Files
        </h3>
        <p className="text-secondary-600 mb-4">
          Drag and drop files here, or click to select files
        </p>
        <p className="text-sm text-secondary-500">
          Max file size: {maxSize}MB • Max files: {maxFiles}
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-secondary-900">Uploaded Files</h4>
          {uploadedFiles.map((uploadedFile) => (
            <div
              key={uploadedFile.id}
              className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getFileIcon(uploadedFile.file)}</span>
                <div>
                  <p className="text-sm font-medium text-secondary-900">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-secondary-500">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {uploadedFile.status === 'uploading' && (
                  <div className="w-16 bg-secondary-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadedFile.progress}%` }}
                    />
                  </div>
                )}
                
                {uploadedFile.status === 'completed' && (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                )}
                
                {uploadedFile.status === 'error' && (
                  <span className="text-red-500 text-sm">{uploadedFile.error}</span>
                )}
                
                <button
                  onClick={() => removeFile(uploadedFile.id)}
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

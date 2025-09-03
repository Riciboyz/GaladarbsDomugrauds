'use client'

import { useState, useEffect, useRef } from 'react'

interface HashtagInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
}

export default function HashtagInput({ value, onChange, placeholder = "What's on your mind?", maxLength = 500 }: HashtagInputProps) {
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setCursorPosition(e.target.selectionStart)
    onChange(newValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '#' && cursorPosition > 0 && value[cursorPosition - 1] === ' ') {
      // Auto-suggest hashtags
      setTimeout(() => {
        if (textareaRef.current) {
          const start = textareaRef.current.selectionStart
          const end = textareaRef.current.selectionEnd
          const beforeCursor = value.substring(0, start)
          const afterCursor = value.substring(end)
          const newValue = beforeCursor + '#' + afterCursor
          onChange(newValue)
          
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.setSelectionRange(start + 1, start + 1)
            }
          }, 0)
        }
      }, 0)
    }
  }

  const renderTextWithHashtags = (text: string) => {
    const parts = text.split(/(#\w+)/g)
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <span key={index} className="text-primary-600 font-medium">
            {part}
          </span>
        )
      }
      return part
    })
  }

  const getHashtags = (text: string) => {
    const hashtagRegex = /#\w+/g
    return text.match(hashtagRegex) || []
  }

  const hashtags = getHashtags(value)

  return (
    <div className="relative">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="w-full p-4 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none bg-transparent text-secondary-900 placeholder-secondary-500"
          rows={6}
        />
        
        {/* Hashtag overlay for display */}
        <div className="absolute inset-0 p-4 pointer-events-none whitespace-pre-wrap break-words text-secondary-900">
          {renderTextWithHashtags(value)}
        </div>
      </div>

      {/* Hashtag suggestions */}
      {hashtags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {hashtags.map((hashtag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-700 text-sm rounded-full"
            >
              {hashtag}
            </span>
          ))}
        </div>
      )}

      {/* Character count */}
      <div className="flex justify-between items-center mt-2">
        <div className="text-sm text-secondary-500">
          {value.length}/{maxLength} characters
        </div>
        {hashtags.length > 0 && (
          <div className="text-sm text-primary-600">
            {hashtags.length} hashtag{hashtags.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}

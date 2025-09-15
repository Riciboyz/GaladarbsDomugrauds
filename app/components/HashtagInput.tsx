'use client'

import { useState, useEffect, useRef } from 'react'

interface HashtagInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
}

export default function HashtagInput({ value = '', onChange, placeholder = "What's on your mind?", maxLength = 500 }: HashtagInputProps) {
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
    if (!text || typeof text !== 'string') return ''
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
    if (!text || typeof text !== 'string') return []
    const hashtagRegex = /#\w+/g
    return text.match(hashtagRegex) || []
  }

  const hashtags = getHashtags(value)

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full p-4 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white text-gray-900 placeholder-gray-500 text-base leading-relaxed"
        rows={6}
      />

      {/* Hashtag suggestions */}
      {hashtags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {hashtags.map((hashtag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium"
            >
              {hashtag}
            </span>
          ))}
        </div>
      )}

      {/* Character count */}
      <div className="flex justify-between items-center mt-3">
        <div className="text-sm text-gray-500">
          {value.length}/{maxLength} characters
        </div>
        {hashtags.length > 0 && (
          <div className="text-sm text-blue-600 font-medium">
            {hashtags.length} hashtag{hashtags.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}

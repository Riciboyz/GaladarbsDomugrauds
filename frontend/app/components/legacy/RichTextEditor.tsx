'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListBulletIcon,
  ListBulletIcon as ListNumberedIcon,
  LinkIcon,
  PhotoIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline'

interface RichTextEditorProps {
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  showToolbar?: boolean
  readOnly?: boolean
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing...',
  className = '',
  showToolbar = true,
  readOnly = false
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  const handleInput = () => {
    if (editorRef.current) {
      onChange?.(editorRef.current.innerHTML)
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }

  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      execCommand('createLink', url)
    }
  }

  const insertImage = () => {
    const url = prompt('Enter image URL:')
    if (url) {
      execCommand('insertImage', url)
    }
  }

  const toolbarButtons = [
    {
      label: 'Bold',
      icon: BoldIcon,
      command: 'bold',
      action: () => execCommand('bold')
    },
    {
      label: 'Italic',
      icon: ItalicIcon,
      command: 'italic',
      action: () => execCommand('italic')
    },
    {
      label: 'Underline',
      icon: UnderlineIcon,
      command: 'underline',
      action: () => execCommand('underline')
    },
    {
      label: 'Bullet List',
      icon: ListBulletIcon,
      command: 'insertUnorderedList',
      action: () => execCommand('insertUnorderedList')
    },
    {
      label: 'Numbered List',
      icon: ListNumberedIcon,
      command: 'insertOrderedList',
      action: () => execCommand('insertOrderedList')
    },
    {
      label: 'Link',
      icon: LinkIcon,
      command: 'createLink',
      action: insertLink
    },
    {
      label: 'Image',
      icon: PhotoIcon,
      command: 'insertImage',
      action: insertImage
    },
    {
      label: 'Code',
      icon: CodeBracketIcon,
      command: 'formatCode',
      action: () => execCommand('formatCode')
    }
  ]

  return (
    <div className={`bg-white rounded-lg border border-secondary-200 ${className}`}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center space-x-1 p-3 border-b border-secondary-200">
          {toolbarButtons.map((button, index) => {
            const Icon = button.icon
            return (
              <button
                key={index}
                onClick={button.action}
                disabled={readOnly}
                className="p-2 text-secondary-600 hover:bg-secondary-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={button.label}
              >
                <Icon className="h-4 w-4" />
              </button>
            )
          })}
        </div>
      )}

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`p-4 min-h-64 focus:outline-none ${
          isFocused ? 'ring-2 ring-primary-500 ring-opacity-50' : ''
        } ${readOnly ? 'cursor-default' : 'cursor-text'}`}
        style={{
          minHeight: '200px'
        }}
        dangerouslySetInnerHTML={{ __html: value }}
      />

      {/* Placeholder */}
      {!value && !isFocused && (
        <div className="absolute top-16 left-4 text-secondary-400 pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  )
}

// Hook for rich text editor state management
export function useRichTextEditor(initialValue: string = '') {
  const [value, setValue] = useState(initialValue)
  const [isFocused, setIsFocused] = useState(false)

  const updateValue = (newValue: string) => {
    setValue(newValue)
  }

  const resetValue = () => {
    setValue(initialValue)
  }

  return {
    value,
    isFocused,
    updateValue,
    resetValue
  }
}

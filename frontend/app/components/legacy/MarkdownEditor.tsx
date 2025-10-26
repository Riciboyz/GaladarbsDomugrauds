'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  DocumentTextIcon,
  EyeIcon,
  CodeBracketIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'

interface MarkdownEditorProps {
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  showPreview?: boolean
  showToolbar?: boolean
  readOnly?: boolean
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Start writing your markdown...',
  className = '',
  showPreview = true,
  showToolbar = true,
  readOnly = false
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!readOnly) {
      onChange?.(e.target.value)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy markdown:', error)
    }
  }

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end)
    
    onChange?.(newText)
    
    // Set cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, end + before.length)
    }, 0)
  }

  const renderMarkdown = (text: string) => {
    // Simple markdown rendering (you might want to use a proper markdown library)
    return text
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-3">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mb-2">$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong class="font-bold">$1</strong>')
      .replace(/\*(.*)\*/gim, '<em class="italic">$1</em>')
      .replace(/`(.*)`/gim, '<code class="bg-secondary-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-secondary-100 p-4 rounded-lg overflow-x-auto"><code class="text-sm font-mono">$1</code></pre>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-primary-600 hover:underline">$1</a>')
      .replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/\n/gim, '<br>')
  }

  const toolbarButtons = [
    {
      label: 'Bold',
      icon: 'B',
      action: () => insertMarkdown('**', '**')
    },
    {
      label: 'Italic',
      icon: 'I',
      action: () => insertMarkdown('*', '*')
    },
    {
      label: 'Code',
      icon: 'C',
      action: () => insertMarkdown('`', '`')
    },
    {
      label: 'Link',
      icon: 'L',
      action: () => insertMarkdown('[', '](url)')
    },
    {
      label: 'Heading',
      icon: 'H',
      action: () => insertMarkdown('# ')
    },
    {
      label: 'List',
      icon: '•',
      action: () => insertMarkdown('* ')
    }
  ]

  return (
    <div className={`bg-white rounded-lg border border-secondary-200 ${className}`}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between p-3 border-b border-secondary-200">
          <div className="flex items-center space-x-2">
            {toolbarButtons.map((button, index) => (
              <button
                key={index}
                onClick={button.action}
                disabled={readOnly}
                className="px-3 py-1 text-sm font-medium text-secondary-700 hover:bg-secondary-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={button.label}
              >
                {button.icon}
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            {showPreview && (
              <button
                onClick={() => setIsPreview(!isPreview)}
                className={`flex items-center space-x-1 px-3 py-1 text-sm rounded transition-colors ${
                  isPreview
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-secondary-700 hover:bg-secondary-100'
                }`}
              >
                {isPreview ? (
                  <>
                    <CodeBracketIcon className="h-4 w-4" />
                    <span>Edit</span>
                  </>
                ) : (
                  <>
                    <EyeIcon className="h-4 w-4" />
                    <span>Preview</span>
                  </>
                )}
              </button>
            )}
            
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-secondary-700 hover:bg-secondary-100 rounded transition-colors"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Editor/Preview */}
      <div className="p-4">
        {isPreview ? (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            readOnly={readOnly}
            className="w-full h-64 p-4 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none font-mono text-sm"
            style={{
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              lineHeight: '1.5'
            }}
          />
        )}
      </div>
    </div>
  )
}

// Hook for markdown editor state management
export function useMarkdownEditor(initialValue: string = '') {
  const [value, setValue] = useState(initialValue)
  const [isPreview, setIsPreview] = useState(false)

  const updateValue = (newValue: string) => {
    setValue(newValue)
  }

  const togglePreview = () => {
    setIsPreview(prev => !prev)
  }

  const resetValue = () => {
    setValue(initialValue)
  }

  return {
    value,
    isPreview,
    updateValue,
    togglePreview,
    resetValue
  }
}

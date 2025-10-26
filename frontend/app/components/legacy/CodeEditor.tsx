'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  DocumentDuplicateIcon,
  ClipboardIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

interface CodeEditorProps {
  code: string
  language?: string
  onChange?: (code: string) => void
  readOnly?: boolean
  showLineNumbers?: boolean
  showCopyButton?: boolean
  className?: string
  placeholder?: string
}

export default function CodeEditor({
  code,
  language = 'javascript',
  onChange,
  readOnly = false,
  showLineNumbers = true,
  showCopyButton = true,
  className = '',
  placeholder = 'Enter your code here...'
}: CodeEditorProps) {
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy code:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!readOnly) {
      onChange?.(e.target.value)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const value = textarea.value
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      
      textarea.value = newValue
      textarea.selectionStart = textarea.selectionEnd = start + 2
      
      if (onChange) {
        onChange(newValue)
      }
    }
  }

  const getLanguageClass = () => {
    switch (language) {
      case 'javascript':
      case 'js':
        return 'language-javascript'
      case 'typescript':
      case 'ts':
        return 'language-typescript'
      case 'python':
      case 'py':
        return 'language-python'
      case 'html':
        return 'language-html'
      case 'css':
        return 'language-css'
      case 'json':
        return 'language-json'
      case 'markdown':
      case 'md':
        return 'language-markdown'
      default:
        return 'language-plaintext'
    }
  }

  const getLanguageLabel = () => {
    switch (language) {
      case 'javascript':
      case 'js':
        return 'JavaScript'
      case 'typescript':
      case 'ts':
        return 'TypeScript'
      case 'python':
      case 'py':
        return 'Python'
      case 'html':
        return 'HTML'
      case 'css':
        return 'CSS'
      case 'json':
        return 'JSON'
      case 'markdown':
      case 'md':
        return 'Markdown'
      default:
        return language.toUpperCase()
    }
  }

  return (
    <div className={`relative bg-secondary-900 rounded-lg border border-secondary-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-secondary-700">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <span className="text-sm text-secondary-400 ml-2">
            {getLanguageLabel()}
          </span>
        </div>
        
        {showCopyButton && (
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-secondary-400 hover:text-white hover:bg-secondary-800 rounded transition-colors"
          >
            {copied ? (
              <>
                <CheckIcon className="h-4 w-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <ClipboardIcon className="h-4 w-4" />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Editor */}
      <div className="relative">
        {showLineNumbers && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-secondary-800 border-r border-secondary-700 flex flex-col text-sm text-secondary-500 select-none">
            {code.split('\n').map((_, index) => (
              <div key={index} className="px-2 py-1 leading-6">
                {index + 1}
              </div>
            ))}
          </div>
        )}
        
        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          placeholder={placeholder}
          className={`w-full h-64 p-4 bg-transparent text-white font-mono text-sm resize-none focus:outline-none ${
            showLineNumbers ? 'pl-16' : ''
          } ${readOnly ? 'cursor-default' : 'cursor-text'}`}
          style={{
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            lineHeight: '1.5'
          }}
        />
      </div>
    </div>
  )
}

// Hook for code editor state management
export function useCodeEditor(initialCode: string = '') {
  const [code, setCode] = useState(initialCode)
  const [language, setLanguage] = useState('javascript')

  const updateCode = (newCode: string) => {
    setCode(newCode)
  }

  const updateLanguage = (newLanguage: string) => {
    setLanguage(newLanguage)
  }

  const resetCode = () => {
    setCode(initialCode)
  }

  return {
    code,
    language,
    updateCode,
    updateLanguage,
    resetCode
  }
}

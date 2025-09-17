'use client'

import { useState, useRef } from 'react'
import { useUser } from '../contexts/UserContext'
import { useThread } from '../contexts/ThreadContext'
import { useWebSocket } from '../contexts/WebSocketContext'
import { useToast } from '../contexts/ToastContext'
import Button from './Button'
import Input from './Input'
import EmojiPicker from './EmojiPicker'
import { 
  XMarkIcon, 
  PhotoIcon, 
  PaperAirplaneIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface SimpleCreateThreadProps {
  onClose: () => void
  parentId?: string
  groupId?: string
  topicDayId?: string
  onThreadCreated?: () => void
}

export default function SimpleCreateThread({ 
  onClose, 
  parentId, 
  groupId, 
  topicDayId, 
  onThreadCreated 
}: SimpleCreateThreadProps) {
  const { user } = useUser()
  const { addThread, loadThreadsFromAPI } = useThread()
  const { sendMessage } = useWebSocket()
  const { success, error: showError } = useToast()
  
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attachments, setAttachments] = useState<string[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      showError('Error', 'Please enter some content for your thread')
      return
    }
    
    if (!user) {
      showError('Error', 'Please log in to create a thread')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          parentId,
          groupId,
          topicDayId,
          attachments,
          visibility: 'public'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create thread')
      }

      const data = await response.json()
      console.log('API Response:', data)
      
      if (data.success) {
        // Add thread to local state immediately for real-time feel
        const newThread = {
          id: data.thread.id,
          authorId: data.thread.author_id || data.thread.authorId || user.id,
          content: data.thread.content,
          createdAt: new Date(data.thread.created_at || data.thread.createdAt),
          likes: data.thread.likes || [],
          dislikes: data.thread.dislikes || [],
          comments: data.thread.comments || [],
          replies: data.thread.replies || [],
          parentId: data.thread.parent_id || data.thread.parentId,
          visibility: data.thread.visibility || 'public',
          topicDayId: data.thread.topic_day_id || data.thread.topicDayId,
          groupId: data.thread.group_id || data.thread.groupId,
          attachments: data.thread.attachments || [],
          // Provide embedded author to avoid "Unknown User" while user list is loading
          author: data.thread.author || {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar
          }
        }
        
        console.log('Adding new thread to state:', newThread)
        addThread(newThread)
        
        // Send WebSocket message for real-time updates
        sendMessage({
          type: 'thread_created',
          data: newThread
        })
        
        success('Success', 'Thread posted successfully!')
        
        // Force refresh threads as fallback
        setTimeout(() => {
          console.log('Force refreshing threads...')
          loadThreadsFromAPI()
        }, 1000)
        
        // Reset form
        setContent('')
        setAttachments([])
        
        onThreadCreated?.()
        onClose()
      } else {
        throw new Error(data.error || 'Failed to create thread')
      }
    } catch (error) {
      console.error('Error creating thread:', error)
      showError('Error', `Failed to create thread: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setContent(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newAttachments = Array.from(files).map(file => URL.createObjectURL(file))
      setAttachments(prev => [...prev, ...newAttachments])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }


  const formatUrl = (url: string) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`
    }
    return url
  }

  const renderContent = (text: string) => {
    // Simple URL detection and rendering
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 underline"
          >
            {part}
          </a>
        )
      }
      return part
    })
  }

  if (!user) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card-elevated w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="heading-3 text-gray-900">
            {parentId ? 'Atbildēt uz Domu' : 'Izveidot Jaunu Domu'}
          </h3>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
          >
            <XMarkIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 p-6">
            {/* User Info */}
            <div className="flex items-center space-x-3 mb-6">
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${user.displayName}&background=3b82f6&color=fff`}
                alt={user.displayName}
                className="w-8 h-8 rounded-lg object-cover"
              />
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">{user.displayName}</h4>
                <p className="text-xs text-gray-500">@{user.username}</p>
              </div>
            </div>

            {/* Text Area */}
            <div className="mb-6">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={parentId ? "Write your reply..." : "What's happening?"}
                className="w-full h-32 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 placeholder-gray-500 text-sm"
                disabled={isSubmitting}
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">{content.length}/500</span>
              </div>
            </div>

            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-2">
                  {attachments.map((attachment, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={attachment}
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <XCircleIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Content Preview */}
            {content && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Preview:</p>
                <div className="text-sm text-gray-900">
                  {renderContent(content)}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                {/* Image Upload */}
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  variant="ghost"
                  size="sm"
                >
                  <PhotoIcon className="w-4 h-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />


                {/* Emoji */}
                <Button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  variant="ghost"
                  size="sm"
                >
                  😊
                </Button>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  type="button"
                  onClick={onClose}
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!content.trim() || isSubmitting}
                  loading={isSubmitting}
                  leftIcon={<PaperAirplaneIcon className="w-4 h-4" />}
                >
                  {isSubmitting ? 'Posting...' : parentId ? 'Reply' : 'Post'}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-20 left-6 z-10 emoji-picker-container">
            <EmojiPicker 
              onEmojiSelect={handleEmojiSelect} 
              isOpen={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
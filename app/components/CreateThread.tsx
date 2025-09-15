'use client'

import { useState, useEffect } from 'react'
import { useThread } from '../contexts/ThreadContext'
import { useUser } from '../contexts/UserContext'
import { useNotification } from '../contexts/NotificationContext'
import { useToast } from '../contexts/ToastContext'
import Button from './Button'
import Input from './Input'
import { XMarkIcon, PhotoIcon, LinkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import EmojiPicker from './EmojiPicker'
import HashtagInput from './HashtagInput'

interface CreateThreadProps {
  onClose: () => void
  parentId?: string
  groupId?: string
  topicDayId?: string
  onThreadCreated?: () => void
}

export default function CreateThread({ onClose, parentId, groupId, topicDayId, onThreadCreated }: CreateThreadProps) {
  const { user } = useUser()
  const { addThread, loadThreadsFromAPI } = useThread()
  const { addNotification } = useNotification()
  const { users } = useUser()
  const { success, error: showError } = useToast()
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attachments, setAttachments] = useState<string[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker) {
        const target = event.target as HTMLElement
        if (!target.closest('.emoji-picker-container')) {
          setShowEmojiPicker(false)
        }
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      alert('Please enter some content for your thread')
      return
    }
    
    if (!user) {
      alert('Please log in to create a thread')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authorId: user.id,
          content: content.trim(),
          visibility,
          attachments,
          parentId,
          groupId,
          topicDayId,
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        addThread(data.thread)
        await loadThreadsFromAPI()
        
        if (visibility === 'public') {
          const followers = users.filter(u => u.following?.includes(user.id))
          followers.forEach(follower => {
            addNotification({
              id: Date.now().toString() + Math.random(),
              type: 'comment',
              message: `${user.displayName} posted a new thread`,
              userId: follower.id,
              read: false,
              createdAt: new Date()
            })
          })
        }
        
        setContent('')
        setAttachments([])
        setLinkUrl('')
        onClose()
        
        if (onThreadCreated) {
          onThreadCreated()
        }
      } else {
        throw new Error(data.error || 'Failed to create thread')
      }
    } catch (error) {
      console.error('Error creating thread:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      alert(`Error creating thread: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setContent(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      try {
        const uploadPromises = Array.from(files).map(async (file) => {
          const formData = new FormData()
          formData.append('file', file)
          
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })
          
          if (response.ok) {
            const data = await response.json()
            return data.url
          } else {
            throw new Error('Upload failed')
          }
        })
        
        const uploadedUrls = await Promise.all(uploadPromises)
        setAttachments(prev => [...prev, ...uploadedUrls])
      } catch (error) {
        console.error('Error uploading images:', error)
        alert('Error uploading images. Please try again.')
      }
    }
  }

  const handleLinkAdd = () => {
    if (linkUrl.trim()) {
      setContent(prev => prev + ` ${linkUrl}`)
      setLinkUrl('')
      setShowLinkInput(false)
    }
  }

  if (!user) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card-elevated w-full max-w-lg">
        {/* Ultra-Minimal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="heading-3 text-gray-900">
            {parentId ? 'Reply to Thread' : 'Create New Thread'}
          </h3>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
          >
            <XMarkIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Ultra-Clean Form */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 p-6">
            {/* Ultra-Minimal User Info */}
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

            {/* Ultra-Clean Text Area */}
            <div className="mb-6">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={parentId ? "Write your reply..." : "What's happening?"}
                className="w-full h-32 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 placeholder-gray-500 text-sm"
                disabled={isSubmitting}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">{content.length}/500</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Visibility:</span>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as 'public' | 'followers')}
                    className="px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  >
                    <option value="public">Public</option>
                    <option value="followers">Followers Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Ultra-Minimal Attachments Preview */}
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
                        onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ultra-Clean Link Input */}
            {showLinkInput && (
              <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                <div className="flex space-x-2">
                  <Input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="Paste your link here..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleLinkAdd}
                    size="sm"
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}

            {/* Ultra-Minimal Hashtag Input */}
            <div className="mb-6">
              <HashtagInput
                value=""
                onChange={() => {}}
              />
            </div>
          </div>

          {/* Ultra-Clean Actions */}
          <div className="p-6 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                {/* Image Upload */}
                <label className="btn-icon cursor-pointer">
                  <PhotoIcon className="w-4 h-4" />
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>

                {/* Link */}
                <Button
                  type="button"
                  onClick={() => setShowLinkInput(!showLinkInput)}
                  variant="ghost"
                  size="sm"
                >
                  <LinkIcon className="w-4 h-4" />
                </Button>

                {/* Emoji */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Emoji button clicked!', showEmojiPicker)
                    setShowEmojiPicker(!showEmojiPicker)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
                  title="Add emoji"
                >
                  😊
                </button>
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
          <div className="absolute bottom-20 left-6 bg-white border border-gray-200 rounded-xl shadow-lg z-[9999] w-80 max-h-96 overflow-hidden emoji-picker-container">
            {/* Categories */}
            <div className="flex border-b border-gray-200 p-2">
              {['Smileys & People', 'Animals & Nature', 'Food & Drink', 'Activity', 'Travel & Places'].map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  className="px-3 py-1 text-xs font-medium rounded-md transition-colors text-gray-600 hover:bg-gray-100"
                >
                  {category.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Emojis */}
            <div className="p-3 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-8 gap-1">
                {['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleEmojiSelect(emoji)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-lg"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
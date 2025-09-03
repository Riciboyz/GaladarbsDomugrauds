'use client'

import { useState } from 'react'
import { useApp } from '../providers'
// import { v4 as uuidv4 } from 'uuid'
import { XMarkIcon, EyeIcon, UserGroupIcon, PhotoIcon, LinkIcon } from '@heroicons/react/24/outline'
import EmojiPicker from './EmojiPicker'
import HashtagInput from './HashtagInput'

interface CreateThreadProps {
  onClose: () => void
  parentId?: string
  groupId?: string
  topicDayId?: string
}

export default function CreateThread({ onClose, parentId, groupId, topicDayId }: CreateThreadProps) {
  const { user, addThread, addNotification, users } = useApp()
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attachments, setAttachments] = useState<string[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !user) return

    setIsSubmitting(true)

    try {
      const newThread = {
        id: crypto.randomUUID(),
        authorId: user.id,
        content: content.trim(),
        createdAt: new Date(),
        likes: [],
        dislikes: [],
        comments: [],
        replies: [],
        parentId,
        visibility,
        groupId,
        topicDayId,
      }

      addThread(newThread)

      // Add notifications for followers
      if (visibility === 'public' || visibility === 'followers') {
        user.followers.forEach(followerId => {
          const follower = users.find(u => u.id === followerId)
          if (follower) {
            addNotification({
              id: crypto.randomUUID(),
              userId: followerId,
              type: 'like', // Using 'like' type for new thread notifications
              message: `${user.displayName} posted a new thread`,
              read: false,
              createdAt: new Date(),
              relatedId: newThread.id,
            })
          }
        })
      }

      setContent('')
      onClose()
    } catch (error) {
      console.error('Error creating thread:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setContent(prev => prev + emoji)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) {
            setAttachments(prev => [...prev, event.target.result as string])
          }
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <h2 className="text-xl font-bold text-secondary-900">
            {parentId ? 'Reply to Thread' : 'Create New Thread'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-secondary-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* User Info */}
          <div className="flex items-center space-x-3 mb-4">
            <img
              src={user?.avatar || 'https://via.placeholder.com/40'}
              alt={user?.displayName}
              className="h-10 w-10 rounded-full object-cover"
            />
            <div>
              <p className="font-medium text-secondary-900">{user?.displayName}</p>
              <p className="text-sm text-secondary-500">@{user?.username}</p>
            </div>
          </div>

          {/* Content */}
          <div className="mb-4">
            <HashtagInput
              value={content}
              onChange={setContent}
              placeholder={parentId ? "Write your reply..." : "What's on your mind?"}
              maxLength={500}
            />
            
            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {attachments.map((attachment, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={attachment}
                      alt={`Attachment ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeAttachment(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-2">
                <label className="cursor-pointer p-2 hover:bg-secondary-100 rounded-lg transition-colors">
                  <PhotoIcon className="h-5 w-5 text-secondary-500" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                
                <button
                  type="button"
                  className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                  title="Add link"
                >
                  <LinkIcon className="h-5 w-5 text-secondary-500" />
                </button>
              </div>
              
              <p className="text-xs text-secondary-400">
                Press Cmd+Enter to post
              </p>
            </div>
          </div>

          {/* Visibility Settings */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-secondary-700 mb-3">
              Who can see this thread?
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border border-secondary-200 rounded-lg cursor-pointer hover:bg-secondary-50">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={visibility === 'public'}
                  onChange={(e) => setVisibility(e.target.value as 'public' | 'followers')}
                  className="mr-3"
                />
                <EyeIcon className="h-5 w-5 text-secondary-400 mr-3" />
                <div>
                  <p className="font-medium text-secondary-900">Public</p>
                  <p className="text-sm text-secondary-500">Anyone can see this thread</p>
                </div>
              </label>
              <label className="flex items-center p-3 border border-secondary-200 rounded-lg cursor-pointer hover:bg-secondary-50">
                <input
                  type="radio"
                  name="visibility"
                  value="followers"
                  checked={visibility === 'followers'}
                  onChange={(e) => setVisibility(e.target.value as 'public' | 'followers')}
                  className="mr-3"
                />
                <UserGroupIcon className="h-5 w-5 text-secondary-400 mr-3" />
                <div>
                  <p className="font-medium text-secondary-900">Followers only</p>
                  <p className="text-sm text-secondary-500">Only your followers can see this thread</p>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSubmitting ? 'Posting...' : parentId ? 'Reply' : 'Post Thread'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

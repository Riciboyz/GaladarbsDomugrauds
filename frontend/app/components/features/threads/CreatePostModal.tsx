'use client'

import { useState, useRef } from 'react'
import { useUser } from '../../contexts/UserContext'
import { useToast } from '../../contexts/ToastContext'
import { 
  XMarkIcon,
  PhotoIcon,
  LinkIcon,
  ChartBarIcon,
  CalendarIcon,
  PaperAirplaneIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

interface CreatePostModalProps {
  group: any
  onClose: () => void
  onPostCreated: () => void
}

const POST_TYPES = [
  { type: 'text', label: 'Text Post', icon: '📝', description: 'Share your thoughts' },
  { type: 'image', label: 'Image Post', icon: '📷', description: 'Share photos' },
  { type: 'link', label: 'Link Post', icon: '🔗', description: 'Share a link' },
  { type: 'poll', label: 'Poll', icon: '📊', description: 'Ask a question' },
  { type: 'event', label: 'Event', icon: '📅', description: 'Create an event' }
]

export default function CreatePostModal({ group, onClose, onPostCreated }: CreatePostModalProps) {
  const { user } = useUser()
  const { success, error: showError } = useToast()
  
  const [postType, setPostType] = useState<'text' | 'image' | 'link' | 'poll' | 'event'>('text')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [eventStartDate, setEventStartDate] = useState('')
  const [eventEndDate, setEventEndDate] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [isAnnouncement, setIsAnnouncement] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [linkPreview, setLinkPreview] = useState<any>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length > 0) {
      setSelectedImages(prev => [...prev, ...imageFiles].slice(0, 10)) // Max 10 images
    }
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const addPollOption = () => {
    if (pollOptions.length < 10) {
      setPollOptions(prev => [...prev, ''])
    }
  }

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(prev => prev.filter((_, i) => i !== index))
    }
  }

  const updatePollOption = (index: number, value: string) => {
    setPollOptions(prev => prev.map((option, i) => i === index ? value : option))
  }

  const fetchLinkPreview = async (url: string) => {
    try {
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      const data = await response.json()
      
      if (data.success) {
        setLinkPreview(data.preview)
      }
    } catch (error) {
      console.error('Error fetching link preview:', error)
    }
  }

  const handleLinkUrlChange = (url: string) => {
    setLinkUrl(url)
    if (url && url.startsWith('http')) {
      fetchLinkPreview(url)
    } else {
      setLinkPreview(null)
    }
  }

  const uploadImages = async () => {
    if (selectedImages.length === 0) return []

    const uploadPromises = selectedImages.map(async (file) => {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload/post', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })
      
      const data = await response.json()
      if (data.success) {
        return data.url
      }
      throw new Error(data.error || 'Upload failed')
    })

    return Promise.all(uploadPromises)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !user) return

    setIsSubmitting(true)

    try {
      let mediaUrls: string[] = []
      
      // Upload images if any
      if (selectedImages.length > 0) {
        mediaUrls = await uploadImages()
      }

      // Prepare post data
      const postData: any = {
        groupId: group.id,
        title: title.trim(),
        content: content.trim(),
        postType,
        mediaUrls,
        isPinned,
        isAnnouncement
      }

      // Add type-specific data
      if (postType === 'link') {
        postData.linkUrl = linkUrl
        postData.linkPreview = linkPreview
      } else if (postType === 'poll') {
        const validOptions = pollOptions.filter(option => option.trim())
        if (validOptions.length < 2) {
          throw new Error('Poll must have at least 2 options')
        }
        postData.pollOptions = validOptions.map(option => ({ text: option.trim(), votes: 0 }))
        postData.pollEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      } else if (postType === 'event') {
        if (!eventStartDate) {
          throw new Error('Event start date is required')
        }
        postData.eventStartDate = eventStartDate
        postData.eventEndDate = eventEndDate || null
        postData.eventLocation = eventLocation.trim() || null
      }

      // Create post
      const response = await fetch('/api/groups/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(postData)
      })

      const data = await response.json()
      
      if (data.success) {
        success('Success', 'Post created successfully!')
        onPostCreated()
        onClose()
      } else {
        throw new Error(data.error || 'Failed to create post')
      }
    } catch (error) {
      console.error('Error creating post:', error)
      showError('Error', 'Failed to create post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canCreatePinnedAnnouncement = user?.id === group.createdBy

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Create Post</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Post Type Selection */}
          <div className="p-6 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Post Type</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {POST_TYPES.map((type) => (
                <button
                  key={type.type}
                  onClick={() => setPostType(type.type as any)}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    postType === type.type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-xs font-medium text-gray-900">{type.label}</div>
                  <div className="text-xs text-gray-500">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Post Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title {postType !== 'text' && '(optional)'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter post title..."
                maxLength={200}
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32 resize-none"
                placeholder="What's on your mind?"
                required
                maxLength={2000}
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {content.length}/2000
              </div>
            </div>

            {/* Image Upload */}
            {postType === 'image' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Images
                </label>
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                  >
                    <PhotoIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Click to upload images</p>
                    <p className="text-xs text-gray-500">Max 10 images, 10MB each</p>
                  </button>
                  
                  {selectedImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedImages.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Link */}
            {postType === 'link' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link URL *
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => handleLinkUrlChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                  required
                />
                
                {linkPreview && (
                  <div className="mt-4 p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">{linkPreview.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{linkPreview.description}</p>
                    {linkPreview.image && (
                      <img src={linkPreview.image} alt="Preview" className="w-full h-32 object-cover rounded" />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Poll */}
            {postType === 'poll' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poll Options *
                </label>
                <div className="space-y-3">
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updatePollOption(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`Option ${index + 1}`}
                        required
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removePollOption(index)}
                          className="p-2 text-red-500 hover:text-red-700"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {pollOptions.length < 10 && (
                    <button
                      type="button"
                      onClick={addPollOption}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>Add Option</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Event */}
            {postType === 'event' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={eventStartDate}
                    onChange={(e) => setEventStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Event location..."
                  />
                </div>
              </div>
            )}

            {/* Special Options */}
            {canCreatePinnedAnnouncement && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900">Special Options</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={(e) => setIsPinned(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Pin to top</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isAnnouncement}
                      onChange={(e) => setIsAnnouncement(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Mark as announcement</span>
                  </label>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!content.trim() || isSubmitting}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <PaperAirplaneIcon className="w-4 h-4" />
                )}
                <span>{isSubmitting ? 'Creating...' : 'Create Post'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

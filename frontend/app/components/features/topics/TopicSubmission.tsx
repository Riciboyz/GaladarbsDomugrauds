'use client'

import { useState, useEffect, useRef } from 'react'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { useUser } from '../../contexts/UserContext'
import { useToast } from '../../contexts/ToastContext'
import { 
  PhotoIcon,
  PaperClipIcon,
  XMarkIcon,
  ArrowLeftIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

interface DailyTopic {
  id: string
  title: string
  description: string
  is_active: boolean
  created_at: string
  created_by_username: string
  created_by_display_name: string
}

interface Submission {
  id: string
  content: string
  image_url: string
  created_at: string
  username: string
  display_name: string
  avatar: string
}

interface TopicSubmissionProps {
  topicId: string
  onBack: () => void
}

export default function TopicSubmission({ topicId, onBack }: TopicSubmissionProps) {
  const { user } = useUser()
  const { success, error: showError } = useToast()
  const [topic, setTopic] = useState<DailyTopic | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [hasCheckedSubmission, setHasCheckedSubmission] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadTopic()
    loadSubmissions()
    checkAlreadySubmitted()
  }, [topicId, user?.id])

  // Listen for real-time topic submission updates
  useEffect(() => {
    if (!topicId) return

    const handleTopicSubmissionCreated = (event: CustomEvent) => {
      const data = event.detail
      console.log('📝 TopicSubmission: New submission created:', data)
      
      if (data.topicId === topicId) {
        // Reload submissions to show the new one
        loadSubmissions()
        success('New Submission', 'Someone just shared their take on this topic!')
      }
    }

    const handleTopicSubmissionNotification = (event: CustomEvent) => {
      const data = event.detail
      console.log('📬 TopicSubmission: Notification received:', data)
      
      if (data.topicId === topicId) {
        success('New Submission', `${data.createdBy} shared their take on this topic!`)
      }
    }

    // Add event listeners
    window.addEventListener('topic_submission_created', handleTopicSubmissionCreated as EventListener)
    window.addEventListener('topic_submission_notification', handleTopicSubmissionNotification as EventListener)

    return () => {
      window.removeEventListener('topic_submission_created', handleTopicSubmissionCreated as EventListener)
      window.removeEventListener('topic_submission_notification', handleTopicSubmissionNotification as EventListener)
    }
  }, [topicId, success])

  // Real-time updates for submissions
  const { lastMessage } = useWebSocket()
  useEffect(() => {
    if (!lastMessage) return
    if (lastMessage.type === 'topic_submission_created') {
      const s: any = lastMessage.data
      if (s.topic_id === topicId) {
        setSubmissions(prev => {
          if (prev.some(p => p.id === s.id)) return prev
          return [
            {
              id: s.id,
              content: s.content,
              image_url: s.image_url,
              created_at: s.created_at,
              username: s.username,
              display_name: s.display_name,
              avatar: s.avatar
            },
            ...prev
          ]
        })
      }
    }
  }, [lastMessage, topicId])

  const loadTopic = async () => {
    try {
      const response = await fetch('/api/daily-topic')
      const data = await response.json()
      
      if (data.success && data.topic && data.topic.id === topicId) {
        setTopic(data.topic)
      } else {
        showError('Error', 'Topic not found or not active')
        onBack()
      }
    } catch (error) {
      console.error('Error loading topic:', error)
      showError('Error', 'Failed to load topic')
    }
  }

  const loadSubmissions = async () => {
    try {
      const response = await fetch(`/api/topic-submissions?topicId=${topicId}`, {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (data.success) {
        setSubmissions(data.submissions)
        if (data.mySubmissionId) setHasSubmitted(true)
      }
    } catch (error) {
      console.error('Error loading submissions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkAlreadySubmitted = async () => {
    if (!user) {
      setHasCheckedSubmission(true)
      return
    }
    try {
      const response = await fetch(`/api/topic-submissions/me?topicId=${topicId}`, {
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success && data.hasSubmitted) {
        setHasSubmitted(true)
      }
    } catch (error) {
      console.error('Error checking submission:', error)
    } finally {
      setHasCheckedSubmission(true)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      showError('File Too Large', 'File must be less than 50MB')
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const uploadResponse = await fetch('/api/upload/chat', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      const uploadData = await uploadResponse.json()
      
      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Upload failed')
      }

      setImageUrl(uploadData.url)
      success('Success', 'Image uploaded successfully!')
    } catch (error) {
      console.error('Error uploading image:', error)
      showError('Upload Failed', 'Failed to upload image. Please try again.')
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || (!content.trim() && !imageUrl)) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/topic-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          topicId,
          content: content.trim(),
          imageUrl
        })
      })

      const data = await response.json()
      
      if (response.status === 409 || data.alreadySubmitted) {
        setHasSubmitted(true)
        showError('Jau iesniegts', 'Šodien jau esi veicis ierakstu.')
        return
      }

      if (data.success) {
        success('Success', 'Your submission has been posted!')
        setContent('')
        setImageUrl('')
        setHasSubmitted(true)
        loadSubmissions()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error submitting:', error)
      showError('Error', 'Failed to submit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-border-ui border-t-accent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-ink-muted">Loading topic...</p>
        </div>
      </div>
    )
  }

  if (!topic) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <CalendarIcon className="w-16 h-16 text-ink-muted/60 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-ink mb-2">Topic Not Found</h2>
          <p className="text-ink-muted mb-6">This topic doesn't exist or is no longer active.</p>
          <button
            onClick={onBack}
            className="bg-accent text-accent-fg px-6 py-3 rounded-lg hover:bg-accent-hover transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-ink-muted hover:text-ink mb-4 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>Back to Home</span>
        </button>
        
        <div className="bg-gradient-to-br from-accent via-accent/80 to-accent-hover rounded-2xl p-6 text-accent-fg border border-accent/30 shadow-lg">
          <div className="flex items-center space-x-3 mb-3">
            <CalendarIcon className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Daily Topic</h1>
          </div>
          <h2 className="text-xl font-semibold mb-2">{topic.title}</h2>
          {topic.description && (
            <p className="text-accent-fg/90">{topic.description}</p>
          )}
        </div>
      </div>

      {/* Submission Form */}
      {user && hasCheckedSubmission && !hasSubmitted && (
        <div className="bg-surface-2 border border-border-ui rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-ink mb-4">Share Your Response</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-3 bg-surface text-ink placeholder-ink-muted/70 border border-border-ui rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                placeholder="Write your response to the daily topic..."
                rows={4}
              />
            </div>

            {imageUrl && (
              <div className="relative">
                <img 
                  src={imageUrl} 
                  alt="Uploaded image"
                  className="w-full max-w-md h-auto rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 px-4 py-2 text-ink-muted hover:text-ink hover:bg-surface rounded-lg transition-colors"
                >
                  <PhotoIcon className="w-5 h-5" />
                  <span>Add Image</span>
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*"
                />
              </div>

              <button
                type="submit"
                disabled={(!content.trim() && !imageUrl) || isSubmitting}
                className="bg-accent text-accent-fg px-6 py-3 rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-accent-fg/30 border-t-accent-fg rounded-full animate-spin"></div>
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <PaperClipIcon className="w-4 h-4" />
                    <span>Post Response</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Success Message */}
      {hasSubmitted && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <p className="text-emerald-500 font-medium">Your response has been posted!</p>
          </div>
        </div>
      )}

      {/* Submissions */}
      <div>
        <h3 className="text-lg font-semibold text-ink mb-4">
          Community Responses ({submissions.length})
        </h3>

        {submissions.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-xl">
            <CalendarIcon className="w-12 h-12 text-ink-muted/60 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-ink mb-2">No responses yet</h4>
            <p className="text-ink-muted">Be the first to share your response to this topic!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div key={submission.id} className="bg-surface-2 border border-border-ui rounded-xl p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-border-ui rounded-full flex items-center justify-center">
                    {submission.avatar ? (
                      <img 
                        src={submission.avatar} 
                        alt={submission.display_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-ink-muted">
                        {submission.display_name?.charAt(0) || 'U'}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold text-ink">{submission.display_name}</h4>
                      <span className="text-ink-muted text-sm">@{submission.username}</span>
                      <span className="text-ink-muted/60 text-sm">•</span>
                      <span className="text-ink-muted text-sm">
                        {new Date(submission.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {submission.content && (
                      <p className="text-ink mb-3">{submission.content}</p>
                    )}
                    
                    {submission.image_url && (
                      <img 
                        src={submission.image_url} 
                        alt="Submission"
                        className="max-w-full h-auto rounded-lg"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '../../contexts/UserContext'
import { useToast } from '../../contexts/ToastContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { 
  HeartIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  EllipsisHorizontalIcon,
  PhotoIcon,
  LinkIcon,
  ChartBarIcon,
  CalendarIcon,
  MegaphoneIcon,
  TrashIcon,
  PencilIcon,
  HandThumbUpIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { 
  HeartIcon as HeartSolidIcon,
  HandThumbUpIcon as HandThumbUpSolidIcon,
  FaceSmileIcon as FaceSmileSolidIcon,
  FaceFrownIcon as FaceFrownSolidIcon,
  ExclamationTriangleIcon as ExclamationTriangleSolidIcon
} from '@heroicons/react/24/solid'

interface GroupPostsProps {
  group: any
}

interface Post {
  id: string
  group_id: string
  author_id: string
  title?: string
  content: string
  post_type: 'text' | 'image' | 'link' | 'poll' | 'event'
  media_urls: string[]
  link_url?: string
  link_preview?: any
  poll_options?: any[]
  poll_end_date?: string
  event_start_date?: string
  event_end_date?: string
  event_location?: string
  is_pinned: boolean
  is_announcement: boolean
  created_at: string
  username: string
  display_name: string
  avatar?: string
  reaction_counts: Record<string, number>
  comment_count: number
}

interface Comment {
  id: string
  post_id: string
  author_id: string
  content: string
  parent_id?: string
  media_urls: string[]
  created_at: string
  username: string
  display_name: string
  avatar?: string
  reaction_counts: Record<string, number>
}

const REACTION_TYPES = [
  { type: 'like', icon: HandThumbUpIcon, solidIcon: HandThumbUpSolidIcon, color: 'text-blue-500' },
  { type: 'love', icon: HeartIcon, solidIcon: HeartSolidIcon, color: 'text-red-500' },
  { type: 'laugh', icon: FaceSmileIcon, solidIcon: FaceSmileSolidIcon, color: 'text-yellow-500' },
  { type: 'wow', icon: ExclamationTriangleIcon, solidIcon: ExclamationTriangleSolidIcon, color: 'text-purple-500' },
  { type: 'sad', icon: FaceFrownIcon, solidIcon: FaceFrownSolidIcon, color: 'text-gray-500' },
  { type: 'angry', icon: ExclamationTriangleIcon, solidIcon: ExclamationTriangleSolidIcon, color: 'text-red-600' }
]

export default function GroupPosts({ group }: GroupPostsProps) {
  const { user } = useUser()
  const { success, error: showError } = useToast()
  const { isConnected } = useWebSocket()
  
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [showComments, setShowComments] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [userReactions, setUserReactions] = useState<Record<string, string>>({})
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadPosts()
  }, [group.id])

  useEffect(() => {
    // Listen for WebSocket messages
    const handleWebSocketMessage = (event: CustomEvent) => {
      try {
        const message = JSON.parse(event.detail)
        const { type, data } = message

        switch (type) {
          case 'group_post_created':
            if (data.group_id === group.id) {
              setPosts(prev => [data, ...prev])
            }
            break
          
          case 'group_post_deleted':
            if (data.groupId === group.id) {
              setPosts(prev => prev.filter(p => p.id !== data.postId))
            }
            break
          
          case 'group_post_comment':
            if (data.group_id === group.id) {
              setComments(prev => ({
                ...prev,
                [data.post_id]: [...(prev[data.post_id] || []), data]
              }))
              setPosts(prev => prev.map(p => 
                p.id === data.post_id 
                  ? { ...p, comment_count: p.comment_count + 1 }
                  : p
              ))
            }
            break
          
          case 'group_post_comment_deleted':
            if (data.postId) {
              setComments(prev => ({
                ...prev,
                [data.postId]: (prev[data.postId] || []).filter(c => c.id !== data.commentId)
              }))
              setPosts(prev => prev.map(p => 
                p.id === data.postId 
                  ? { ...p, comment_count: Math.max(0, p.comment_count - 1) }
                  : p
              ))
            }
            break
          
          case 'group_post_reaction':
            if (data.group_id === group.id) {
              if (data.post_id) {
                setPosts(prev => prev.map(p => 
                  p.id === data.post_id 
                    ? { ...p, reaction_counts: data.reaction_counts }
                    : p
                ))
              }
              if (data.comment_id) {
                setComments(prev => ({
                  ...prev,
                  [data.post_id]: (prev[data.post_id] || []).map(c => 
                    c.id === data.comment_id 
                      ? { ...c, reaction_counts: data.reaction_counts }
                      : c
                  )
                }))
              }
            }
            break
        }
      } catch (error) {
        console.error('Error handling WebSocket message in GroupPosts:', error)
      }
    }

    window.addEventListener('websocket-message', handleWebSocketMessage as EventListener)
    
    return () => {
      window.removeEventListener('websocket-message', handleWebSocketMessage as EventListener)
    }
  }, [group.id])

  useEffect(() => {
    if (showComments && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [comments, showComments])

  const loadPosts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/groups/posts?groupId=${group.id}&limit=20`)
      const data = await response.json()
      
      if (data.success) {
        setPosts(data.posts)
        // Load user reactions
        loadUserReactions(data.posts)
      } else {
        throw new Error(data.error || 'Failed to load posts')
      }
    } catch (error) {
      console.error('Error loading posts:', error)
      showError('Error', 'Failed to load posts')
    } finally {
      setIsLoading(false)
    }
  }

  const loadUserReactions = async (posts: Post[]) => {
    try {
      const reactions: Record<string, string> = {}
      
      for (const post of posts) {
        const response = await fetch(`/api/groups/posts/reactions?postId=${post.id}`)
        const data = await response.json()
        
        if (data.success && data.userReaction) {
          reactions[post.id] = data.userReaction
        }
      }
      
      setUserReactions(reactions)
    } catch (error) {
      console.error('Error loading user reactions:', error)
    }
  }

  const loadComments = async (postId: string) => {
    try {
      const response = await fetch(`/api/groups/posts/comments?postId=${postId}&limit=50`)
      const data = await response.json()
      
      if (data.success) {
        setComments(prev => ({
          ...prev,
          [postId]: data.comments
        }))
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    }
  }

  const handleReaction = async (postId: string, reactionType: string) => {
    if (!user) return

    try {
      const currentReaction = userReactions[postId]
      
      if (currentReaction === reactionType) {
        // Remove reaction
        await fetch('/api/groups/posts/reactions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId })
        })
        
        setUserReactions(prev => ({
          ...prev,
          [postId]: ''
        }))
      } else {
        // Add/change reaction
        await fetch('/api/groups/posts/reactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, reactionType })
        })
        
        setUserReactions(prev => ({
          ...prev,
          [postId]: reactionType
        }))
      }
      
      setShowReactionPicker(null)
    } catch (error) {
      console.error('Error handling reaction:', error)
      showError('Error', 'Failed to update reaction')
    }
  }

  const handleComment = async (postId: string) => {
    if (!newComment.trim() || !user) return

    try {
      const response = await fetch('/api/groups/posts/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          content: newComment.trim()
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setNewComment('')
        // Comment will be added via WebSocket
      } else {
        throw new Error(data.error || 'Failed to post comment')
      }
    } catch (error) {
      console.error('Error posting comment:', error)
      showError('Error', 'Failed to post comment')
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60)
    const diffInHours = diffInMinutes / 60
    const diffInDays = diffInHours / 24
    
    if (diffInMinutes < 1) {
      return 'just now'
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getTotalReactions = (reactionCounts: Record<string, number>) => {
    return Object.values(reactionCounts).reduce((sum, count) => sum + count, 0)
  }

  const renderReactionButton = (postId: string) => {
    const currentReaction = userReactions[postId]
    const totalReactions = getTotalReactions(posts.find(p => p.id === postId)?.reaction_counts || {})
    
    return (
      <div className="relative">
        <button
          onClick={() => setShowReactionPicker(showReactionPicker === postId ? null : postId)}
          className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <HandThumbUpIcon className="w-5 h-5 text-gray-500" />
          <span className="text-sm text-gray-600">{totalReactions}</span>
        </button>
        
        {showReactionPicker === postId && (
          <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex space-x-1 z-10">
            {REACTION_TYPES.map((reaction) => {
              const Icon = reaction.icon
              const count = posts.find(p => p.id === postId)?.reaction_counts[reaction.type] || 0
              
              return (
                <button
                  key={reaction.type}
                  onClick={() => handleReaction(postId, reaction.type)}
                  className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
                    currentReaction === reaction.type ? reaction.color : 'text-gray-500'
                  }`}
                  title={`${reaction.type} (${count})`}
                >
                  <Icon className="w-6 h-6" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const renderPost = (post: Post) => (
    <div key={post.id} className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            {post.avatar ? (
              <img src={post.avatar} alt={post.username} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <span className="text-sm font-medium text-gray-600">
                {post.username?.charAt(0) || 'U'}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="font-semibold text-gray-900">{post.display_name}</h4>
              <span className="text-sm text-gray-500">@{post.username}</span>
              {post.is_pinned && <span className="text-blue-500">📌</span>}
              {post.is_announcement && <MegaphoneIcon className="w-4 h-4 text-orange-500" />}
            </div>
            <p className="text-sm text-gray-500">{formatTime(post.created_at)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {user?.id === post.author_id && (
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
              <EllipsisHorizontalIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Post Content */}
      {post.title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-3">{post.title}</h3>
      )}
      
      <div className="text-gray-900 mb-4 whitespace-pre-wrap">{post.content}</div>

      {/* Post Media */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="mb-4">
          {post.media_urls.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`Post media ${index + 1}`}
              className="max-w-full h-auto rounded-lg"
            />
          ))}
        </div>
      )}

      {/* Link Preview */}
      {post.link_url && post.link_preview && (
        <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
          <a href={post.link_url} target="_blank" rel="noopener noreferrer" className="block">
            <div className="p-4">
              <h4 className="font-semibold text-gray-900 mb-2">{post.link_preview.title}</h4>
              <p className="text-sm text-gray-600 mb-2">{post.link_preview.description}</p>
              <span className="text-sm text-blue-600">{post.link_url}</span>
            </div>
          </a>
        </div>
      )}

      {/* Poll */}
      {post.post_type === 'poll' && post.poll_options && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-3">Poll</h4>
          <div className="space-y-2">
            {post.poll_options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1 bg-white rounded-lg p-2 border border-gray-200">
                  {option.text}
                </div>
                <span className="text-sm text-gray-500">{option.votes || 0} votes</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event */}
      {post.post_type === 'event' && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-blue-900">Event</h4>
          </div>
          <p className="text-sm text-blue-800">
            {post.event_start_date && new Date(post.event_start_date).toLocaleString()}
            {post.event_end_date && ` - ${new Date(post.event_end_date).toLocaleString()}`}
          </p>
          {post.event_location && (
            <p className="text-sm text-blue-700 mt-1">📍 {post.event_location}</p>
          )}
        </div>
      )}

      {/* Post Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-6">
          {renderReactionButton(post.id)}
          
          <button
            onClick={() => {
              setShowComments(showComments === post.id ? null : post.id)
              if (showComments !== post.id) {
                loadComments(post.id)
              }
            }}
            className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChatBubbleLeftIcon className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600">{post.comment_count}</span>
          </button>
          
          <button className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ShareIcon className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600">Share</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments === post.id && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {/* Comments List */}
          <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
            {(comments[post.id] || []).map((comment) => (
              <div key={comment.id} className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  {comment.avatar ? (
                    <img src={comment.avatar} alt={comment.username} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <span className="text-xs font-medium text-gray-600">
                      {comment.username?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900">{comment.display_name}</span>
                    <span className="text-sm text-gray-500">@{comment.username}</span>
                    <span className="text-sm text-gray-500">{formatTime(comment.created_at)}</span>
                  </div>
                  <p className="text-gray-900">{comment.content}</p>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>

          {/* Comment Input */}
          <div className="flex space-x-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <span className="text-xs font-medium text-gray-600">
                  {user?.username?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            <div className="flex-1 flex space-x-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleComment(post.id)
                  }
                }}
              />
              <button
                onClick={() => handleComment(post.id)}
                disabled={!newComment.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Create Post Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Posts</h2>
        <button
          onClick={() => setShowCreatePost(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Create Post</span>
        </button>
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ChatBubbleLeftIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
          <p className="text-gray-500 mb-4">Be the first to start a conversation in this group!</p>
          <button
            onClick={() => setShowCreatePost(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create First Post
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map(renderPost)}
        </div>
      )}

      {/* Connection Status */}
      {!isConnected && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm">Reconnecting...</span>
          </div>
        </div>
      )}
    </div>
  )
}

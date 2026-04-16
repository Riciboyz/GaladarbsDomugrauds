'use client'

import { useState, useEffect } from 'react'
import { useUser } from '../../contexts/UserContext'
import { useThread } from '../../contexts/ThreadContext'
import { useNotification } from '../../contexts/NotificationContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { formatDistanceToNow } from 'date-fns'
import { 
  HeartIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  EllipsisHorizontalIcon,
  UserPlusIcon,
  UserMinusIcon,
  HandThumbDownIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartFilledIcon, HandThumbDownIcon as HandThumbDownFilledIcon } from '@heroicons/react/24/solid'
import SimpleCreateThread from './SimpleCreateThread'

interface ThreadCardProps {
  thread: any
  isReply?: boolean
  onUserClick?: (userId: string) => void
}

export default function ThreadCard({ thread, isReply = false, onUserClick }: ThreadCardProps) {
  const { user, users, updateUser } = useUser()
  const { updateThread, deleteThread } = useThread()
  const { addNotification } = useNotification()
  const { sendMessage } = useWebSocket()
  const [showReplies, setShowReplies] = useState(false)
  const [showCreateReply, setShowCreateReply] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [isFollowingUser, setIsFollowingUser] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)

  // Prefer author embedded on the thread from API; fall back to users list
  let author = thread.author || users.find(u => u.id === thread.authorId)
  const isLiked = user && thread.likes && (() => {
    try {
      const likes = typeof thread.likes === 'string' ? JSON.parse(thread.likes) : thread.likes;
      return Array.isArray(likes) && likes.includes(user.id);
    } catch {
      return false;
    }
  })()
  const isDisliked = user && thread.dislikes && (() => {
    try {
      const dislikes = typeof thread.dislikes === 'string' ? JSON.parse(thread.dislikes) : thread.dislikes;
      return Array.isArray(dislikes) && dislikes.includes(user.id);
    } catch {
      return false;
    }
  })()
  const isFollowing = user && author && user.following && user.following.includes(author.id)
  const isOwnThread = user && thread.authorId === user.id
  
  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showOptions) {
        setShowOptions(false)
      }
    }

    if (showOptions) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showOptions])
  
  // Debug thread data
  console.log('ThreadCard rendering thread:', {
    id: thread.id,
    createdAt: thread.createdAt,
    createdAtType: typeof thread.createdAt,
    content: thread.content?.substring(0, 50) + '...',
    author: author?.id,
    isOwnThread,
    isFollowing,
    user: user?.id
  })
  
  console.log('Follow button render check:', { 
    isOwnThread, 
    author: author?.id, 
    user: user?.id,
    shouldShowFollowButton: !isOwnThread
  })

  const handleLike = async () => {
    if (!user || !author || isLiking) return

    setIsLiking(true)
    try {
      const action = isLiked ? 'unlike' : 'like'
      const response = await fetch('/api/threads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: thread.id, userId: user.id, action }),
      })
      
      const data = await response.json()
      if (response.ok) {
        updateThread(thread.id, data.thread)
        
        // Send real-time notification if someone liked the thread
        if (!isLiked && author.id !== user.id) {
          // Use the notifications/send API which handles both database storage and Socket.IO delivery
          try {
            const notificationResponse = await fetch('/api/notifications/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'like',
                fromUserId: user.id,
                toUserId: author.id,
                message: `${user.displayName} liked your thread`,
                data: { relatedId: thread.id }
              })
            })
            
            if (notificationResponse.ok) {
              const notificationData = await notificationResponse.json()
              console.log('🔔 Like notification sent successfully:', notificationData.notification.id)
            }
          } catch (notificationError) {
            console.error('Error sending like notification:', notificationError)
          }
        }
      } else {
        throw new Error(data.error || 'Failed to like thread')
      }
    } catch (error) {
      console.error('Error liking thread:', error)
      alert('Failed to like thread. Please try again.')
    } finally {
      setIsLiking(false)
    }
  }

  const handleDislike = async () => {
    if (!user || !author || isLiking) return

    setIsLiking(true)
    try {
      const action = isDisliked ? 'undislike' : 'dislike'
      const response = await fetch('/api/threads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: thread.id, userId: user.id, action }),
      })
      
      const data = await response.json()
      if (response.ok) {
        updateThread(thread.id, data.thread)
        
        // Send notification if someone disliked the thread (only for new dislikes)
        if (action === 'dislike' && author.id !== user.id) {
          // Use the notifications/send API which handles both database storage and Socket.IO delivery
          try {
            const notificationResponse = await fetch('/api/notifications/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'dislike',
                fromUserId: user.id,
                toUserId: author.id,
                message: `${user.displayName} disliked your thread`,
                data: { relatedId: thread.id }
              })
            })
            
            if (notificationResponse.ok) {
              const notificationData = await notificationResponse.json()
              console.log('🔔 Dislike notification sent successfully:', notificationData.notification.id)
            }
          } catch (notificationError) {
            console.error('Error sending dislike notification:', notificationError)
          }
        }
      } else {
        throw new Error(data.error || 'Failed to dislike thread')
      }
    } catch (error) {
      console.error('Error disliking thread:', error)
      alert('Failed to dislike thread. Please try again.')
    } finally {
      setIsLiking(false)
    }
  }

  const handleFollow = async () => {
    if (!user || !author || isFollowingUser) return

    console.log('handleFollow called:', {
      user: user.id,
      author: author.id,
      isFollowing,
      isFollowingUser
    })

    setIsFollowingUser(true)
    try {
      const action = isFollowing ? 'unfollow' : 'follow'
      console.log('Sending follow request:', { userId: author.id, action })
      
      const response = await fetch('/api/users/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: author.id, // The user we want to follow/unfollow
          action: action
        }),
      })
      
      const data = await response.json()
      console.log('Follow API response:', { response: response.ok, data })
      
      if (response.ok) {
        // Update current user's following list
        const updatedUser = {
          ...user,
          following: action === 'follow' 
            ? [...(user.following || []), author.id]
            : (user.following || []).filter(id => id !== author.id)
        }
        console.log('Updating user with:', updatedUser)
        updateUser(updatedUser)
        
        // Update the target user's followers list
        const updatedUsers = users.map(u => 
          u.id === author.id 
            ? {
                ...u,
                followers: action === 'follow'
                  ? [...(u.followers || []), user.id]
                  : (u.followers || []).filter(id => id !== user.id)
              }
            : u
        )
        updateUser(updatedUser, updatedUsers)
        
        if (action === 'follow') {
          addNotification({
            id: Date.now().toString(),
            type: 'follow',
            message: `${user.displayName} started following you`,
            userId: author.id,
            read: false,
            createdAt: new Date()
          })
        }
      } else {
        throw new Error(data.error || 'Failed to follow user')
      }
    } catch (error) {
      console.error('Error following user:', error)
      alert('Failed to follow user. Please try again.')
    } finally {
      setIsFollowingUser(false)
    }
  }

  const handleDelete = async () => {
    if (!isOwnThread) return

    // Ask for confirmation before deleting
    if (!confirm('Are you sure you want to delete this thread?')) {
      return
    }

    try {
      const response = await fetch(`/api/threads?id=${thread.id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        deleteThread(thread.id)
        setShowOptions(false) // Close the menu after deletion
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete thread')
      }
    } catch (error) {
      console.error('Error deleting thread:', error)
      alert('Failed to delete thread. Please try again.')
    }
  }

  const handleComment = async () => {
    if (!user || !commentText.trim()) return

    setIsSubmittingComment(true)
    try {
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: commentText,
          parentId: thread.id,
        }),
      })
      
      const data = await response.json()
      if (response.ok) {
        // Add the new comment/reply to the thread's replies array
        const newReply = {
          id: data.thread.id,
          authorId: data.thread.authorId || data.thread.author_id,
          content: data.thread.content,
          createdAt: new Date(data.thread.createdAt || data.thread.created_at),
          likes: data.thread.likes || [],
          dislikes: data.thread.dislikes || [],
          comments: data.thread.comments || [],
          replies: data.thread.replies || [],
          parentId: data.thread.parentId || data.thread.parent_id,
          visibility: data.thread.visibility || 'public',
          topicDayId: data.thread.topicDayId || data.thread.topic_day_id,
          groupId: data.thread.groupId || data.thread.group_id,
          attachments: data.thread.attachments || []
        }
        
        // Update the parent thread to include the new reply
        const updatedThread = {
          ...thread,
          replies: [...(thread.replies || []), newReply]
        }
        
        console.log('Adding reply to thread:', {
          threadId: thread.id,
          newReply: newReply,
          updatedThread: updatedThread
        })
        
        updateThread(thread.id, updatedThread)
        setCommentText('')
        setShowComments(false)
        
        // Send notification to the original author
        if (author && author.id !== user.id) {
          // Use the unified notifications/send API which handles both database storage and Socket.IO delivery
          try {
            const notificationResponse = await fetch('/api/notifications/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'comment',
                fromUserId: user.id,
                toUserId: author.id,
                message: `${user.displayName} commented on your thread`,
                data: { relatedId: thread.id }
              })
            })
            
            if (notificationResponse.ok) {
              const notificationData = await notificationResponse.json()
              console.log('🔔 Comment notification sent successfully:', notificationData.notification.id)
            }
          } catch (notificationError) {
            console.error('Error sending comment notification:', notificationError)
          }
        }
      }
    } catch (error) {
      console.error('Error commenting:', error)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  if (!author) {
    console.log('ThreadCard: Author not found for thread:', thread.id, 'authorId:', thread.authorId, 'available users:', users.length)
    // Create a fallback author object
    author = {
      id: thread.authorId,
      username: 'unknown',
      displayName: 'Unknown User',
      email: 'unknown@example.com',
      avatar: `https://ui-avatars.com/api/?name=Unknown&background=gray&color=fff`,
      bio: '',
      followers: [],
      following: [],
      createdAt: new Date()
    }
    console.log('Using fallback author:', author)
  }

  return (
    <div id={`thread-${thread.id}`} className={`${isReply ? 'ml-8 border-l border-gray-200' : ''}`}>
      <div className="p-5 bg-white border border-gray-100 rounded-xl shadow-dg-sm hover:shadow-dg-md transition-shadow duration-200">
        {/* Thread Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <img
              src={author.avatar || `https://ui-avatars.com/api/?name=${author.displayName}&background=3b82f6&color=fff`}
              alt={author.displayName}
              className="w-10 h-10 rounded-full object-cover cursor-pointer shadow-dg-sm hover:opacity-90 transition-opacity"
              onClick={() => onUserClick?.(author.id)}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 
                  className="font-semibold text-gray-900 truncate text-sm cursor-pointer hover:text-brand-green-700"
                  onClick={() => onUserClick?.(author.id)}
                >
                  {author.displayName}
                </h3>
                <span className="text-sm text-gray-500">@{author.username}</span>
                <span className="text-sm text-gray-400">·</span>
                <span className="text-sm text-gray-500">
                  {(() => {
                    try {
                      const date = new Date(thread.createdAt)
                      if (isNaN(date.getTime())) {
                        return 'Just now'
                      }
                      return formatDistanceToNow(date, { addSuffix: true })
                    } catch (error) {
                      console.error('Date formatting error:', error, 'thread.createdAt:', thread.createdAt)
                      return 'Just now'
                    }
                  })()}
                </span>
              </div>
              {!isOwnThread && (
                <button
                  onClick={() => {
                    console.log('Follow button clicked:', {
                      user: user?.id,
                      author: author?.id,
                      isFollowing,
                      isFollowingUser
                    })
                    handleFollow()
                  }}
                  disabled={isFollowingUser}
                  className={`mt-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    isFollowing
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-brand-green-700 text-white hover:bg-brand-green-600'
                  } ${isFollowingUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isFollowingUser ? (
                    <>
                      <div className="w-3 h-3 inline mr-1 animate-spin border border-white border-t-transparent rounded-full"></div>
                      Processing...
                    </>
                  ) : isFollowing ? (
                    'Following'
                  ) : (
                    'Follow'
                  )}
                </button>
              )}
            </div>
          </div>
          
          {isOwnThread && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowOptions(!showOptions)
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <EllipsisHorizontalIcon className="w-5 h-5 text-gray-500" />
              </button>
              
              {showOptions && (
                <div 
                  className="absolute right-0 top-8 bg-white border border-gray-100 rounded-xl shadow-dg-sm z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleDelete}
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-xl"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Thread Content */}
        <div className="text-gray-800 mb-4 whitespace-pre-wrap leading-relaxed">
          {thread.content}
        </div>

        {/* Attachments */}
        {thread.attachments && (() => {
          try {
            const attachments = typeof thread.attachments === 'string' 
              ? JSON.parse(thread.attachments) 
              : thread.attachments;
            return Array.isArray(attachments) && attachments.length > 0;
          } catch {
            return false;
          }
        })() && (
          <div className="mb-4">
            <div className="grid grid-cols-1 gap-2">
              {(() => {
                try {
                  const attachments = typeof thread.attachments === 'string' 
                    ? JSON.parse(thread.attachments) 
                    : thread.attachments;
                  return Array.isArray(attachments) ? attachments : [];
                } catch {
                  return [];
                }
              })().map((attachment: string, index: number) => (
                <div key={index} className="relative group">
                  <img
                    src={attachment}
                    alt={`Attachment ${index + 1}`}
                    className="w-full max-w-md rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(attachment, '_blank')}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thread Actions */}
        <div className="flex items-center gap-6 text-gray-500">
          {/* Like Button */}
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center space-x-1 hover:text-red-500 transition-colors ${
              isLiked ? 'text-red-500' : ''
            }`}
          >
            {isLiked ? (
              <HeartFilledIcon className="w-5 h-5" />
            ) : (
              <HeartIcon className="w-5 h-5" />
            )}
            <span className="text-sm">{(() => {
              try {
                const likes = typeof thread.likes === 'string' ? JSON.parse(thread.likes) : thread.likes;
                return Array.isArray(likes) ? likes.length : 0;
              } catch {
                return 0;
              }
            })()}</span>
          </button>

          {/* Dislike Button */}
          <button
            onClick={handleDislike}
            disabled={isLiking}
            className={`flex items-center space-x-1 hover:text-blue-500 transition-colors ${
              isDisliked ? 'text-blue-500' : ''
            }`}
          >
            {isDisliked ? (
              <HandThumbDownFilledIcon className="w-5 h-5" />
            ) : (
              <HandThumbDownIcon className="w-5 h-5" />
            )}
            <span className="text-sm">{(() => {
              try {
                const dislikes = typeof thread.dislikes === 'string' ? JSON.parse(thread.dislikes) : thread.dislikes;
                return Array.isArray(dislikes) ? dislikes.length : 0;
              } catch {
                return 0;
              }
            })()}</span>
          </button>

          {/* Comment Button */}
          <button
            onClick={() => {
              console.log('Comment button clicked, current replies:', thread.replies)
              setShowComments(!showComments)
            }}
            className="flex items-center space-x-1 hover:text-blue-500 transition-colors"
          >
            <ChatBubbleLeftIcon className="w-5 h-5" />
            <span className="text-sm">{thread.replies?.length || 0}</span>
          </button>

          {/* Share Button */}
          <button className="flex items-center space-x-1 hover:text-brand-green-700 transition-colors">
            <ShareIcon className="w-5 h-5" />
          </button>

          {user && !isOwnThread && (
            <button
              type="button"
              onClick={() => {
                setReportReason('')
                setShowReport(true)
              }}
              className="text-sm text-gray-500 hover:text-amber-700 underline-offset-2 hover:underline"
            >
              Ziņot
            </button>
          )}
        </div>

        {showReport && user && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
            <p className="text-sm font-medium text-amber-900">Ziņot par ierakstu</p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Īss iemesls (neobligāti)"
              className="w-full rounded-lg border border-amber-200 p-2 text-sm bg-white"
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                onClick={() => setShowReport(false)}
              >
                Atcelt
              </button>
              <button
                type="button"
                disabled={reportSubmitting}
                className="px-3 py-1 text-sm rounded-lg bg-amber-800 text-white disabled:opacity-50"
                onClick={async () => {
                  setReportSubmitting(true)
                  try {
                    const res = await fetch('/api/reports', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ threadId: thread.id, reason: reportReason }),
                    })
                    const data = await res.json().catch(() => ({}))
                    if (!res.ok) throw new Error(data.error || 'Neizdevās nosūtīt')
                    addNotification({
                      id: `report-ok-${Date.now()}`,
                      userId: user.id,
                      type: 'comment',
                      message: 'Ziņojums nosūtīts moderācijai.',
                      read: false,
                      createdAt: new Date(),
                    })
                    setShowReport(false)
                  } catch (err) {
                    addNotification({
                      id: `report-err-${Date.now()}`,
                      userId: user.id,
                      type: 'comment',
                      message: err instanceof Error ? err.message : 'Ziņojums neizdevās',
                      read: false,
                      createdAt: new Date(),
                    })
                  } finally {
                    setReportSubmitting(false)
                  }
                }}
              >
                {reportSubmitting ? 'Sūta…' : 'Nosūtīt'}
              </button>
            </div>
          </div>
        )}

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="space-y-3">
              {thread.replies?.map((comment: any) => {
                const commentAuthor = users.find(u => u.id === comment.authorId)
                return (
                  <div key={comment.id} className="flex items-start gap-3">
                    <img
                      src={commentAuthor?.avatar || `https://ui-avatars.com/api/?name=${commentAuthor?.displayName || 'Unknown'}&background=3b82f6&color=fff`}
                      alt={commentAuthor?.displayName || 'Unknown'}
                      className="w-9 h-9 rounded-xl object-cover shadow-dg-sm"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">{commentAuthor?.displayName || 'Unknown User'}</span>
                        <span className="text-xs text-gray-500">@{commentAuthor?.username || 'unknown'}</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">
                          {(() => {
                            try {
                              const date = new Date(comment.createdAt)
                              if (isNaN(date.getTime())) {
                                return 'Just now'
                              }
                              return formatDistanceToNow(date, { addSuffix: true })
                            } catch (error) {
                              return 'Just now'
                            }
                          })()}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{comment.content}</p>
                    </div>
                  </div>
                )
              })}
              
              {/* Add Comment Form */}
              {user && (
                <div className="flex items-start gap-3 pt-3">
                  <img
                    src={user.avatar || `https://ui-avatars.com/api/?name=${user.displayName}&background=3b82f6&color=fff`}
                    alt={user.displayName}
                    className="w-9 h-9 rounded-xl object-cover shadow-dg-sm"
                  />
                  <div className="flex-1">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      className="w-full p-3 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green-700 focus:border-brand-green-700 text-sm resize-none"
                      rows={2}
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <button
                        onClick={() => setShowComments(false)}
                        className="px-3 py-1 text-gray-500 hover:text-gray-700 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleComment}
                        disabled={!commentText.trim() || isSubmittingComment}
                        className="px-4 py-1 bg-brand-green-700 text-white rounded-lg hover:bg-brand-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {isSubmittingComment ? 'Posting...' : 'Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useUser } from '../../contexts/UserContext'
import { useThread } from '../../contexts/ThreadContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { formatDistanceToNow } from 'date-fns'
import { 
  HeartIcon,
  ChatBubbleLeftIcon,
  EllipsisHorizontalIcon,
  UserPlusIcon,
  UserMinusIcon,
  HandThumbDownIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartFilledIcon, HandThumbDownIcon as HandThumbDownFilledIcon } from '@heroicons/react/24/solid'
import SimpleCreateThread from './SimpleCreateThread'
import { INPUT_LIMITS, remainingChars } from '../../constants/inputLimits'

interface ThreadCardProps {
  thread: any
  isReply?: boolean
  onUserClick?: (userId: string) => void
}

export default function ThreadCard({ thread, isReply = false, onUserClick }: ThreadCardProps) {
  const { user, users, updateUser } = useUser()
  const { updateThread, deleteThread } = useThread()
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
  const [reportStatus, setReportStatus] = useState<'ok' | 'error' | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)

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
              credentials: 'include',
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
        throw new Error(data.error || 'Neizdevās atzīmēt patīk')
      }
    } catch (error) {
      console.error('Error liking thread:', error)
      alert('Neizdevās atzīmēt patīk. Lūdzu mēģini vēlreiz.')
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
              credentials: 'include',
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
        throw new Error(data.error || 'Neizdevās atzīmēt nepatīk')
      }
    } catch (error) {
      console.error('Error disliking thread:', error)
      alert('Neizdevās atzīmēt nepatīk. Lūdzu mēģini vēlreiz.')
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
        credentials: 'include',
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
      } else {
        throw new Error(data.error || 'Neizdevās sekot lietotājam')
      }
    } catch (error) {
      console.error('Error following user:', error)
      alert('Neizdevās sekot lietotājam. Lūdzu mēģini vēlreiz.')
    } finally {
      setIsFollowingUser(false)
    }
  }

  const handleDelete = async () => {
    if (!isOwnThread) return

    // Ask for confirmation before deleting
    if (!confirm('Vai tiešām vēlies dzēst šo domu?')) {
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
        alert(data.error || 'Neizdevās dzēst domu')
      }
    } catch (error) {
      console.error('Error deleting thread:', error)
      alert('Neizdevās dzēst domu. Lūdzu mēģini vēlreiz.')
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
              credentials: 'include',
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
      displayName: 'Nezināms lietotājs',
      email: 'unknown@example.com',
      avatar: `https://ui-avatars.com/api/?name=Unknown&background=gray&color=fff`,
      bio: '',
      followers: [],
      following: [],
      createdAt: new Date()
    }
    console.log('Using fallback author:', author)
  }

  const relativeTime = (() => {
    try {
      const date = new Date(thread.createdAt)
      if (isNaN(date.getTime())) return 'tagad'
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return 'tagad'
    }
  })()

  return (
    <div id={`thread-${thread.id}`} className={`${isReply ? 'ml-8 border-l border-border-ui' : ''}`}>
      <div className="p-4 sm:p-5 bg-surface-2 border border-border-ui rounded-2xl shadow-dg-sm hover:shadow-dg-md transition-shadow duration-200">
        {/* Thread Header */}
        <div className="flex items-start gap-3 mb-3">
          <img
            src={author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.displayName || 'U')}&background=2d5a2d&color=fff&bold=true`}
            alt={author.displayName}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover cursor-pointer ring-2 ring-white shadow-dg-sm hover:opacity-90 transition-opacity flex-shrink-0"
            onClick={() => onUserClick?.(author.id)}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <h3
                className="font-semibold text-ink truncate text-[15px] cursor-pointer hover:text-accent leading-tight"
                onClick={() => onUserClick?.(author.id)}
              >
                {author.displayName}
              </h3>
              <span className="text-[13px] text-ink-muted/60 flex-shrink-0">·</span>
              <span className="text-[13px] text-ink-muted whitespace-nowrap flex-shrink-0">
                {relativeTime}
              </span>
            </div>
            <p className="text-[13px] text-ink-muted truncate leading-tight">
              @{author.username}
            </p>
          </div>

          {!isOwnThread && (
            <button
              onClick={handleFollow}
              disabled={isFollowingUser}
              className={`flex-shrink-0 inline-flex items-center justify-center h-8 px-3 rounded-full text-[12px] font-semibold transition-all ${
                isFollowing
                  ? 'bg-surface text-ink hover:bg-border-ui border border-border-ui'
                  : 'bg-accent text-accent-fg hover:bg-accent-hover'
              } ${isFollowingUser ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isFollowingUser ? (
                <div className="w-3.5 h-3.5 animate-spin border-2 border-current border-t-transparent rounded-full" />
              ) : isFollowing ? 'Seko' : 'Sekot'}
            </button>
          )}

          {isOwnThread && (
            <div className="relative flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowOptions(!showOptions)
                }}
                aria-label="Vairāk"
                className="inline-flex items-center justify-center w-8 h-8 -mr-1 -mt-1 rounded-full text-ink-muted hover:bg-surface active:bg-border-ui transition-colors"
              >
                <EllipsisHorizontalIcon className="w-5 h-5" />
              </button>

              {showOptions && (
                <div
                  className="absolute right-0 top-9 min-w-[140px] bg-surface-2 border border-border-ui rounded-xl shadow-lg z-10 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleDelete}
                    className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 font-medium"
                  >
                    Dzēst
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Thread Content */}
        <div className="text-ink text-[15px] mb-3 whitespace-pre-wrap break-words leading-relaxed">
          {thread.content}
        </div>

        {/* Attachments */}
        {(() => {
          try {
            const attachments = typeof thread.attachments === 'string'
              ? JSON.parse(thread.attachments)
              : thread.attachments
            if (!Array.isArray(attachments) || attachments.length === 0) return null

            return (
              <div className="mb-3 -mx-1">
                <div className={`grid gap-1.5 ${attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {attachments.map((attachment: string, index: number) => (
                    <div
                      key={index}
                      className="relative overflow-hidden rounded-xl border border-border-ui bg-surface"
                    >
                      <img
                        src={attachment}
                        alt={`Pielikums ${index + 1}`}
                        loading="lazy"
                        className="w-full h-auto max-h-[400px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                        onClick={() => window.open(attachment, '_blank')}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          } catch {
            return null
          }
        })()}

        {/* Thread Actions — evenly spaced on mobile */}
        <div className="flex items-center justify-between sm:justify-start sm:gap-6 text-ink-muted pt-1">
          <button
            onClick={handleLike}
            disabled={isLiking}
            aria-label="Patīk"
            className={`inline-flex items-center gap-1.5 h-8 px-1 rounded-lg transition-colors ${
              isLiked ? 'text-red-500' : 'hover:text-red-500'
            }`}
          >
            {isLiked ? <HeartFilledIcon className="w-5 h-5" /> : <HeartIcon className="w-5 h-5" />}
            <span className="text-[13px] font-medium tabular-nums">{(() => {
              try {
                const likes = typeof thread.likes === 'string' ? JSON.parse(thread.likes) : thread.likes
                return Array.isArray(likes) ? likes.length : 0
              } catch { return 0 }
            })()}</span>
          </button>

          <button
            onClick={handleDislike}
            disabled={isLiking}
            aria-label="Nepatīk"
            className={`inline-flex items-center gap-1.5 h-8 px-1 rounded-lg transition-colors ${
              isDisliked ? 'text-accent' : 'hover:text-accent'
            }`}
          >
            {isDisliked ? <HandThumbDownFilledIcon className="w-5 h-5" /> : <HandThumbDownIcon className="w-5 h-5" />}
            <span className="text-[13px] font-medium tabular-nums">{(() => {
              try {
                const dislikes = typeof thread.dislikes === 'string' ? JSON.parse(thread.dislikes) : thread.dislikes
                return Array.isArray(dislikes) ? dislikes.length : 0
              } catch { return 0 }
            })()}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            aria-label="Komentāri"
            className="inline-flex items-center gap-1.5 h-8 px-1 rounded-lg hover:text-accent transition-colors"
          >
            <ChatBubbleLeftIcon className="w-5 h-5" />
            <span className="text-[13px] font-medium tabular-nums">{thread.replies?.length || 0}</span>
          </button>

          {user && !isOwnThread && (
            <button
              type="button"
              onClick={() => {
                setReportReason('')
                setReportStatus(null)
                setReportError(null)
                setShowReport(true)
              }}
              aria-label="Ziņot"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-ink-muted hover:text-amber-700 hover:bg-amber-50 transition-colors"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 21V4" />
                <path d="M4 4h11l-1.5 4 1.5 4H4" />
              </svg>
            </button>
          )}
        </div>

        {showReport && user && (
          <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
            <p className="text-sm font-medium text-amber-500">Ziņot par ierakstu</p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Īss iemesls (neobligāti)"
              className="w-full rounded-lg border border-amber-500/30 p-2 text-sm bg-surface-2 text-ink placeholder-ink-muted/70"
              rows={2}
              maxLength={500}
            />
            {reportStatus === 'ok' && (
              <p className="text-sm text-emerald-500">Ziņojums nosūtīts moderācijai.</p>
            )}
            {reportStatus === 'error' && (
              <p className="text-sm text-red-500">{reportError || 'Ziņojums neizdevās'}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="px-3 py-1 text-sm text-ink-muted hover:text-ink"
                onClick={() => {
                  setShowReport(false)
                  setReportStatus(null)
                  setReportError(null)
                }}
              >
                Atcelt
              </button>
              <button
                type="button"
                disabled={reportSubmitting}
                className="px-3 py-1 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50"
                onClick={async () => {
                  setReportSubmitting(true)
                  setReportError(null)
                  setReportStatus(null)
                  try {
                    const res = await fetch('/api/reports', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ threadId: thread.id, reason: reportReason }),
                    })
                    const data = await res.json().catch(() => ({}))
                    if (!res.ok) throw new Error(data.error || 'Neizdevās nosūtīt')
                    setReportStatus('ok')
                    setTimeout(() => {
                      setShowReport(false)
                      setReportReason('')
                      setReportStatus(null)
                    }, 1500)
                  } catch (err) {
                    setReportStatus('error')
                    setReportError(err instanceof Error ? err.message : 'Ziņojums neizdevās')
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
          <div className="mt-4 pt-4 border-t border-border-ui">
            <div className="space-y-3">
              {thread.replies?.map((comment: any) => {
                // Priekšroka iestrādātajam autoram no backend (piem., tikko reģistrēts
                // lietotājs vēl nebūs `users` sarakstā, kas tiek ielādēts vienreiz).
                const commentAuthor = comment.author || users.find(u => u.id === comment.authorId)
                return (
                  <div key={comment.id} className="flex items-start gap-3">
                    <img
                      src={commentAuthor?.avatar || `https://ui-avatars.com/api/?name=${commentAuthor?.displayName || 'Unknown'}&background=3b82f6&color=fff`}
                      alt={commentAuthor?.displayName || 'Unknown'}
                      className="w-9 h-9 rounded-xl object-cover shadow-dg-sm"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-ink text-sm">{commentAuthor?.displayName || 'Nezināms lietotājs'}</span>
                        <span className="text-xs text-ink-muted">@{commentAuthor?.username || 'unknown'}</span>
                        <span className="text-xs text-ink-muted/60">·</span>
                        <span className="text-xs text-ink-muted">
                          {(() => {
                            try {
                              const date = new Date(comment.createdAt)
                              if (isNaN(date.getTime())) {
                                return 'tikko'
                              }
                              return formatDistanceToNow(date, { addSuffix: true })
                            } catch (error) {
                              return 'tikko'
                            }
                          })()}
                        </span>
                      </div>
                      <p className="text-ink/90 text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                        {comment.content}
                      </p>
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
                      placeholder="Raksti komentāru..."
                      className="w-full p-3 bg-surface-2 text-ink border border-border-ui rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sm resize-none"
                      rows={2}
                      maxLength={INPUT_LIMITS.commentContent}
                    />
                    <div className="mt-1 text-right text-xs text-ink-muted">
                      {remainingChars(INPUT_LIMITS.commentContent, commentText)} atlikuši
                    </div>
                    <div className="flex justify-end space-x-2 mt-2">
                      <button
                        onClick={() => setShowComments(false)}
                        className="px-3 py-1 text-ink-muted hover:text-ink text-sm"
                      >
                        Atcelt
                      </button>
                      <button
                        onClick={handleComment}
                        disabled={!commentText.trim() || isSubmittingComment}
                        className="px-4 py-1 bg-accent text-accent-fg rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {isSubmittingComment ? 'Publicē...' : 'Atbildēt'}
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
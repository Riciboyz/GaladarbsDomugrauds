'use client'

import { useState } from 'react'
import { useApp } from '../providers'
import { formatDistanceToNow } from 'date-fns'
import { 
  HeartIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  EllipsisHorizontalIcon,
  UserPlusIcon,
  UserMinusIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartFilledIcon } from '@heroicons/react/24/solid'
import CreateThread from './CreateThread'

interface ThreadCardProps {
  thread: any
  isReply?: boolean
}

export default function ThreadCard({ thread, isReply = false }: ThreadCardProps) {
  const { user, users, updateThread, addNotification, updateUser } = useApp()
  const [showReplies, setShowReplies] = useState(false)
  const [showCreateReply, setShowCreateReply] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  const author = users.find(u => u.id === thread.authorId)
  const isLiked = user && thread.likes.includes(user.id)
  const isDisliked = user && thread.dislikes.includes(user.id)
  const isFollowing = user && author && user.following.includes(author.id)
  const isOwnThread = user && thread.authorId === user.id

  const handleLike = () => {
    if (!user || !author) return

    const updates: any = {}
    
    if (isLiked) {
      updates.likes = thread.likes.filter((id: string) => id !== user.id)
    } else {
      updates.likes = [...thread.likes, user.id]
      if (isDisliked) {
        updates.dislikes = thread.dislikes.filter((id: string) => id !== user.id)
      }
    }

    updateThread(thread.id, updates)

    // Add notification
    if (!isLiked && !isOwnThread) {
      addNotification({
        id: Math.random().toString(),
        userId: author.id,
        type: 'like',
        message: `${user.displayName} liked your thread`,
        read: false,
        createdAt: new Date(),
        relatedId: thread.id,
      })
    }
  }

  const handleDislike = () => {
    if (!user || !author) return

    const updates: any = {}
    
    if (isDisliked) {
      updates.dislikes = thread.dislikes.filter((id: string) => id !== user.id)
    } else {
      updates.dislikes = [...thread.dislikes, user.id]
      if (isLiked) {
        updates.likes = thread.likes.filter((id: string) => id !== user.id)
      }
    }

    updateThread(thread.id, updates)
  }

  const handleFollow = () => {
    if (!user || !author || isOwnThread) return

    const updates: any = {}
    
    if (isFollowing) {
      updates.following = user.following.filter((id: string) => id !== author.id)
      // Remove from author's followers
      updateUser(author.id, {
        followers: author.followers.filter((id: string) => id !== user.id)
      })
    } else {
      updates.following = [...user.following, author.id]
      // Add to author's followers
      updateUser(author.id, {
        followers: [...author.followers, user.id]
      })

      // Add notification
      addNotification({
        id: Math.random().toString(),
        userId: author.id,
        type: 'follow',
        message: `${user.displayName} started following you`,
        read: false,
        createdAt: new Date(),
      })
    }

    updateUser(user.id, updates)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Thread by ${author?.displayName}`,
        text: thread.content,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      // You could add a toast notification here
    }
  }

  if (!author) return null

  return (
    <div className={`bg-white rounded-xl border border-secondary-200 hover:shadow-md transition-all duration-300 hover-lift animate-fade-in ${isReply ? 'ml-8 border-l-4 border-l-primary-200' : ''}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <img
              src={author.avatar || 'https://via.placeholder.com/40'}
              alt={author.displayName}
              className="h-10 w-10 rounded-full object-cover"
            />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-secondary-900">{author.displayName}</h3>
                <span className="text-secondary-500">@{author.username}</span>
                <span className="text-secondary-400">·</span>
                <span className="text-secondary-500 text-sm">
                  {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                </span>
              </div>
              {author.bio && (
                <p className="text-sm text-secondary-600 mt-1">{author.bio}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isOwnThread && (
              <button
                onClick={handleFollow}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  isFollowing
                    ? 'bg-secondary-200 text-secondary-700 hover:bg-secondary-300'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserMinusIcon className="h-4 w-4 inline mr-1" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="h-4 w-4 inline mr-1" />
                    Follow
                  </>
                )}
              </button>
            )}
            
            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
              >
                <EllipsisHorizontalIcon className="h-5 w-5 text-secondary-500" />
              </button>
              
              {showOptions && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-secondary-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={handleShare}
                    className="w-full px-4 py-2 text-left text-sm text-secondary-700 hover:bg-secondary-50 rounded-lg"
                  >
                    Share Thread
                  </button>
                  {isOwnThread && (
                    <button
                      onClick={() => {
                        // Handle delete
                        setShowOptions(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Delete Thread
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className="text-secondary-900 whitespace-pre-wrap">{thread.content}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-secondary-100">
          <div className="flex items-center space-x-6">
            {/* Like/Dislike */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleLike}
                className={`flex items-center space-x-1 px-3 py-1 rounded-full transition-colors ${
                  isLiked
                    ? 'bg-red-50 text-red-600'
                    : 'text-secondary-500 hover:bg-secondary-100'
                }`}
              >
                {isLiked ? (
                  <HeartFilledIcon className="h-4 w-4" />
                ) : (
                  <HeartIcon className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">{thread.likes.length}</span>
              </button>
              
              <button
                onClick={handleDislike}
                className={`flex items-center space-x-1 px-3 py-1 rounded-full transition-colors ${
                  isDisliked
                    ? 'bg-gray-100 text-gray-600'
                    : 'text-secondary-500 hover:bg-secondary-100'
                }`}
              >
                <span className="text-sm">👎</span>
                <span className="text-sm font-medium">{thread.dislikes.length}</span>
              </button>
            </div>

            {/* Comments */}
            <button
              onClick={() => setShowCreateReply(true)}
              className="flex items-center space-x-1 px-3 py-1 text-secondary-500 hover:bg-secondary-100 rounded-full transition-colors"
            >
              <ChatBubbleLeftIcon className="h-4 w-4" />
              <span className="text-sm font-medium">{thread.comments.length}</span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center space-x-1 px-3 py-1 text-secondary-500 hover:bg-secondary-100 rounded-full transition-colors"
            >
              <ShareIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Thread indicator */}
          {thread.replies.length > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {showReplies ? 'Hide' : 'Show'} {thread.replies.length} replies
            </button>
          )}
        </div>

        {/* Replies */}
        {showReplies && thread.replies.length > 0 && (
          <div className="mt-4 space-y-3">
            {thread.replies.map((reply: any) => (
              <ThreadCard key={reply.id} thread={reply} isReply={true} />
            ))}
          </div>
        )}
      </div>

      {/* Create Reply Modal */}
      {showCreateReply && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Reply to Thread</h3>
              <CreateThread 
                onClose={() => setShowCreateReply(false)} 
                parentId={thread.id}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

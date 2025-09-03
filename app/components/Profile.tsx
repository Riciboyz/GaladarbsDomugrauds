'use client'

import { useState } from 'react'
import { useApp } from '../providers'
import ThreadCard from './ThreadCard'
import { 
  UserIcon,
  CalendarIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  UserGroupIcon,
  PencilIcon,
  CameraIcon
} from '@heroicons/react/24/outline'

interface ProfileProps {
  userId?: string
}

export default function Profile({ userId }: ProfileProps) {
  const { user, users, threads, updateUser } = useApp()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    displayName: '',
    bio: '',
    username: ''
  })

  const profileUser = userId ? users.find(u => u.id === userId) : user
  const isOwnProfile = user && profileUser && user.id === profileUser.id
  const isFollowing = user && profileUser && user.following.includes(profileUser.id)

  const userThreads = threads.filter(thread => thread.authorId === profileUser?.id)
  const totalLikes = userThreads.reduce((sum, thread) => sum + thread.likes.length, 0)
  const totalComments = userThreads.reduce((sum, thread) => sum + thread.comments.length, 0)

  const handleFollow = () => {
    if (!user || !profileUser || isOwnProfile) return

    const updates: any = {}
    
    if (isFollowing) {
      updates.following = user.following.filter((id: string) => id !== profileUser.id)
      // Remove from profile user's followers
      updateUser(profileUser.id, {
        followers: profileUser.followers.filter((id: string) => id !== user.id)
      })
    } else {
      updates.following = [...user.following, profileUser.id]
      // Add to profile user's followers
      updateUser(profileUser.id, {
        followers: [...profileUser.followers, user.id]
      })
    }

    updateUser(user.id, updates)
  }

  const handleEdit = () => {
    if (!profileUser) return
    setEditData({
      displayName: profileUser.displayName,
      bio: profileUser.bio || '',
      username: profileUser.username
    })
    setIsEditing(true)
  }

  const handleSave = () => {
    if (!profileUser) return
    
    updateUser(profileUser.id, editData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  if (!profileUser) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-secondary-900 mb-2">User not found</h2>
          <p className="text-secondary-500">The user you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-secondary-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={profileUser.avatar || 'https://via.placeholder.com/120'}
                alt={profileUser.displayName}
                className="h-24 w-24 rounded-full object-cover"
              />
              {isOwnProfile && (
                <button className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700 transition-colors">
                  <CameraIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <div>
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editData.displayName}
                    onChange={(e) => setEditData(prev => ({ ...prev, displayName: e.target.value }))}
                    className="text-xl font-bold text-secondary-900 bg-transparent border-b border-secondary-300 focus:outline-none focus:border-primary-500"
                    placeholder="Display Name"
                  />
                  <input
                    type="text"
                    value={editData.username}
                    onChange={(e) => setEditData(prev => ({ ...prev, username: e.target.value }))}
                    className="text-secondary-500 bg-transparent border-b border-secondary-300 focus:outline-none focus:border-primary-500"
                    placeholder="Username"
                  />
                  <textarea
                    value={editData.bio}
                    onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                    className="text-secondary-600 bg-transparent border-b border-secondary-300 focus:outline-none focus:border-primary-500 resize-none"
                    placeholder="Bio"
                    rows={2}
                  />
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-bold text-secondary-900">{profileUser.displayName}</h1>
                  <p className="text-secondary-500">@{profileUser.username}</p>
                  {profileUser.bio && (
                    <p className="text-secondary-600 mt-2">{profileUser.bio}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Save
                </button>
              </>
            ) : (
              <>
                {isOwnProfile ? (
                  <button
                    onClick={handleEdit}
                    className="flex items-center space-x-2 px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 transition-colors"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <button
                    onClick={handleFollow}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      isFollowing
                        ? 'bg-secondary-200 text-secondary-700 hover:bg-secondary-300'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-secondary-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-secondary-900">{userThreads.length}</p>
            <p className="text-sm text-secondary-500">Threads</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-secondary-900">{profileUser.followers.length}</p>
            <p className="text-sm text-secondary-500">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-secondary-900">{profileUser.following.length}</p>
            <p className="text-sm text-secondary-500">Following</p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-secondary-100 mt-4">
          <div className="flex items-center space-x-2">
            <HeartIcon className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-lg font-semibold text-secondary-900">{totalLikes}</p>
              <p className="text-sm text-secondary-500">Total Likes</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ChatBubbleLeftIcon className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-lg font-semibold text-secondary-900">{totalComments}</p>
              <p className="text-sm text-secondary-500">Total Comments</p>
            </div>
          </div>
        </div>

        {/* Join Date */}
        <div className="flex items-center space-x-2 pt-4 border-t border-secondary-100 mt-4">
          <CalendarIcon className="h-5 w-5 text-secondary-400" />
          <p className="text-sm text-secondary-500">
            Joined {new Date(profileUser.createdAt).toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {/* Threads */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-secondary-900">Threads</h2>
          <div className="flex items-center space-x-2 text-sm text-secondary-500">
            <UserIcon className="h-4 w-4" />
            <span>{userThreads.length} threads</span>
          </div>
        </div>

        {userThreads.length === 0 ? (
          <div className="bg-white rounded-xl border border-secondary-200 p-8 text-center">
            <UserIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              No threads yet
            </h3>
            <p className="text-secondary-500">
              {isOwnProfile 
                ? "You haven't posted any threads yet. Start sharing your thoughts!"
                : `${profileUser.displayName} hasn't posted any threads yet.`
              }
            </p>
          </div>
        ) : (
          userThreads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} />
          ))
        )}
      </div>
    </div>
  )
}

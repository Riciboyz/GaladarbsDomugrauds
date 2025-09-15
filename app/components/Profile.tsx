'use client'

import { useState } from 'react'
import { useUser } from '../contexts/UserContext'
import { useThread } from '../contexts/ThreadContext'
import { useToast } from '../contexts/ToastContext'
import ThreadCard from './ThreadCard'
import { 
  UserIcon,
  CalendarIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  UserGroupIcon,
  PencilIcon,
  CameraIcon,
  XMarkIcon,
  UserPlusIcon,
  UserMinusIcon,
  MapPinIcon,
  LinkIcon
} from '@heroicons/react/24/outline'

interface ProfileProps {
  userId?: string
}

export default function Profile({ userId }: ProfileProps) {
  const { user, users, updateUser } = useUser()
  const { threads } = useThread()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    displayName: '',
    bio: '',
    username: '',
    avatar: ''
  })
  const [avatarPreview, setAvatarPreview] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)

  const profileUser = userId ? users.find(u => u.id === userId) : user
  const isOwnProfile = user && profileUser && user.id === profileUser.id
  const isFollowing = user && profileUser && user.following.includes(profileUser.id)

  const userThreads = threads.filter(thread => thread.authorId === profileUser?.id)
  const totalLikes = userThreads.reduce((sum, thread) => sum + thread.likes.length, 0)
  const totalComments = userThreads.reduce((sum, thread) => sum + thread.comments.length, 0)

  const handleEdit = () => {
    if (profileUser) {
      setEditData({
        displayName: profileUser.displayName || '',
        bio: profileUser.bio || '',
        username: profileUser.username || '',
        avatar: profileUser.avatar || ''
      })
      setAvatarPreview(profileUser.avatar || '')
      setIsEditing(true)
    }
  }

  const handleSave = async () => {
    if (!profileUser || !user) return

    setIsUploading(true)
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: editData.username,
          displayName: editData.displayName,
          bio: editData.bio,
          avatar: editData.avatar
        }),
      })

      const data = await response.json()
      if (response.ok) {
        updateUser(data.user)
        setIsEditing(false)
        setAvatarPreview('')
      } else {
        console.error('Error updating profile:', data.error)
        alert(data.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    } finally {
      setIsUploading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
        return
      }
      
      setIsUploading(true)
      
      try {
        // Upload file to server
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        
        const data = await response.json()
        
        if (response.ok && data.success) {
          // Update with the server URL
          setAvatarPreview(data.url)
          setEditData(prev => ({ ...prev, avatar: data.url }))
        } else {
          alert(data.error || 'Failed to upload image')
        }
      } catch (error) {
        console.error('Error uploading image:', error)
        alert('Failed to upload image')
      } finally {
        setIsUploading(false)
      }
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarPreview('')
    setEditData(prev => ({ ...prev, avatar: '' }))
  }

  const handleFollow = async () => {
    if (!user || !profileUser) return

    try {
      const action = isFollowing ? 'unfollow' : 'follow'
      const response = await fetch('/api/users/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: profileUser.id, 
          action: action
        }),
      })
      
      const data = await response.json()
      if (response.ok) {
        // Update the profile user in the users list
        const updatedUsers = users.map(u => 
          u.id === profileUser.id ? data.targetUser : u
        )
        // Update both current user and users list
        updateUser(data.currentUser, updatedUsers)
      } else {
        console.error('Follow API error:', data)
        alert(data.error || 'Failed to follow user')
      }
    } catch (error) {
      console.error('Error following user:', error)
      alert('Failed to follow user. Please try again.')
    }
  }

  if (!profileUser) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-12 text-center">
          <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="heading-3 text-gray-900 mb-2">User not found</h3>
          <p className="body-regular text-gray-600">This profile doesn't exist or has been removed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Ultra-Minimal Profile Header */}
      <div className="card-elevated mb-6">
        <div className="p-6">
          {/* Profile Info */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              <img
                src={profileUser.avatar || `https://ui-avatars.com/api/?name=${profileUser.displayName}&background=3b82f6&color=fff`}
                alt={profileUser.displayName}
                className="w-16 h-16 rounded-xl object-cover"
              />
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <h1 className="heading-2 text-gray-900">{profileUser.displayName}</h1>
                  {(profileUser as any).verified && (
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-2">@{profileUser.username}</p>
                {profileUser.bio && (
                  <p className="body-regular text-gray-700 mb-3">{profileUser.bio}</p>
                )}
                
                {/* Additional Info */}
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Joined {new Date(profileUser.createdAt).toLocaleDateString()}</span>
                  </div>
                  {(profileUser as any).location && (
                    <div className="flex items-center space-x-1">
                      <MapPinIcon className="w-4 h-4" />
                      <span>{(profileUser as any).location}</span>
                    </div>
                  )}
                  {(profileUser as any).website && (
                    <div className="flex items-center space-x-1">
                      <LinkIcon className="w-4 h-4" />
                      <a href={(profileUser as any).website} className="text-blue-600 hover:underline">
                        {(profileUser as any).website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {isOwnProfile ? (
                <button
                  onClick={handleEdit}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <PencilIcon className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <button
                  onClick={handleFollow}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                    isFollowing
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'btn-primary'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserMinusIcon className="w-4 h-4" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlusIcon className="w-4 h-4" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowFollowers(true)}
              className="flex items-center space-x-2 hover:text-blue-600 transition-colors duration-200"
            >
              <span className="heading-4 text-gray-900">{profileUser.followers?.length || 0}</span>
              <span className="body-regular text-gray-600">Followers</span>
            </button>
            <button
              onClick={() => setShowFollowing(true)}
              className="flex items-center space-x-2 hover:text-blue-600 transition-colors duration-200"
            >
              <span className="heading-4 text-gray-900">{profileUser.following?.length || 0}</span>
              <span className="body-regular text-gray-600">Following</span>
            </button>
            <div className="flex items-center space-x-2">
              <span className="heading-4 text-gray-900">{userThreads.length}</span>
              <span className="body-regular text-gray-600">Threads</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="heading-4 text-gray-900">{totalLikes}</span>
              <span className="body-regular text-gray-600">Likes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-elevated w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="heading-3 text-gray-900">Edit Profile</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="btn-icon"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Profile Picture Upload */}
              <div className="flex items-center space-x-4">
                <div className="relative group">
                  <div className="relative">
                    <img
                      src={avatarPreview || `https://ui-avatars.com/api/?name=${editData.displayName}&background=3b82f6&color=fff`}
                      alt="Profile preview"
                      className="w-20 h-20 rounded-xl object-cover border-2 border-gray-200 cursor-pointer"
                      onClick={() => {
                        document.getElementById('avatar-upload')?.click()
                      }}
                    />
                    {isUploading && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-xl flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="avatar-upload"
                    disabled={isUploading}
                  />
                  <label 
                    htmlFor="avatar-upload"
                    className={`absolute inset-0 bg-black bg-opacity-50 rounded-xl flex items-center justify-center cursor-pointer hover:bg-opacity-60 transition-all duration-200 group-hover:opacity-100 opacity-0 ${isUploading ? 'pointer-events-none' : ''}`}
                  >
                    <CameraIcon className="w-6 h-6 text-white" />
                  </label>
                  {avatarPreview && !isUploading && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors duration-200"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <label htmlFor="avatar-upload" className="block text-sm font-medium text-gray-700 mb-1">
                    Profile Picture
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Click on the image or camera icon to upload (max 5MB)</p>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="text-xs text-red-600 hover:text-red-700 transition-colors duration-200"
                    >
                      Remove image
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
                <input
                  type="text"
                  value={editData.displayName}
                  onChange={(e) => setEditData(prev => ({ ...prev, displayName: e.target.value }))}
                  className="input"
                  placeholder="Enter your display name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  value={editData.username}
                  onChange={(e) => setEditData(prev => ({ ...prev, username: e.target.value }))}
                  className="input"
                  placeholder="Enter your username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                <textarea
                  value={editData.bio}
                  onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                  className="input-textarea h-24"
                  placeholder="Tell us about yourself..."
                  maxLength={160}
                />
                <p className="text-xs text-gray-500 mt-1">{editData.bio.length}/160</p>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isUploading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Followers Modal */}
      {showFollowers && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-elevated w-full max-w-md max-h-96 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="heading-3 text-gray-900">Followers</h3>
              <button
                onClick={() => setShowFollowers(false)}
                className="btn-icon"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-80">
              {profileUser.followers?.map((followerId: string) => {
                const follower = users.find(u => u.id === followerId)
                if (!follower) return null
                return (
                  <div key={followerId} className="flex items-center space-x-3 p-4 hover:bg-gray-50 transition-colors duration-200">
                    <img
                      src={follower.avatar || `https://ui-avatars.com/api/?name=${follower.displayName}&background=3b82f6&color=fff`}
                      alt={follower.displayName}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate text-sm">{follower.displayName}</p>
                      <p className="text-xs text-gray-500">@{follower.username}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-elevated w-full max-w-md max-h-96 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="heading-3 text-gray-900">Following</h3>
              <button
                onClick={() => setShowFollowing(false)}
                className="btn-icon"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-80">
              {profileUser.following?.map((followingId: string) => {
                const following = users.find(u => u.id === followingId)
                if (!following) return null
                return (
                  <div key={followingId} className="flex items-center space-x-3 p-4 hover:bg-gray-50 transition-colors duration-200">
                    <img
                      src={following.avatar || `https://ui-avatars.com/api/?name=${following.displayName}&background=3b82f6&color=fff`}
                      alt={following.displayName}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate text-sm">{following.displayName}</p>
                      <p className="text-xs text-gray-500">@{following.username}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* User Threads */}
      <div className="space-y-4">
        {userThreads.length === 0 ? (
          <div className="card p-12 text-center">
            <ChatBubbleLeftIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="heading-3 text-gray-900 mb-2">No threads yet</h3>
            <p className="body-regular text-gray-600">
              {isOwnProfile ? "You haven't posted any threads yet." : `${profileUser.displayName} hasn't posted any threads yet.`}
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
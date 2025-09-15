'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import { useUser } from '../contexts/UserContext'
import { useThread } from '../contexts/ThreadContext'
import { useToast } from '../contexts/ToastContext'
import { useWebSocket } from '../contexts/WebSocketContext'
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
  onBack?: () => void
}

export default function Profile({ userId, onBack }: ProfileProps) {
  const { user, users, updateUser } = useUser()
  const { threads } = useThread()
  const { lastMessage } = useWebSocket()
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
  const [followers, setFollowers] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])
  const [loadingFollowers, setLoadingFollowers] = useState(false)
  const [loadingFollowing, setLoadingFollowing] = useState(false)

  const profileUser = userId ? users.find(u => u.id === userId) : user
  const isOwnProfile = user && profileUser && user.id === profileUser.id
  const isFollowing = user && profileUser && user.following.includes(profileUser.id)

  const userThreads = threads.filter(thread => thread.authorId === profileUser?.id)
  const totalLikes = userThreads.reduce((sum, thread) => sum + thread.likes.length, 0)
  const totalComments = userThreads.reduce((sum, thread) => sum + thread.comments.length, 0)

  // Load initial data when profile user changes
  useEffect(() => {
    if (profileUser) {
      loadFollowers()
      loadFollowing()
    }
  }, [profileUser?.id])

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

  const loadFollowers = async () => {
    if (!profileUser) return
    
    setLoadingFollowers(true)
    try {
      const response = await fetch(`/api/users/followers?userId=${profileUser.id}`)
      const data = await response.json()
      
      if (data.success) {
        setFollowers(data.followers)
      } else {
        console.error('Error loading followers:', data.error)
      }
    } catch (error) {
      console.error('Error loading followers:', error)
    } finally {
      setLoadingFollowers(false)
    }
  }

  const loadFollowing = async () => {
    if (!profileUser) return
    
    setLoadingFollowing(true)
    try {
      const response = await fetch(`/api/users/following?userId=${profileUser.id}`)
      const data = await response.json()
      
      if (data.success) {
        setFollowing(data.following)
      } else {
        console.error('Error loading following:', data.error)
      }
    } catch (error) {
      console.error('Error loading following:', error)
    } finally {
      setLoadingFollowing(false)
    }
  }

  // Listen for WebSocket follow updates
  useEffect(() => {
    if (!lastMessage) return

    if (lastMessage.type === 'follow_updated') {
      const { userId, followerId, action } = lastMessage.data
      
      // If this update affects the current profile user
      if (userId === profileUser?.id || followerId === profileUser?.id) {
        console.log('🔄 Real-time follow update received, refreshing lists...')
        // Refresh both lists
        loadFollowers()
        loadFollowing()
        
        // Also update the profile user data in context
        if (userId === profileUser?.id) {
          // Someone followed/unfollowed this profile user
          const updatedProfileUser = {
            ...profileUser,
            followers: action === 'follow' 
              ? [...(profileUser.followers || []), followerId]
              : (profileUser.followers || []).filter(id => id !== followerId)
          }
          updateUser(updatedProfileUser)
        }
      }
    }
  }, [lastMessage, profileUser, updateUser])

  const handleShowFollowers = () => {
    setShowFollowers(true)
    if (followers.length === 0) {
      loadFollowers()
    }
  }

  const handleShowFollowing = () => {
    setShowFollowing(true)
    if (following.length === 0) {
      loadFollowing()
    }
  }

  // Listen for WebSocket messages to refresh data
  React.useEffect(() => {
    if (lastMessage?.type === 'follow_updated' && profileUser) {
      const { userId: updatedUserId, followerId } = lastMessage.data
      if (updatedUserId === profileUser.id || followerId === profileUser.id) {
        // Refresh followers/following data when follow status changes
        if (showFollowers) {
          loadFollowers()
        }
        if (showFollowing) {
          loadFollowing()
        }
        
        // Also refresh counts even when modals are closed
        loadFollowers()
        loadFollowing()
      }
    }
  }, [lastMessage, profileUser, showFollowers, showFollowing])

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
        
        // Refresh followers/following data if modals are open
        if (showFollowers) {
          loadFollowers()
        }
        if (showFollowing) {
          loadFollowing()
        }
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
      {/* Back button for viewing other user's profile */}
      {onBack && (
        <div className="mb-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>
        </div>
      )}
      
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
              onClick={handleShowFollowers}
              className="flex items-center space-x-2 hover:text-blue-600 transition-colors duration-200"
            >
              <span className="heading-4 text-gray-900">{followers.length || profileUser.followers?.length || 0}</span>
              <span className="body-regular text-gray-600">Followers</span>
            </button>
            <button
              onClick={handleShowFollowing}
              className="flex items-center space-x-2 hover:text-blue-600 transition-colors duration-200"
            >
              <span className="heading-4 text-gray-900">{following.length || profileUser.following?.length || 0}</span>
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
              {loadingFollowers ? (
                <div className="flex items-center justify-center p-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-gray-600">Loading followers...</span>
                </div>
              ) : followers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No followers yet</p>
                </div>
              ) : (
                followers.map((follower) => {
                  const isFollowingFollower = user && user.following.includes(follower.id)
                  return (
                    <div key={follower.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors duration-200">
                      <div 
                        className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          // Close modal first
                          setShowFollowers(false)
                          // Navigate to user profile
                          if (typeof window !== 'undefined' && (window as any).navigateToUser) {
                            (window as any).navigateToUser(follower.id)
                          }
                        }}
                      >
                        <img
                          src={follower.avatar || `https://ui-avatars.com/api/?name=${follower.displayName}&background=3b82f6&color=fff`}
                          alt={follower.displayName}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate text-sm hover:text-blue-600">{follower.displayName}</p>
                          <p className="text-xs text-gray-500">@{follower.username}</p>
                        </div>
                      </div>
                      {!isOwnProfile && user && follower.id !== user.id && (
                        <button
                          onClick={async () => {
                            try {
                              const action = isFollowingFollower ? 'unfollow' : 'follow'
                              const response = await fetch('/api/users/follow', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                  userId: follower.id, 
                                  action: action
                                }),
                              })
                              
                              if (response.ok) {
                                const data = await response.json()
                                updateUser(data.currentUser)
                                // Refresh the lists
                                loadFollowers()
                                loadFollowing()
                              }
                            } catch (error) {
                              console.error('Error following user:', error)
                            }
                          }}
                          className={`px-3 py-1 text-xs rounded-full font-medium transition-colors duration-200 ${
                            isFollowingFollower
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {isFollowingFollower ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </div>
                  )
                })
              )}
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
              {loadingFollowing ? (
                <div className="flex items-center justify-center p-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-gray-600">Loading following...</span>
                </div>
              ) : following.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>Not following anyone yet</p>
                </div>
              ) : (
                following.map((followingUser) => (
                  <div key={followingUser.id} className="flex items-center space-x-3 p-4 hover:bg-gray-50 transition-colors duration-200">
                    <div 
                      className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        // Close modal first
                        setShowFollowing(false)
                        // Navigate to user profile
                        if (typeof window !== 'undefined' && (window as any).navigateToUser) {
                          (window as any).navigateToUser(followingUser.id)
                        }
                      }}
                    >
                      <img
                        src={followingUser.avatar || `https://ui-avatars.com/api/?name=${followingUser.displayName}&background=3b82f6&color=fff`}
                        alt={followingUser.displayName}
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate text-sm hover:text-blue-600">{followingUser.displayName}</p>
                        <p className="text-xs text-gray-500">@{followingUser.username}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
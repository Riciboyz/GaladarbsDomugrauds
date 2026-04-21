'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import { useUser } from '../../contexts/UserContext'
import { useThread } from '../../contexts/ThreadContext'
import { useToast } from '../../contexts/ToastContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import ThreadCard from '../threads/ThreadCard'
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
  onUserClick?: (userId: string) => void
}

export default function Profile({ userId, onBack, onUserClick }: ProfileProps) {
  const { user, users, updateUser, followUser, unfollowUser } = useUser()
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
  const [editError, setEditError] = useState<string | null>(null)
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [followers, setFollowers] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])
  const [loadingFollowers, setLoadingFollowers] = useState(false)
  const [loadingFollowing, setLoadingFollowing] = useState(false)

  const profileUser = userId ? users.find(u => u.id === userId) : user
  const isOwnProfile = user && profileUser && user.id === profileUser.id
  const isFollowing = user && profileUser && (user.following || []).includes(profileUser.id)

  const userThreads = threads.filter(thread => thread.authorId === profileUser?.id)
  const safeArrayLength = (value: any): number => {
    if (Array.isArray(value)) return value.length
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed.length : 0
      } catch {
        return 0
      }
    }
    return 0
  }

  const totalLikes = userThreads.reduce((sum, thread: any) => sum + safeArrayLength(thread.likes), 0)
  const totalComments = userThreads.reduce((sum, thread: any) => {
    // In this app replies are often used as comments; support both shapes safely
    return sum + safeArrayLength(thread.replies ?? thread.comments)
  }, 0)

  const joinedLabel = (() => {
    const raw = (profileUser as any)?.createdAt ?? (profileUser as any)?.created_at
    if (!raw) return null
    const d = raw instanceof Date ? raw : new Date(raw)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleDateString()
  })()

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
      setEditError(null)
      setIsEditing(true)
    }
  }

  const handleSave = async () => {
    if (!profileUser || !user) return

    setEditError(null)

    // Build diff payload: only send fields that actually changed so the
    // backend doesn't reject unchanged usernames (e.g. legacy emails that
    // wouldn't pass the new /^[a-zA-Z0-9_]+$/ rule).
    const payload: Record<string, unknown> = {}
    const trimmedUsername = (editData.username || '').trim()
    const trimmedDisplayName = (editData.displayName || '').trim()

    if (trimmedUsername !== (profileUser.username || '')) {
      if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
        setEditError('Lietotājvārdam jābūt no 3 līdz 30 rakstzīmēm')
        return
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
        setEditError('Lietotājvārds drīkst saturēt tikai burtus, ciparus un pasvītras')
        return
      }
      payload.username = trimmedUsername
    }
    if (trimmedDisplayName !== (profileUser.displayName || '')) {
      payload.displayName = trimmedDisplayName
    }
    if ((editData.bio || '') !== (profileUser.bio || '')) {
      payload.bio = editData.bio || ''
    }
    if ((editData.avatar || '') !== (profileUser.avatar || '')) {
      payload.avatar = editData.avatar || ''
    }

    if (Object.keys(payload).length === 0) {
      setIsEditing(false)
      setAvatarPreview('')
      return
    }

    setIsUploading(true)
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      // Guard against non-JSON (HTML error pages from proxy, empty 504 etc.)
      let data: any = null
      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (response.ok && data?.user) {
        updateUser(data.user)
        setIsEditing(false)
        setAvatarPreview('')
        return
      }

      if (response.status === 401 || response.status === 403) {
        setEditError('Sesija beigusies — lūdzu pieslēdzies vēlreiz')
        return
      }

      setEditError(data?.error || `Neizdevās saglabāt profilu (${response.status})`)
    } catch (error) {
      console.error('Error updating profile:', error)
      setEditError('Tīkla kļūda — pārbaudi savienojumu un mēģini vēlreiz')
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
          credentials: 'include',
          body: formData
        })
        
        const data = await response.json()
        
        if (response.ok && data.success) {
          // Defence in depth: normalise absolute URLs from older backend
          // builds to a relative `/uploads/...` path so the image is
          // reachable from any client (not just the uploader's machine).
          let url: string = data.url || ''
          if (/^https?:\/\//i.test(url)) {
            try {
              url = new URL(url).pathname
            } catch {
              /* leave as-is */
            }
          }
          setAvatarPreview(url)
          setEditData(prev => ({ ...prev, avatar: url }))
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
            ? [...(profileUser?.followers || []), followerId]
            : (profileUser?.followers || []).filter(id => id !== followerId)
          }
          updateUser(updatedProfileUser as any)
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
      const success = isFollowing
        ? await unfollowUser(profileUser.id)
        : await followUser(profileUser.id)

      if (!success) {
        alert('Failed to update follow status')
        return
      }

      if (showFollowers) {
        loadFollowers()
      }
      if (showFollowing) {
        loadFollowing()
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
          <UserIcon className="w-12 h-12 text-ink-muted/60 mx-auto mb-4" />
          <h3 className="heading-3 text-ink mb-2">User not found</h3>
          <p className="body-regular text-ink-muted">This profile doesn't exist or has been removed.</p>
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
            className="flex items-center space-x-2 text-ink-muted hover:text-ink transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>
        </div>
      )}
      
      {/* Profile Header — responsive: stacks on mobile, row on desktop */}
      <div className="bg-surface-2 rounded-2xl shadow-dg-sm border border-border-ui mb-6 overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
            <div className="flex items-start gap-4 min-w-0">
              <img
                src={profileUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser.displayName || profileUser.username || 'U')}&background=2d5a2d&color=fff&bold=true`}
                alt={profileUser.displayName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-surface-2 shadow-dg-sm flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h1 className="text-xl sm:text-2xl font-bold text-ink truncate tracking-tight">
                    {profileUser.displayName}
                  </h1>
                  {(profileUser as any).verified && (
                    <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-accent-fg text-[11px] font-bold leading-none">✓</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-ink-muted truncate">@{profileUser.username}</p>
                {profileUser.bio && (
                  <p className="text-[15px] text-ink mt-3 leading-relaxed break-words">
                    {profileUser.bio}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[13px] text-ink-muted">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Pievienojās {joinedLabel ?? '—'}</span>
                  </div>
                  {(profileUser as any).location && (
                    <div className="flex items-center gap-1.5">
                      <MapPinIcon className="w-4 h-4" />
                      <span>{(profileUser as any).location}</span>
                    </div>
                  )}
                  {(profileUser as any).website && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <LinkIcon className="w-4 h-4 flex-shrink-0" />
                      <a
                        href={(profileUser as any).website}
                        className="text-accent hover:underline truncate"
                      >
                        {(profileUser as any).website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action button — full-width on mobile, auto on sm+ */}
            <div className="flex sm:block sm:flex-shrink-0">
              {isOwnProfile ? (
                <button
                  onClick={handleEdit}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 h-10 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:bg-accent-hover transition-colors"
                >
                  <PencilIcon className="w-4 h-4" />
                  <span>Rediģēt profilu</span>
                </button>
              ) : (
                <button
                  onClick={handleFollow}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 h-10 rounded-xl text-sm font-semibold transition-colors ${
                    isFollowing
                      ? 'bg-surface text-ink border border-border-ui hover:bg-surface-2'
                      : 'bg-accent text-accent-fg hover:bg-accent-hover'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserMinusIcon className="w-4 h-4" />
                      <span>Seko</span>
                    </>
                  ) : (
                    <>
                      <UserPlusIcon className="w-4 h-4" />
                      <span>Sekot</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Stats — 4-col grid on mobile, row on desktop */}
          <div className="grid grid-cols-4 gap-2 pt-4 border-t border-border-ui">
            <button
              onClick={handleShowFollowers}
              className="flex flex-col items-center sm:flex-row sm:items-baseline sm:gap-1.5 py-1 rounded-lg hover:bg-surface transition-colors"
            >
              <span className="text-base sm:text-lg font-bold text-ink">
                {followers.length || profileUser.followers?.length || 0}
              </span>
              <span className="text-[11px] sm:text-sm text-ink-muted">Sekotāji</span>
            </button>
            <button
              onClick={handleShowFollowing}
              className="flex flex-col items-center sm:flex-row sm:items-baseline sm:gap-1.5 py-1 rounded-lg hover:bg-surface transition-colors"
            >
              <span className="text-base sm:text-lg font-bold text-ink">
                {following.length || profileUser.following?.length || 0}
              </span>
              <span className="text-[11px] sm:text-sm text-ink-muted">Seko</span>
            </button>
            <div className="flex flex-col items-center sm:flex-row sm:items-baseline sm:gap-1.5 py-1">
              <span className="text-base sm:text-lg font-bold text-ink">{userThreads.length}</span>
              <span className="text-[11px] sm:text-sm text-ink-muted">Ieraksti</span>
            </div>
            <div className="flex flex-col items-center sm:flex-row sm:items-baseline sm:gap-1.5 py-1">
              <span className="text-base sm:text-lg font-bold text-ink">{totalLikes}</span>
              <span className="text-[11px] sm:text-sm text-ink-muted">Patīk</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile — bottom-sheet on mobile, centered modal on sm+ */}
      {isEditing && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setIsEditing(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-2 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-[slideUp_0.25s_ease-out]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* Drag handle for mobile */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 rounded-full bg-border-ui" />
            </div>

            <div className="flex items-center justify-between px-5 sm:px-6 h-14 border-b border-border-ui flex-shrink-0">
              <h3 className="text-lg font-bold text-ink tracking-tight">Rediģēt profilu</h3>
              <button
                onClick={() => setIsEditing(false)}
                aria-label="Aizvērt"
                className="inline-flex items-center justify-center w-9 h-9 -mr-1 rounded-xl text-ink-muted hover:bg-surface active:bg-border-ui transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
              {/* Avatar uploader */}
              <div className="flex items-center gap-4">
                <div className="relative group flex-shrink-0">
                  <img
                    src={avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(editData.displayName || 'U')}&background=2d5a2d&color=fff&bold=true`}
                    alt="Profile preview"
                    className="w-20 h-20 rounded-2xl object-cover ring-2 ring-surface-2 shadow-dg-sm cursor-pointer"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                  />
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                    </div>
                  )}
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
                    className={`absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity ${isUploading ? 'pointer-events-none' : ''}`}
                  >
                    <CameraIcon className="w-6 h-6 text-white" />
                  </label>
                  {avatarPreview && !isUploading && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      aria-label="Noņemt attēlu"
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink mb-0.5">Profila attēls</p>
                  <p className="text-xs text-ink-muted leading-snug">
                    Nospied, lai augšupielādētu (max 5 MB)
                  </p>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="mt-1.5 text-xs text-red-500 hover:text-red-400 font-medium transition-colors"
                    >
                      Noņemt attēlu
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink-muted mb-1.5">Vārds</label>
                <input
                  type="text"
                  value={editData.displayName}
                  onChange={(e) => setEditData(prev => ({ ...prev, displayName: e.target.value }))}
                  className="input"
                  placeholder="Tavs redzamais vārds"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink-muted mb-1.5">Lietotājvārds</label>
                <input
                  type="text"
                  value={editData.username}
                  onChange={(e) => setEditData(prev => ({ ...prev, username: e.target.value }))}
                  className="input"
                  placeholder="lietotajvards"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink-muted mb-1.5">Bio</label>
                <textarea
                  value={editData.bio}
                  onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                  className="input-textarea h-24"
                  placeholder="Pastāsti par sevi..."
                  maxLength={160}
                />
                <p className="text-xs text-ink-muted mt-1 text-right">{editData.bio.length}/160</p>
              </div>

              {editError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500"
                >
                  {editError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 sm:px-6 py-4 border-t border-border-ui flex-shrink-0">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 h-10 rounded-xl text-ink hover:bg-surface active:bg-border-ui font-semibold text-sm transition-colors"
              >
                Atcelt
              </button>
              <button
                onClick={handleSave}
                disabled={isUploading}
                className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-accent text-accent-fg font-semibold text-sm hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saglabā...</span>
                  </>
                ) : (
                  <span>Saglabāt</span>
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
            <div className="flex items-center justify-between p-6 border-b border-border-ui">
              <h3 className="heading-3 text-ink">Followers</h3>
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
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-ink-muted">Loading followers...</span>
                </div>
              ) : followers.length === 0 ? (
                <div className="p-8 text-center text-ink-muted">
                  <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-ink-muted/60" />
                  <p>No followers yet</p>
                </div>
              ) : (
                followers.map((follower) => {
                  const isFollowingFollower = user && (user.following || []).includes(follower.id)
                  return (
                    <div key={follower.id} className="flex items-center justify-between p-4 hover:bg-surface transition-colors duration-200">
                      <div 
                        className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          setShowFollowers(false)
                          onUserClick?.(follower.id)
                        }}
                      >
                        <img
                          src={follower.avatar || `https://ui-avatars.com/api/?name=${follower.displayName}&background=3b82f6&color=fff`}
                          alt={follower.displayName}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-ink truncate text-sm hover:text-accent">{follower.displayName}</p>
                          <p className="text-xs text-ink-muted">@{follower.username}</p>
                        </div>
                      </div>
                      {!isOwnProfile && user && follower.id !== user.id && (
                        <button
                          onClick={async () => {
                            try {
                              const success = isFollowingFollower
                                ? await unfollowUser(follower.id)
                                : await followUser(follower.id)

                              if (success) {
                                loadFollowers()
                                loadFollowing()
                              }
                            } catch (error) {
                              console.error('Error following user:', error)
                            }
                          }}
                          className={`px-3 py-1 text-xs rounded-full font-medium transition-colors duration-200 ${
                            isFollowingFollower
                              ? 'bg-surface text-ink border border-border-ui hover:bg-surface-2'
                              : 'bg-accent text-accent-fg hover:bg-accent-hover'
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
            <div className="flex items-center justify-between p-6 border-b border-border-ui">
              <h3 className="heading-3 text-ink">Following</h3>
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
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-ink-muted">Loading following...</span>
                </div>
              ) : following.length === 0 ? (
                <div className="p-8 text-center text-ink-muted">
                  <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-ink-muted/60" />
                  <p>Not following anyone yet</p>
                </div>
              ) : (
                following.map((followingUser) => (
                  <div key={followingUser.id} className="flex items-center space-x-3 p-4 hover:bg-surface transition-colors duration-200">
                    <div 
                      className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        setShowFollowing(false)
                        onUserClick?.(followingUser.id)
                      }}
                    >
                      <img
                        src={followingUser.avatar || `https://ui-avatars.com/api/?name=${followingUser.displayName}&background=3b82f6&color=fff`}
                        alt={followingUser.displayName}
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink truncate text-sm hover:text-accent">{followingUser.displayName}</p>
                        <p className="text-xs text-ink-muted">@{followingUser.username}</p>
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
            <ChatBubbleLeftIcon className="w-12 h-12 text-ink-muted/60 mx-auto mb-4" />
            <h3 className="heading-3 text-ink mb-2">No threads yet</h3>
            <p className="body-regular text-ink-muted">
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
'use client'

import { useState, useEffect } from 'react'
import { useGroup, Group } from '../../contexts/GroupContext'
import { useUser } from '../../contexts/UserContext'
import { useToast } from '../../contexts/ToastContext'
import { 
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  UsersIcon,
  ChatBubbleLeftIcon,
  Cog6ToothIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline'
import GroupManagement from './GroupManagement'
import SimpleGroupChat from './SimpleGroupChat'

export default function Groups() {
  const { groups, createGroup, loadGroups, joinGroupRealtime, leaveGroupRealtime } = useGroup()
  const { user } = useUser()
  const { success, error: showError } = useToast()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [showManagement, setShowManagement] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: ''
  })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [groupToLeave, setGroupToLeave] = useState<Group | null>(null)
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'joined' | 'created'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('groups-active-tab') as any
      if (saved === 'all' || saved === 'joined' || saved === 'created') return saved
    }
    return 'all'
  })

  // Persist tab selection so refresh keeps the same view
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('groups-active-tab', activeTab)
    }
  }, [activeTab])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (openMenuId && !target.closest('[data-dropdown]')) {
        setOpenMenuId(null)
      }
    }

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])

  // Load groups on mount
  useEffect(() => {
    loadGroups()
  }, [])

  const allCount = groups.length
  const joinedCount = user ? groups.filter((g) => g.members?.includes(user.id)).length : 0
  const createdCount = user ? groups.filter(g => g.createdBy === user.id).length : 0

  const visibleGroups = groups
    .filter(group => {
      if (activeTab === 'all') {
        return true
      }
      if (activeTab === 'joined') {
        return !!user && group.members?.includes(user.id)
      }
      if (activeTab === 'created') {
        if (!user) return false
        return group.createdBy === user.id
      }
      return false
    })
    .filter(group =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroup.name.trim()) return

    try {
      await createGroup({
        ...newGroup,
        createdBy: user?.id
      })
      setNewGroup({ name: '', description: '' })
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating group:', error)
    }
  }

  const handleJoinGroup = async (group: any) => {
    if (!user) return

    try {
      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group.id })
      })

      const data = await response.json()
      
      if (response.ok) {
        success('Success', 'Successfully joined group!')
        // Join real-time group
        joinGroupRealtime(group.id)
        // Refresh groups and jump into chat of the joined group
        await loadGroups()
        const updated = groups.find(g => g.id === group.id) || group
        setSelectedGroup(updated)
        setShowChat(true)
        setActiveTab('joined')
      } else {
        throw new Error(data.error || 'Failed to join group')
      }
    } catch (error) {
      console.error('Error joining group:', error)
      showError('Error', 'Failed to join group. Please try again.')
    }
  }

  const handleLeaveGroup = (group: any) => {
    if (!user) return
    setGroupToLeave(group)
    setShowLeaveModal(true)
  }

  const confirmLeaveGroup = async () => {
    if (!groupToLeave || !user) return

    setLeaveLoading(true)
    try {
      const response = await fetch(`/api/groups/join?groupId=${groupToLeave.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()
      
      if (response.ok) {
        success('Success', 'Successfully left group!')
        // Leave real-time group
        leaveGroupRealtime(groupToLeave.id)
        setShowLeaveModal(false)
        setGroupToLeave(null)
        // Refresh groups
        loadGroups()
      } else {
        throw new Error(data.error || 'Failed to leave group')
      }
    } catch (error) {
      console.error('Error leaving group:', error)
      showError('Error', 'Failed to leave group. Please try again.')
    } finally {
      setLeaveLoading(false)
    }
  }

  const handleDeleteGroup = (group: any) => {
    if (!user || group.createdBy !== user.id) return
    setGroupToDelete(group)
    setShowDeleteModal(true)
  }

  const confirmDeleteGroup = async () => {
    if (!groupToDelete || !user) return

    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/groups?groupId=${groupToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()
      
      if (response.ok) {
        success('Success', 'Group deleted successfully!')
        setShowDeleteModal(false)
        setGroupToDelete(null)
        // Refresh groups by reloading from API
        loadGroups()
      } else {
        throw new Error(data.error || 'Failed to delete group')
      }
    } catch (error) {
      console.error('Error deleting group:', error)
      showError('Error', 'Failed to delete group. Please try again.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleOpenChat = (group: any) => {
    console.log('🔍 Groups: Opening chat for group:', group)
    console.log('🔍 Groups: Group ID:', group?.id)
    setSelectedGroup(group)
    setShowChat(true)
  }

  const handleOpenManagement = (group: any) => {
    setSelectedGroup(group)
    setShowManagement(true)
  }

  const handleGroupUpdate = () => {
    // Refresh groups by reloading from API
    loadGroups()
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Instagram/Twitter Style Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink mb-1 sm:mb-2">Groups</h1>
            <p className="text-sm sm:text-base text-ink-muted">Discover and join communities that interest you</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-accent text-accent-fg px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-semibold hover:bg-accent-hover transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-2 shadow-lg self-start sm:self-auto"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Create Group</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-4 overflow-x-auto">
          <div className="inline-flex border border-border-ui rounded-xl bg-surface-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-medium rounded-l-xl transition-colors ${
                activeTab === 'all' ? 'bg-accent text-accent-fg' : 'text-ink-muted hover:bg-surface'
              }`}
            >
              All ({allCount})
            </button>
            <button
              onClick={() => setActiveTab('joined')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'joined' ? 'bg-accent text-accent-fg' : 'text-ink-muted hover:bg-surface'
              }`}
            >
              Joined ({joinedCount})
            </button>
            <button
              onClick={() => setActiveTab('created')}
              className={`px-4 py-2 text-sm font-medium rounded-r-xl transition-colors ${
                activeTab === 'created' ? 'bg-accent text-accent-fg' : 'text-ink-muted hover:bg-surface'
              } ${!user ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={!user}
            >
              Created by You ({createdCount})
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="w-5 h-5 text-ink-muted/60 absolute left-4 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface-2 text-ink placeholder-ink-muted/70 border border-border-ui rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>

      {/* Groups Grid - Instagram/Twitter Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleGroups.map((group) => (
          <div key={group.id} className="bg-surface-2 border border-border-ui rounded-2xl hover:shadow-xl transition-all duration-300 overflow-hidden group">
            {/* Cover Image/Header */}
            <div className="relative h-32 overflow-hidden">
              {group.avatar ? (
                // Show actual image if avatar exists
                <div className="relative w-full h-full">
                  <img 
                    src={group.avatar} 
                    alt={group.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20"></div>
                </div>
              ) : (
                // Show accent-tinted gradient background if no avatar
                <div className="w-full h-full bg-gradient-to-br from-accent/40 via-accent/20 to-surface-2"></div>
              )}
              
              {/* Overlay content */}
              <div className="absolute inset-0">
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                  <span className="bg-black/30 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full border border-white/20">
                    🌐 Public
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center space-x-2 text-white/90">
                    <UsersIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{group.members?.length || 0} members</span>
                    {group.onlineMembers && group.onlineMembers.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-300">{group.onlineMembers.length} online</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Group Info */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-ink text-xl mb-1">{group.name}</h3>
                  <p className="text-ink-muted text-sm line-clamp-2">{group.description}</p>
                  {group.typingUsers && group.typingUsers.length > 0 && (
                    <div className="flex items-center space-x-1 mt-1">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-accent rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-accent">
                        {group.typingUsers.length === 1 ? 'Someone is typing...' : `${group.typingUsers.length} people typing...`}
                      </span>
                    </div>
                  )}
                </div>
                {/* Only show 3-dots menu for groups created by current user */}
                {user && group.createdBy === user.id && (
                  <div className="relative ml-3" data-dropdown>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === group.id ? null : group.id)
                      }}
                      className={`p-2 rounded-full transition-all duration-200 ${
                        openMenuId === group.id 
                          ? 'bg-surface text-ink' 
                          : 'text-ink-muted/70 hover:text-ink hover:bg-surface'
                      }`}
                      aria-label="More options"
                    >
                      <EllipsisHorizontalIcon className="w-5 h-5" />
                    </button>
                    
                    {openMenuId === group.id && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-surface-2 border border-border-ui rounded-2xl shadow-2xl py-2 z-[9999] animate-in slide-in-from-top-2 duration-200" data-dropdown>
                        <div className="px-2">
                          <button 
                            onClick={() => { 
                              setOpenMenuId(null)
                              handleOpenManagement(group) 
                            }} 
                            className="w-full text-left px-4 py-3 text-sm text-ink hover:bg-surface rounded-xl flex items-center space-x-3 transition-colors"
                          >
                            <Cog6ToothIcon className="w-4 h-4 text-ink-muted" />
                            <span>Manage Group</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>


              {/* Last Activity */}
              {group.lastActivity && (
                <div className="text-xs text-ink-muted mb-2">
                  Last activity: {new Date(group.lastActivity).toLocaleString()}
                </div>
              )}

              {/* Action Button */}
              <div className="space-y-3">
                {user && !group.members?.includes(user.id) && (
                  <button
                    onClick={() => handleJoinGroup(group)}
                    className="w-full bg-accent text-accent-fg px-6 py-3 rounded-xl text-sm font-semibold hover:bg-accent-hover transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    Join Group
                  </button>
                )}
                {user && group.members?.includes(user.id) && (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleOpenChat(group)}
                      className="w-full bg-accent text-accent-fg px-6 py-3 rounded-xl text-sm font-semibold hover:bg-accent-hover transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-2"
                    >
                      <ChatBubbleLeftIcon className="w-4 h-4" />
                      <span>Open Chat</span>
                    </button>
                    {/* Show Leave Group button for members who didn't create the group */}
                    {group.createdBy !== user.id && (
                      <button
                        onClick={() => handleLeaveGroup(group)}
                        className="w-full bg-surface text-ink border border-border-ui px-6 py-2 rounded-xl text-sm font-medium hover:bg-surface-2 transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <XMarkIcon className="w-4 h-4" />
                        <span>Leave Group</span>
                      </button>
                    )}
                  </div>
                )}
                {!user && (
                  <div className="text-center">
                    <span className="text-sm text-ink-muted bg-surface px-4 py-2 rounded-xl inline-block">
                      Please log in to join
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {visibleGroups.length === 0 && (
        <div className="card p-12 text-center">
          <UserGroupIcon className="w-12 h-12 text-ink-muted/60 mx-auto mb-4" />
          <h3 className="heading-3 text-ink mb-2">
            {searchQuery ? 'No groups found' : 'No groups to show'}
          </h3>
          <p className="body-regular text-ink-muted mb-6">
            {searchQuery 
              ? 'Try adjusting your search terms'
              : activeTab === 'joined'
                ? 'Join a group to start chatting in real time'
                : activeTab === 'created'
                  ? 'You have not created any groups yet'
                  : 'No groups available right now'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create First Group
            </button>
          )}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-elevated w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border-ui">
              <h3 className="heading-3 text-ink">Create Group</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-icon"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Group Name</label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="Enter group name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Description</label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                  className="input-textarea h-24"
                  placeholder="Describe what this group is about..."
                />
              </div>
              
              <p className="text-sm text-ink-muted">
                All groups are public. Any user can join and chat in real time.
              </p>
            </form>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-border-ui">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-ink-muted hover:text-ink transition-colors duration-200 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                className="btn-primary"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Chat Modal */}
        {showChat && selectedGroup && (
          <SimpleGroupChat
            group={selectedGroup}
            onClose={() => {
              setShowChat(false)
              setSelectedGroup(null)
            }}
          />
        )}

      {/* Group Management Modal */}
      {showManagement && selectedGroup && (
        <GroupManagement
          group={selectedGroup}
          onClose={() => {
            setShowManagement(false)
            setSelectedGroup(null)
          }}
          onUpdate={handleGroupUpdate}
        />
      )}

      {/* Beautiful Delete Group Modal */}
      {showDeleteModal && groupToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-2 rounded-2xl shadow-2xl max-w-md w-full animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="p-6 border-b border-border-ui">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-500/15 rounded-full flex items-center justify-center">
                  <XMarkIcon className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">Delete Group</h3>
                  <p className="text-sm text-ink-muted">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-ink mb-4">
                Are you sure you want to delete <span className="font-semibold">"{groupToDelete.name}"</span>? 
                This will permanently remove the group and all its content.
              </p>
              
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 text-red-500 mt-0.5">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-red-500">Warning</h4>
                    <p className="text-sm text-ink mt-1">
                      All messages, members, and group data will be permanently deleted.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 p-6 bg-surface rounded-b-2xl">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setGroupToDelete(null)
                }}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-ink bg-surface-2 border border-border-ui rounded-xl hover:bg-surface transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteGroup}
                disabled={deleteLoading}
                className="px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {deleteLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <XMarkIcon className="w-4 h-4" />
                    <span>Delete Group</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Group Modal */}
      {showLeaveModal && groupToLeave && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-2 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-border-ui">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-500/15 rounded-full flex items-center justify-center">
                  <XMarkIcon className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">Leave Group</h3>
                  <p className="text-sm text-ink-muted">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-ink mb-2">
                  Are you sure you want to leave <span className="font-semibold text-ink">"{groupToLeave.name}"</span>?
                </p>
                <p className="text-sm text-ink-muted">
                  You'll no longer receive notifications from this group and won't be able to participate in group discussions.
                </p>
              </div>

              {/* Group Info */}
              <div className="bg-surface rounded-xl p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-border-ui rounded-lg flex items-center justify-center">
                    {groupToLeave.avatar ? (
                      <img src={groupToLeave.avatar} alt={groupToLeave.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <UserGroupIcon className="w-5 h-5 text-ink-muted" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-ink">{groupToLeave.name}</h4>
                    <p className="text-sm text-ink-muted">{groupToLeave.description}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center space-x-1 text-xs text-ink-muted">
                        <UsersIcon className="w-3 h-3" />
                        <span>{groupToLeave.memberCount || groupToLeave.members?.length || 0} members</span>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium rounded-full text-emerald-500 bg-emerald-500/15">
                        Public
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowLeaveModal(false)
                    setGroupToLeave(null)
                  }}
                  disabled={leaveLoading}
                  className="flex-1 px-4 py-3 text-sm font-medium text-ink bg-surface border border-border-ui rounded-xl hover:bg-surface-2 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLeaveGroup}
                  disabled={leaveLoading}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-orange-600 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {leaveLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Leaving...</span>
                    </>
                  ) : (
                    <>
                      <XMarkIcon className="w-4 h-4" />
                      <span>Leave Group</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Posts Modal */}
    </div>
  )
}
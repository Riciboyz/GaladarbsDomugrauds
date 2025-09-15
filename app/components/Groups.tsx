'use client'

import { useState } from 'react'
import { useGroup } from '../contexts/GroupContext'
import { useUser } from '../contexts/UserContext'
import { useNotification } from '../contexts/NotificationContext'
import { useToast } from '../contexts/ToastContext'
import { 
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  UsersIcon,
  ChatBubbleLeftIcon,
  CalendarIcon,
  UserPlusIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'
import RealtimeChat from './RealtimeChat'

export default function Groups() {
  const { groups, createGroup } = useGroup()
  const { user, users } = useUser()
  const { addNotification } = useNotification()
  const { success, error: showError } = useToast()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [inviteUserId, setInviteUserId] = useState('')
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    isPrivate: false
  })
  const [showGroupTypeInfo, setShowGroupTypeInfo] = useState(false)

  const filteredGroups = groups.filter(group =>
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
      setNewGroup({ name: '', description: '', isPrivate: false })
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating group:', error)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteUserId || !selectedGroup || !user) return

    try {
      const response = await fetch('/api/groups/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedGroup.id,
          inviterId: user.id,
          inviteeId: inviteUserId
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        addNotification({
          id: Date.now().toString(),
          type: 'group_invite',
          message: `Invitation sent to ${users.find(u => u.id === inviteUserId)?.displayName}`,
          userId: user.id,
          read: false,
          createdAt: new Date()
        })
        setInviteUserId('')
        setShowInviteModal(false)
        setSelectedGroup(null)
      } else {
        throw new Error(data.error || 'Failed to send invitation')
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
      alert('Failed to send invitation. Please try again.')
    }
  }

  const handleJoinGroup = (group: any) => {
    // In a real app, this would make an API call to join the group
    alert(`Joining group: ${group.name}`)
  }

  const handleOpenChat = (group: any) => {
    setSelectedGroup(group)
    setShowChat(true)
  }

  // Get users that the current user follows (for invitations)
  const followedUsers = user ? users.filter(u => 
    u.id !== user.id && user.following?.includes(u.id)
  ) : []

  return (
    <div className="max-w-4xl mx-auto">
      {/* Ultra-Minimal Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="heading-1 text-gray-900">Groups</h1>
            <p className="body-regular text-gray-600 mt-1">Connect with like-minded people</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Create Group</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGroups.map((group) => (
          <div key={group.id} className="card-elevated hover:shadow-lg transition-all duration-200">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <UserGroupIcon className="w-6 h-6 text-gray-600" />
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <UsersIcon className="w-4 h-4" />
                  <span>{group.members?.length || 0} members</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <h3 className="heading-4 text-gray-900">{group.name}</h3>
                {group.isPrivate && (
                  <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                    Private
                  </span>
                )}
              </div>
              <p className="body-regular text-gray-600 mb-4 line-clamp-2">{group.description}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <ChatBubbleLeftIcon className="w-4 h-4" />
                    <span>{group.threads?.length || 0}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{new Date(group.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenChat(group)}
                    className="btn-secondary text-sm flex items-center space-x-1"
                  >
                    <ChatBubbleLeftIcon className="w-4 h-4" />
                    <span>Chat</span>
                  </button>
                  {user && group.members?.includes(user.id) && (
                    <button
                      onClick={() => {
                        setSelectedGroup(group)
                        setShowInviteModal(true)
                      }}
                      className="btn-secondary text-sm flex items-center space-x-1"
                    >
                      <UserPlusIcon className="w-4 h-4" />
                      <span>Invite</span>
                    </button>
                  )}
                  {user && !group.members?.includes(user.id) && (
                    <button
                      onClick={() => handleJoinGroup(group)}
                      className="btn-primary text-sm"
                    >
                      Join Group
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredGroups.length === 0 && (
        <div className="card p-12 text-center">
          <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="heading-3 text-gray-900 mb-2">
            {searchQuery ? 'No groups found' : 'No groups yet'}
          </h3>
          <p className="body-regular text-gray-600 mb-6">
            {searchQuery 
              ? 'Try adjusting your search terms'
              : 'Be the first to create a group and start connecting with others'
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
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="heading-3 text-gray-900">Create Group</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-icon"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                  className="input-textarea h-24"
                  placeholder="Describe what this group is about..."
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="isPrivate"
                      checked={newGroup.isPrivate}
                      onChange={(e) => setNewGroup(prev => ({ ...prev, isPrivate: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isPrivate" className="text-sm text-gray-700">
                      Private group (invite only)
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGroupTypeInfo(!showGroupTypeInfo)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    ℹ️ Info
                  </button>
                </div>
                
                {showGroupTypeInfo && (
                  <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-800">
                    <div className="mb-2">
                      <strong>Public Group:</strong> Anyone can join and see content
                    </div>
                    <div>
                      <strong>Private Group:</strong> Only mutual followers can be invited
                    </div>
                  </div>
                )}
              </div>
            </form>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 font-medium text-sm"
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

      {/* Invitation Modal */}
      {showInviteModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-elevated w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="heading-3 text-gray-900">Invite to Group</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setSelectedGroup(null)
                }}
                className="btn-icon"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleInviteUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invite to: {selectedGroup.name}
                </label>
                <select
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Select a user to invite</option>
                  {followedUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName} (@{user.username})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  You can only invite users you follow
                </p>
              </div>
            </form>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setSelectedGroup(null)
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteUser}
                disabled={!inviteUserId}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Chat Modal */}
      {showChat && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <div className="card-elevated">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="heading-3 text-gray-900">
                  {selectedGroup.name} - Real-time Chat
                </h3>
                <button
                  onClick={() => {
                    setShowChat(false)
                    setSelectedGroup(null)
                  }}
                  className="btn-icon"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <RealtimeChat groupId={selectedGroup.id} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
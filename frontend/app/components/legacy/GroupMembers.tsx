'use client'

import { useState, useEffect } from 'react'
import { useUser } from '../contexts/UserContext'
import { useToast } from '../contexts/ToastContext'
import { useWebSocket } from '../contexts/WebSocketContext'
import { 
  XMarkIcon,
  UserPlusIcon,
  UserMinusIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon as XIcon
} from '@heroicons/react/24/outline'

interface GroupMembersProps {
  group: any
  onClose: () => void
}

interface User {
  id: string
  username: string
  displayName: string
  avatar?: string
}

export default function GroupMembers({ group, onClose }: GroupMembersProps) {
  const { user } = useUser()
  const { success, error: showError } = useToast()
  const { sendMessage } = useWebSocket()
  const [members, setMembers] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isCreator, setIsCreator] = useState(false)

  // Check if current user is group creator
  useEffect(() => {
    if (group && user) {
      setIsCreator(group.createdBy === user.id)
    }
  }, [group, user])

  // Load group members
  useEffect(() => {
    if (group?.id) {
      loadGroupMembers()
    }
  }, [group?.id])

  // Listen for real-time member changes
  useEffect(() => {
    if (!group?.id) return

    const handleMemberAdded = (event: CustomEvent) => {
      const data = event.detail
      if (data.groupId === group.id) {
        console.log('📨 Member added:', data)
        loadGroupMembers() // Reload members
        success('Member Added', 'New member added to group!')
      }
    }

    const handleMemberRemoved = (event: CustomEvent) => {
      const data = event.detail
      if (data.groupId === group.id) {
        console.log('📨 Member removed:', data)
        loadGroupMembers() // Reload members
        success('Member Removed', 'Member removed from group!')
      }
    }

    // Add event listeners
    window.addEventListener('member_added', handleMemberAdded as EventListener)
    window.addEventListener('member_removed', handleMemberRemoved as EventListener)

    return () => {
      window.removeEventListener('member_added', handleMemberAdded as EventListener)
      window.removeEventListener('member_removed', handleMemberRemoved as EventListener)
    }
  }, [group?.id])

  const loadGroupMembers = async () => {
    if (!group?.id) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`/api/groups/${group.id}`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        setMembers(data.group.members || [])
      } else {
        console.error('Error loading group members:', data.error)
      }
    } catch (error) {
      console.error('Error loading group members:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadAllUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      
      if (response.ok && data.success) {
        // Filter out users who are already members
        const memberIds = members.map(m => m.id)
        const availableUsers = data.users.filter((u: User) => !memberIds.includes(u.id))
        setAllUsers(availableUsers)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const addMember = async (userId: string) => {
    if (!group?.id || !user?.id) return

    try {
      // Send via WebSocket for real-time updates
      if (sendMessage) {
        sendMessage({
          type: 'add_group_member',
          data: {
            groupId: group.id,
            userId: userId
          }
        })
      }

      // Also update via API as backup
      const response = await fetch(`/api/groups/${group.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      const data = await response.json()
      
      if (response.ok) {
        success('Member Added', 'Member added successfully!')
        setShowAddModal(false)
        setSearchTerm('')
      } else {
        throw new Error(data.error || 'Failed to add member')
      }
    } catch (error) {
      console.error('Error adding member:', error)
      showError('Add Member', 'Failed to add member. Please try again.')
    }
  }

  const removeMember = async (userId: string) => {
    if (!group?.id || !user?.id) return

    try {
      // Send via WebSocket for real-time updates
      if (sendMessage) {
        sendMessage({
          type: 'remove_group_member',
          data: {
            groupId: group.id,
            userId: userId
          }
        })
      }

      // Also update via API as backup
      const response = await fetch(`/api/groups/${group.id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      const data = await response.json()
      
      if (response.ok) {
        success('Member Removed', 'Member removed successfully!')
      } else {
        throw new Error(data.error || 'Failed to remove member')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      showError('Remove Member', 'Failed to remove member. Please try again.')
    }
  }

  const filteredUsers = allUsers.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openAddModal = () => {
    setShowAddModal(true)
    loadAllUsers()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl h-[80vh] flex flex-col">
        <div className="card-elevated flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <h3 className="heading-4 text-gray-900">Group Members</h3>
              <p className="text-sm text-gray-500">{group?.name}</p>
            </div>
            
            <button
              onClick={onClose}
              className="btn-icon"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Add Member Button */}
          {isCreator && (
            <div className="p-4 border-b border-gray-100">
              <button
                onClick={openAddModal}
                className="btn-primary flex items-center space-x-2"
              >
                <UserPlusIcon className="w-4 h-4" />
                <span>Add Member</span>
              </button>
            </div>
          )}

          {/* Members List */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : members.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-gray-500">No members found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {member.avatar ? (
                          <img 
                            src={member.avatar} 
                            alt={member.username} 
                            className="w-10 h-10 rounded-full object-cover" 
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-600">
                            {member.username?.charAt(0) || 'U'}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.displayName}</p>
                        <p className="text-sm text-gray-500">@{member.username}</p>
                      </div>
                    </div>
                    
                    {isCreator && member.id !== user?.id && (
                      <button
                        onClick={() => removeMember(member.id)}
                        className="btn-icon text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Remove member"
                      >
                        <UserMinusIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="heading-4 text-gray-900">Add Member</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-icon"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {/* Search */}
              <div className="relative mb-4">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users..."
                  className="input pl-10"
                />
              </div>

              {/* Users List */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        {user.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={user.username} 
                            className="w-8 h-8 rounded-full object-cover" 
                          />
                        ) : (
                          <span className="text-xs font-medium text-gray-600">
                            {user.username?.charAt(0) || 'U'}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                        <p className="text-xs text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => addMember(user.id)}
                      className="btn-icon text-green-600 hover:text-green-700 hover:bg-green-50"
                      title="Add member"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                {filteredUsers.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No users found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

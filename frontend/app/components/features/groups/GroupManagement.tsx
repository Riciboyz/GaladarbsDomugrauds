'use client'

import { useState, useEffect } from 'react'
import { useUser } from '../../contexts/UserContext'
import { useToast } from '../../contexts/ToastContext'
import { 
  UserGroupIcon,
  UsersIcon,
  TrashIcon,
  UserMinusIcon,
  PencilIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface GroupManagementProps {
  group: any
  onClose: () => void
  onUpdate: () => void
}

export default function GroupManagement({ group, onClose, onUpdate }: GroupManagementProps) {
  const { user } = useUser()
  const { success, error: showError } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMemberManagement, setShowMemberManagement] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [editForm, setEditForm] = useState({
    name: group.name,
    description: group.description || '',
    avatar: group.avatar || ''
  })

  useEffect(() => {
    if (showMemberManagement) {
      loadGroupMembers()
    }
  }, [showMemberManagement])

  // Listen for real-time member changes
  useEffect(() => {
    if (!group?.id) return

    const handleMemberAdded = (event: CustomEvent) => {
      const data = event.detail
      if (data.groupId === group.id) {
        console.log('📨 GroupManagement: Member added:', data)
        loadGroupMembers() // Reload members
        success('Member Added', 'New member added to group!')
      }
    }

    const handleMemberRemoved = (event: CustomEvent) => {
      const data = event.detail
      if (data.groupId === group.id) {
        console.log('📨 GroupManagement: Member removed:', data)
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
    try {
      const response = await fetch(`/api/groups/members?groupId=${group.id}`, {
        credentials: 'include'
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setMembers((data.members || []).map((member: any) => ({
          id: member.id,
          username: member.username,
          displayName: member.display_name,
          avatar: member.avatar
        })))
      }
    } catch (error) {
      console.error('Error loading members:', error)
    }
  }

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const response = await fetch('/api/groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          groupId: group.id,
          ...editForm
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        success('Success', 'Group updated successfully!')
        setIsEditing(false)
        onUpdate()
      } else {
        throw new Error(data.error || 'Failed to update group')
      }
    } catch (error) {
      console.error('Error updating group:', error)
      showError('Error', 'Failed to update group. Please try again.')
    }
  }

  const handleDeleteGroup = async () => {
    if (!user) return

    try {
      console.log('🗑️ Deleting group:', group.id)
      const response = await fetch(`/api/groups?groupId=${group.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()
      console.log('📡 Delete response:', response.status, data)
      
      if (response.ok) {
        success('Success', 'Group deleted successfully!')
        onUpdate()
        onClose()
      } else {
        throw new Error(data.error || 'Failed to delete group')
      }
    } catch (error) {
      console.error('❌ Error deleting group:', error)
      showError('Error', 'Failed to delete group. Please try again.')
    }
  }

  const removeMember = async (userId: string) => {
    if (!group?.id || !user?.id) return

    try {
      const response = await fetch(`/api/groups/members?groupId=${group.id}&userId=${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })

      const data = await response.json()
      
      if (response.ok) {
        success('Member Removed', 'Member removed successfully!')
        loadGroupMembers()
      } else {
        throw new Error(data.error || 'Failed to remove member')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      showError('Remove Member', 'Failed to remove member. Please try again.')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    await removeMember(memberId)
  }

  if (!user || group.createdBy !== user.id) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="heading-3 text-gray-900">Group Management</h3>
          <button
            onClick={onClose}
            className="btn-icon"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Group Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                {group.avatar ? (
                  <img src={group.avatar} alt={group.name} className="w-16 h-16 rounded-xl object-cover" />
                ) : (
                  <UserGroupIcon className="w-8 h-8 text-gray-600" />
                )}
              </div>
              <div>
                <h4 className="heading-4 text-gray-900">{group.name}</h4>
                <p className="body-regular text-gray-600">{group.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <UsersIcon className="w-4 h-4" />
                    <span>{group.memberCount || group.members?.length || 0} members</span>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-full text-green-600 bg-green-100">
                    Public
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-secondary flex items-center space-x-2"
            >
              <PencilIcon className="w-4 h-4" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Group'}</span>
            </button>
            
            <button
              onClick={() => setShowMemberManagement(!showMemberManagement)}
              className="btn-secondary flex items-center space-x-2"
            >
              <UsersIcon className="w-4 h-4" />
              <span>{showMemberManagement ? 'Hide Members' : 'Manage Members'}</span>
            </button>
            
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-secondary text-red-600 hover:text-red-700 flex items-center space-x-2"
            >
              <TrashIcon className="w-4 h-4" />
              <span>Delete Group</span>
            </button>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <form onSubmit={handleUpdateGroup} className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h5 className="heading-5 text-gray-900">Edit Group Details</h5>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="Enter group name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="input-textarea h-24"
                  placeholder="Describe what this group is about..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Avatar URL</label>
                <input
                  type="url"
                  value={editForm.avatar}
                  onChange={(e) => setEditForm(prev => ({ ...prev, avatar: e.target.value }))}
                  className="input"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* Member Management */}
          {showMemberManagement && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="heading-5 text-gray-900">Group Members</h5>
                <span className="text-sm text-gray-500">{members.length} members</span>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {members.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <UsersIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No members found</p>
                  </div>
                ) : (
                  members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.displayName} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium text-gray-600">
                              {member.displayName?.charAt(0) || 'U'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{member.displayName}</p>
                          <p className="text-xs text-gray-500">@{member.username}</p>
                          {member.id === group.createdBy && (
                            <span className="inline-block px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full mt-1">
                              Creator
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {member.id !== group.createdBy && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove member"
                        >
                          <UserMinusIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h5 className="heading-5 text-red-900 mb-2">Delete Group</h5>
              <p className="body-regular text-red-700 mb-4">
                Are you sure you want to delete "{group.name}"? This action cannot be undone and will remove all group data including messages and member information.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteGroup}
                  className="btn-secondary text-red-600 hover:text-red-700 flex items-center space-x-2"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>Delete Group</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

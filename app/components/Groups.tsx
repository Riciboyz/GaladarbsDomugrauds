'use client'

import { useState } from 'react'
import { useApp } from '../providers'
import ThreadCard from './ThreadCard'
import CreateThread from './CreateThread'
import { 
  ChatBubbleLeftRightIcon,
  PlusIcon,
  UsersIcon,
  LockClosedIcon,
  GlobeAltIcon,
  UserPlusIcon,
  UserMinusIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'

export default function Groups() {
  const { groups, users, user, addGroup, updateGroup } = useApp()
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const userGroups = groups.filter(group => 
    group.members.includes(user?.id || '')
  )

  const filteredGroups = userGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateGroup = (name: string, description: string, isPublic: boolean) => {
    if (!user) return

    const newGroup = {
      id: Math.random().toString(),
      name,
      description,
      members: [user.id],
      admins: [user.id],
      isPublic,
      createdAt: new Date(),
      threads: []
    }
    addGroup(newGroup)
    setShowCreateGroup(false)
  }

  const handleJoinGroup = (groupId: string) => {
    if (!user) return

    const group = groups.find(g => g.id === groupId)
    if (group && !group.members.includes(user.id)) {
      updateGroup(groupId, {
        members: [...group.members, user.id]
      })
    }
  }

  const handleLeaveGroup = (groupId: string) => {
    if (!user) return

    const group = groups.find(g => g.id === groupId)
    if (group) {
      updateGroup(groupId, {
        members: group.members.filter(id => id !== user.id),
        admins: group.admins.filter(id => id !== user.id)
      })
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {selectedGroup ? (
        /* Group Chat View */
        <GroupChat 
          groupId={selectedGroup} 
          onBack={() => setSelectedGroup(null)} 
        />
      ) : (
        /* Groups List */
        <div>
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-secondary-200 p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-secondary-900">Groups</h1>
                <p className="text-secondary-500">Connect and chat with communities</p>
              </div>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Create Group</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
              <input
                type="text"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Groups Grid */}
          <div className="p-6">
            {filteredGroups.length === 0 ? (
              <div className="bg-white rounded-xl border border-secondary-200 p-8 text-center">
                <ChatBubbleLeftRightIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">
                  {searchQuery ? 'No groups found' : 'No groups yet'}
                </h3>
                <p className="text-secondary-500 mb-4">
                  {searchQuery 
                    ? 'Try adjusting your search terms'
                    : 'Create your first group or join existing ones to start chatting!'
                  }
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowCreateGroup(true)}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Create First Group
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGroups.map((group) => {
                  const isAdmin = user && group.admins.includes(user.id)
                  const isMember = user && group.members.includes(user.id)
                  
                  return (
                    <div
                      key={group.id}
                      className="bg-white rounded-xl border border-secondary-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedGroup(group.id)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <img
                              src={group.avatar || 'https://via.placeholder.com/50'}
                              alt={group.name}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                            {group.isPublic ? (
                              <GlobeAltIcon className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 text-white rounded-full p-0.5" />
                            ) : (
                              <LockClosedIcon className="absolute -bottom-1 -right-1 h-4 w-4 bg-gray-500 text-white rounded-full p-0.5" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-secondary-900">{group.name}</h3>
                            <p className="text-sm text-secondary-500">
                              {group.isPublic ? 'Public' : 'Private'}
                            </p>
                          </div>
                        </div>
                        
                        {isAdmin && (
                          <Cog6ToothIcon className="h-5 w-5 text-secondary-400" />
                        )}
                      </div>

                      {group.description && (
                        <p className="text-secondary-600 text-sm mb-4 line-clamp-2">
                          {group.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-secondary-500">
                          <div className="flex items-center space-x-1">
                            <UsersIcon className="h-4 w-4" />
                            <span>{group.members.length} members</span>
                          </div>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(group.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {isMember ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              Member
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleJoinGroup(group.id)
                              }}
                              className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full hover:bg-primary-200 transition-colors"
                            >
                              Join
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal 
          onClose={() => setShowCreateGroup(false)} 
          onCreate={handleCreateGroup} 
        />
      )}
    </div>
  )
}

interface GroupChatProps {
  groupId: string
  onBack: () => void
}

function GroupChat({ groupId, onBack }: GroupChatProps) {
  const { groups, threads, users, user, addThread } = useApp()
  const [showCreateThread, setShowCreateThread] = useState(false)
  
  const group = groups.find(g => g.id === groupId)
  const groupThreads = threads.filter(thread => thread.groupId === groupId)
  const isAdmin = user && group && group.admins.includes(user.id)

  if (!group) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-secondary-900 mb-2">Group not found</h2>
          <p className="text-secondary-500">The group you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Group Header */}
      <div className="bg-white border-b border-secondary-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
            >
              <span className="text-secondary-600">←</span>
            </button>
            <img
              src={group.avatar || 'https://via.placeholder.com/40'}
              alt={group.name}
              className="h-10 w-10 rounded-full object-cover"
            />
            <div>
              <h2 className="font-semibold text-secondary-900">{group.name}</h2>
              <p className="text-sm text-secondary-500">
                {group.members.length} members
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCreateThread(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              New Thread
            </button>
            <Cog6ToothIcon className="h-5 w-5 text-secondary-400" />
          </div>
        </div>
      </div>

      {/* Group Info */}
      <div className="bg-secondary-50 p-4 border-b border-secondary-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-secondary-600">{group.description}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-secondary-500">
              <span>{group.isPublic ? 'Public' : 'Private'} group</span>
              <span>•</span>
              <span>Created {formatDistanceToNow(new Date(group.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
          {isAdmin && (
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
              Admin
            </span>
          )}
        </div>
      </div>

      {/* Threads */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {groupThreads.length === 0 ? (
          <div className="text-center py-12">
            <ChatBubbleLeftRightIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              No threads yet
            </h3>
            <p className="text-secondary-500 mb-4">
              Start the conversation by creating the first thread!
            </p>
            <button
              onClick={() => setShowCreateThread(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create First Thread
            </button>
          </div>
        ) : (
          groupThreads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} />
          ))
        )}
      </div>

      {/* Create Thread Modal */}
      {showCreateThread && (
        <CreateThread 
          onClose={() => setShowCreateThread(false)} 
          groupId={groupId}
        />
      )}
    </div>
  )
}

interface CreateGroupModalProps {
  onClose: () => void
  onCreate: (name: string, description: string, isPublic: boolean) => void
}

function CreateGroupModal({ onClose, onCreate }: CreateGroupModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onCreate(name.trim(), description.trim(), isPublic)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <h2 className="text-xl font-bold text-secondary-900">Create Group</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <span className="text-secondary-500">×</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-2">
                Group Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter group name"
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this group is about..."
                rows={3}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-3">
                Group Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border border-secondary-200 rounded-lg cursor-pointer hover:bg-secondary-50">
                  <input
                    type="radio"
                    name="visibility"
                    checked={isPublic}
                    onChange={() => setIsPublic(true)}
                    className="mr-3"
                  />
                  <GlobeAltIcon className="h-5 w-5 text-secondary-400 mr-3" />
                  <div>
                    <p className="font-medium text-secondary-900">Public</p>
                    <p className="text-sm text-secondary-500">Anyone can find and join this group</p>
                  </div>
                </label>
                <label className="flex items-center p-3 border border-secondary-200 rounded-lg cursor-pointer hover:bg-secondary-50">
                  <input
                    type="radio"
                    name="visibility"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                    className="mr-3"
                  />
                  <LockClosedIcon className="h-5 w-5 text-secondary-400 mr-3" />
                  <div>
                    <p className="font-medium text-secondary-900">Private</p>
                    <p className="text-sm text-secondary-500">Only invited members can join</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

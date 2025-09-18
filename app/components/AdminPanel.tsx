'use client'

import { useState, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import { 
  Cog6ToothIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  CalendarIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

interface DailyTopic {
  id: string
  title: string
  description: string
  is_active: boolean
  scheduled_date?: string
  created_at: string
  created_by_username: string
  created_by_display_name: string
}

interface User {
  id: string
  username: string
  displayName: string
  email: string
  role: string
  created_at: string
}

export default function AdminPanel() {
  const { success, error: showError } = useToast()
  const [activeTab, setActiveTab] = useState<'topics' | 'users'>('topics')
  const [topics, setTopics] = useState<DailyTopic[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showTopicModal, setShowTopicModal] = useState(false)
  const [editingTopic, setEditingTopic] = useState<DailyTopic | null>(null)
  const [topicForm, setTopicForm] = useState({
    title: '',
    description: '',
    is_active: false,
    scheduled_date: ''
  })

  useEffect(() => {
    if (activeTab === 'topics') {
      loadTopics()
    } else {
      loadUsers()
    }
  }, [activeTab])

  const loadTopics = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/daily-topics', {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (data.success) {
        setTopics(data.topics)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error loading topics:', error)
      showError('Error', 'Failed to load topics')
    } finally {
      setIsLoading(false)
    }
  }

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.users)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error loading users:', error)
      showError('Error', 'Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topicForm.title.trim()) return

    try {
      const response = await fetch('/api/admin/daily-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(topicForm)
      })

      const data = await response.json()
      
      if (data.success) {
        success('Success', 'Daily topic created successfully!')
        setShowTopicModal(false)
        setTopicForm({ title: '', description: '', is_active: false, scheduled_date: '' })
        loadTopics()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error creating topic:', error)
      showError('Error', 'Failed to create topic')
    }
  }

  const handleUpdateTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTopic || !topicForm.title.trim()) return

    try {
      const response = await fetch('/api/admin/daily-topics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: editingTopic.id,
          ...topicForm
        })
      })

      const data = await response.json()
      
      if (data.success) {
        success('Success', 'Daily topic updated successfully!')
        setShowTopicModal(false)
        setEditingTopic(null)
        setTopicForm({ title: '', description: '', is_active: false, scheduled_date: '' })
        loadTopics()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error updating topic:', error)
      showError('Error', 'Failed to update topic')
    }
  }

  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm('Are you sure you want to delete this topic? This will also delete all submissions.')) return

    try {
      const response = await fetch(`/api/admin/daily-topics?id=${topicId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()
      
      if (data.success) {
        success('Success', 'Daily topic deleted successfully!')
        loadTopics()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error deleting topic:', error)
      showError('Error', 'Failed to delete topic')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return

    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()
      
      if (data.success) {
        success('Success', 'User deleted successfully!')
        loadUsers()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      showError('Error', 'Failed to delete user')
    }
  }

  const openEditModal = (topic: DailyTopic) => {
    setEditingTopic(topic)
    setTopicForm({
      title: topic.title,
      description: topic.description,
      is_active: topic.is_active,
      scheduled_date: topic.scheduled_date ? topic.scheduled_date.slice(0,10) : ''
    })
    setShowTopicModal(true)
  }

  const closeModal = () => {
    setShowTopicModal(false)
    setEditingTopic(null)
    setTopicForm({ title: '', description: '', is_active: false, scheduled_date: '' })
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
        <p className="text-gray-600">Manage daily topics and users</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('topics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'topics'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Daily Topics
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Users
            </button>
          </nav>
        </div>
      </div>

      {/* Topics Tab */}
      {activeTab === 'topics' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Daily Topics</h2>
            <button
              onClick={() => setShowTopicModal(true)}
              className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create Topic</span>
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading topics...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topics.map((topic) => (
                <div key={topic.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{topic.title}</h3>
                        {topic.is_active && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                            Active
                          </span>
                        )}
                      </div>
                      {topic.description && (
                        <p className="text-gray-600 mb-3">{topic.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Created by {topic.created_by_display_name}</span>
                        <span>•</span>
                        <span>{new Date(topic.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(topic)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit topic"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTopic(topic.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete topic"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {topics.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No topics yet</h3>
                  <p className="text-gray-600 mb-4">Create your first daily topic to get started.</p>
                  <button
                    onClick={() => setShowTopicModal(true)}
                    className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Create Topic
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Users</h2>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading users...</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {user.displayName?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                              <div className="text-sm text-gray-500">@{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Topic Modal */}
      {showTopicModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTopic ? 'Edit Topic' : 'Create Topic'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingTopic ? handleUpdateTopic : handleCreateTopic} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={topicForm.title}
                  onChange={(e) => setTopicForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Enter topic title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={topicForm.description}
                  onChange={(e) => setTopicForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent h-24"
                  placeholder="Enter topic description (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled date</label>
                <input
                  type="date"
                  value={topicForm.scheduled_date || ''}
                  onChange={(e) => setTopicForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">If set, this topic will be shown on that date.</p>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={topicForm.is_active}
                  onChange={(e) => setTopicForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Set as active topic
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {editingTopic ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

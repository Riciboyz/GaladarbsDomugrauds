'use client'

import { useState } from 'react'
import { useUser } from '../contexts/UserContext'
import { 
  Cog6ToothIcon,
  BellIcon,
  ShieldCheckIcon,
  UserIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function Settings() {
  const { user, updateUser } = useUser()
  const [activeTab, setActiveTab] = useState('notifications')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      mentions: true,
      follows: true
    },
    privacy: {
      profileVisibility: 'public',
      showEmail: false,
      showFollowers: true
    },
    account: {
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })

  const tabs = [
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'privacy', name: 'Privacy', icon: ShieldCheckIcon },
    { id: 'account', name: 'Account', icon: UserIcon }
  ]

  const handleSave = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })

      if (response.ok) {
        const data = await response.json()
        updateUser(data.user, data.users)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Redirect to login or handle logout
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Error deleting account:', error)
    }
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-12 text-center">
          <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="heading-3 text-gray-900 mb-2">Please log in</h3>
          <p className="body-regular text-gray-600">You need to be logged in to access settings.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Ultra-Minimal Header */}
      <div className="mb-6">
        <h1 className="heading-1 text-gray-900">Settings</h1>
        <p className="body-regular text-gray-600 mt-1">Manage your account preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.name}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="card-elevated">
            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="p-6">
                <h2 className="heading-3 text-gray-900 mb-6">Notification Preferences</h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Email Notifications</h3>
                      <p className="text-sm text-gray-600">Receive notifications via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.email}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, email: e.target.checked }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Push Notifications</h3>
                      <p className="text-sm text-gray-600">Receive push notifications in browser</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.push}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, push: e.target.checked }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Mentions</h3>
                      <p className="text-sm text-gray-600">Get notified when someone mentions you</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.mentions}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, mentions: e.target.checked }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">New Followers</h3>
                      <p className="text-sm text-gray-600">Get notified when someone follows you</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.follows}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, follows: e.target.checked }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="p-6">
                <h2 className="heading-3 text-gray-900 mb-6">Privacy Settings</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Visibility</label>
                    <select
                      value={settings.privacy.profileVisibility}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        privacy: { ...prev.privacy, profileVisibility: e.target.value }
                      }))}
                      className="input"
                    >
                      <option value="public">Public</option>
                      <option value="followers">Followers Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Show Email</h3>
                      <p className="text-sm text-gray-600">Display your email on your profile</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.privacy.showEmail}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          privacy: { ...prev.privacy, showEmail: e.target.checked }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Show Followers</h3>
                      <p className="text-sm text-gray-600">Display your followers list publicly</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.privacy.showFollowers}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          privacy: { ...prev.privacy, showFollowers: e.target.checked }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="p-6">
                <h2 className="heading-3 text-gray-900 mb-6">Account Settings</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={settings.account.email}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        account: { ...prev.account, email: e.target.value }
                      }))}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                    <input
                      type="password"
                      value={settings.account.currentPassword}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        account: { ...prev.account, currentPassword: e.target.value }
                      }))}
                      className="input"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <input
                      type="password"
                      value={settings.account.newPassword}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        account: { ...prev.account, newPassword: e.target.value }
                      }))}
                      className="input"
                      placeholder="Enter new password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      value={settings.account.confirmPassword}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        account: { ...prev.account, confirmPassword: e.target.value }
                      }))}
                      className="input"
                      placeholder="Confirm new password"
                    />
                  </div>

                  {/* Danger Zone */}
                  <div className="border-t border-red-200 pt-6">
                    <h3 className="heading-4 text-red-900 mb-4">Danger Zone</h3>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-red-900">Delete Account</h4>
                          <p className="text-sm text-red-700">Permanently delete your account and all data</p>
                        </div>
                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className="btn-danger flex items-center space-x-2"
                        >
                          <TrashIcon className="w-4 h-4" />
                          <span>Delete Account</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-100">
              <button
                onClick={handleSave}
                className="btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-elevated w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="heading-3 text-red-900">Delete Account</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn-icon"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="body-regular text-gray-700 mb-4">
                Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.
              </p>
              <p className="text-sm text-gray-600">
                Type "DELETE" to confirm:
              </p>
              <input
                type="text"
                placeholder="Type DELETE to confirm"
                className="input mt-2"
              />
            </div>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="btn-danger"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
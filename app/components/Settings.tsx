'use client'

import { useState } from 'react'
import { useApp } from '../providers'
import { 
  Cog6ToothIcon,
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function Settings() {
  const { user, updateUser } = useApp()
  const [activeTab, setActiveTab] = useState('profile')
  const [settings, setSettings] = useState({
    theme: 'system',
    notifications: {
      likes: true,
      comments: true,
      follows: true,
      topicDays: true,
      groups: true
    },
    privacy: {
      showOnlineStatus: true,
      allowDirectMessages: true,
      showEmail: false,
      showFollowers: true
    },
    display: {
      compactMode: false,
      showTimestamps: true,
      autoPlayVideos: false
    }
  })

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'privacy', label: 'Privacy', icon: ShieldCheckIcon },
    { id: 'appearance', label: 'Appearance', icon: PaintBrushIcon },
    { id: 'account', label: 'Account', icon: Cog6ToothIcon }
  ]

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }))
  }

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // Handle account deletion
      console.log('Account deletion requested')
    }
  }

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Profile Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={user?.displayName || ''}
              onChange={(e) => updateUser(user?.id || '', { displayName: e.target.value })}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={user?.username || ''}
              onChange={(e) => updateUser(user?.id || '', { username: e.target.value })}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Bio
            </label>
            <textarea
              value={user?.bio || ''}
              onChange={(e) => updateUser(user?.id || '', { bio: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Tell us about yourself..."
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          {Object.entries(settings.notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-secondary-900 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-sm text-secondary-500">
                  Get notified when someone {key} your content
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => handleSettingChange('notifications', key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Privacy Settings</h3>
        <div className="space-y-4">
          {Object.entries(settings.privacy).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-secondary-900 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-sm text-secondary-500">
                  {key === 'showOnlineStatus' && 'Show when you are online'}
                  {key === 'allowDirectMessages' && 'Allow others to send you direct messages'}
                  {key === 'showEmail' && 'Show your email address on your profile'}
                  {key === 'showFollowers' && 'Show your followers and following lists'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => handleSettingChange('privacy', key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Theme</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'light', label: 'Light', icon: SunIcon },
            { id: 'dark', label: 'Dark', icon: MoonIcon },
            { id: 'system', label: 'System', icon: ComputerDesktopIcon }
          ].map((theme) => {
            const Icon = theme.icon
            return (
              <button
                key={theme.id}
                onClick={() => setSettings(prev => ({ ...prev, theme: theme.id }))}
                className={`p-4 border rounded-lg text-center transition-colors ${
                  settings.theme === theme.id
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-secondary-200 hover:border-secondary-300'
                }`}
              >
                <Icon className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm font-medium">{theme.label}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Display Options</h3>
        <div className="space-y-4">
          {Object.entries(settings.display).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-secondary-900 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-sm text-secondary-500">
                  {key === 'compactMode' && 'Use a more compact layout'}
                  {key === 'showTimestamps' && 'Show timestamps on posts'}
                  {key === 'autoPlayVideos' && 'Automatically play videos'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => handleSettingChange('display', key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderAccountSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Account Actions</h3>
        <div className="space-y-4">
          <button className="w-full p-4 border border-secondary-200 rounded-lg text-left hover:bg-secondary-50 transition-colors">
            <div className="flex items-center space-x-3">
              <GlobeAltIcon className="h-5 w-5 text-secondary-500" />
              <div>
                <p className="font-medium text-secondary-900">Export Data</p>
                <p className="text-sm text-secondary-500">Download a copy of your data</p>
              </div>
            </div>
          </button>
          
          <button className="w-full p-4 border border-secondary-200 rounded-lg text-left hover:bg-secondary-50 transition-colors">
            <div className="flex items-center space-x-3">
              <EyeSlashIcon className="h-5 w-5 text-secondary-500" />
              <div>
                <p className="font-medium text-secondary-900">Deactivate Account</p>
                <p className="text-sm text-secondary-500">Temporarily disable your account</p>
              </div>
            </div>
          </button>
          
          <button 
            onClick={handleDeleteAccount}
            className="w-full p-4 border border-red-200 rounded-lg text-left hover:bg-red-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <TrashIcon className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium text-red-700">Delete Account</p>
                <p className="text-sm text-red-500">Permanently delete your account and all data</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileSettings()
      case 'notifications':
        return renderNotificationSettings()
      case 'privacy':
        return renderPrivacySettings()
      case 'appearance':
        return renderAppearanceSettings()
      case 'account':
        return renderAccountSettings()
      default:
        return renderProfileSettings()
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-secondary-200 p-6 z-10">
        <div className="flex items-center space-x-3 mb-4">
          <Cog6ToothIcon className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Settings</h1>
            <p className="text-secondary-500">Manage your account and preferences</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-secondary-100 p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-secondary-600 hover:text-secondary-900'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {renderContent()}
      </div>
    </div>
  )
}

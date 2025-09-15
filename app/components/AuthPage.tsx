'use client'

import { useState } from 'react'
import { useUser } from '../contexts/UserContext'
import { useThread } from '../contexts/ThreadContext'
import { useToast } from '../contexts/ToastContext'
import { 
  EyeIcon, 
  EyeSlashIcon, 
  UserIcon, 
  EnvelopeIcon, 
  LockClosedIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

export default function AuthPage() {
  const { setUser } = useUser()
  const { loadThreadsFromAPI } = useThread()
  const { success, error: showError } = useToast()
  
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    displayName: '',
    bio: ''
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setLoading(true)

    if (!formData.email || !formData.password) {
      setErrorMessage('Email and password are required')
      setLoading(false)
      return
    }

    if (!isLogin && (!formData.username || !formData.displayName)) {
      setErrorMessage('Username and display name are required')
      setLoading(false)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setErrorMessage('Please enter a valid email address')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        await loadThreadsFromAPI()
        success('Welcome!', 'You have successfully logged in.')
      } else {
        setErrorMessage(data.error || 'An error occurred')
        showError('Login Failed', data.error || 'An error occurred')
      }
    } catch (error) {
      console.error('Auth error:', error)
      setErrorMessage('Network error. Please try again.')
      showError('Network Error', 'Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async () => {
    setFormData({
      email: 'testuser1@example.com',
      password: 'password123',
      username: '',
      displayName: '',
      bio: ''
    })
    setLoading(true)
    setErrorMessage('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'testuser1@example.com',
          password: 'password123'
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        await loadThreadsFromAPI()
        success('Welcome!', 'Quick login successful.')
      } else {
        setErrorMessage(data.error || 'Quick login failed')
        showError('Quick Login Failed', data.error || 'Quick login failed')
      }
    } catch (error) {
      console.error('Quick login error:', error)
      setErrorMessage('Quick login failed')
      showError('Quick Login Failed', 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Ultra-Minimal Logo */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-4">
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">DomuGrauds</h1>
            <p className="text-gray-600">Dalies ar savām domām, sazinies ar citiem</p>
          </div>

          {/* Ultra-Clean Auth Form */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="p-8">
              {/* Ultra-Minimal Tabs */}
              <div className="flex mb-8 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all duration-200 ${
                    isLogin
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all duration-200 ${
                    !isLogin
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Ultra-Clean Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 text-sm"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 text-sm"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-4 h-4" />
                      ) : (
                        <EyeIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Registration Fields */}
                {!isLogin && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Username
                      </label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 text-sm"
                          placeholder="Choose a username"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 text-sm"
                        placeholder="Your display name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bio (Optional)
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 text-sm resize-none h-20"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                  </>
                )}

                {/* Ultra-Minimal Error Message */}
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{errorMessage}</p>
                  </div>
                )}

                {/* Ultra-Clean Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                </button>
              </form>

              {/* Ultra-Minimal Quick Login */}
              <div className="mt-6 text-center">
                <button
                  onClick={handleQuickLogin}
                  disabled={loading}
                  className="text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors duration-200"
                >
                  Quick Test Login (testuser1@example.com)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

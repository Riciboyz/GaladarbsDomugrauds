'use client'

import { useState } from 'react'
import AdminPanel from '../components/AdminPanel'

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      })

      const data = await response.json()

      if (data.success && data.user) {
        if (data.user.role === 'admin') {
          setIsLoggedIn(true)
        } else {
          setError('Šis konts nav admin. Tikai admini var piekļūt šai lapai.')
        }
      } else {
        setError('Nepareizs email vai parole.')
      }
    } catch (error) {
      setError('Kļūda piesakoties. Mēģiniet vēlreiz.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminPanel />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0l1.403 5.777c.194.8.8 1.4 1.6 1.4h4.5c1.756 0 2.5 1.244 1.6 2.5l-3.6 2.6c-.8.6-1.2 1.6-1.2 2.6v4.5c0 1.756-1.244 2.5-2.5 1.6l-2.6-3.6c-.6-.8-1.6-1.2-2.6-1.2h-4.5c-1.756 0-2.5-1.244-1.6-2.5l2.6-3.6c.6-.8.6-1.8 0-2.6l-2.6-3.6c-.9-1.256-.156-2.5 1.6-2.5h4.5c.8 0 1.406-.6 1.6-1.4l1.403-5.777z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
          <p className="text-gray-600 mt-2">Ievadiet admina datus, lai piekļūtu panelim</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-colors"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Parole
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? 'Piesakās...' : 'Piesakīties'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => window.location.href = '/'}
            className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            ← Atgriezties uz sākumlapu
          </button>
        </div>
      </div>
    </div>
  )
}

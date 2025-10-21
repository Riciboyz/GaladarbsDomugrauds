'use client'

import { useUser } from './contexts/UserContext'
import AuthPage from './components/AuthPage-new'
import MainApp from './components/MainApp-new'

export default function Home() {
  const { user, isLoading } = useUser()

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <main className="min-h-screen dg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen dg-bg">
      {user ? <MainApp /> : <AuthPage />}
    </main>
  )
}

'use client'

import { useUser } from '../contexts/UserContext'
import AuthPage from '../features/auth/AuthPage'
import MainApp from '../MainApp'

export default function Home() {
  const { user } = useUser()

  return (
    <main className="min-h-screen dg-bg">
      {user ? <MainApp /> : <AuthPage />}
    </main>
  )
}
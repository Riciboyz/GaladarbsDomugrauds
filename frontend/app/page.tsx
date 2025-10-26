'use client'

import { useUser } from './components/contexts/UserContext'
import AuthPage from './components/legacy/AuthPage'
import MainApp from './components/MainApp'

export default function Home() {
  const { user } = useUser()

  return (
    <main className="min-h-screen dg-bg">
      {user ? <MainApp /> : <AuthPage />}
    </main>
  )
}


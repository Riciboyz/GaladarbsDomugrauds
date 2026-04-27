'use client'

import { useUser } from './components/contexts/UserContext'
import LandingPage from './components/features/auth/LandingPage'
import MainApp from './components/MainApp'

export default function Home() {
  const { user } = useUser()

  return (
    <main className="min-h-screen dg-bg">
      {user ? <MainApp /> : <LandingPage />}
    </main>
  )
}


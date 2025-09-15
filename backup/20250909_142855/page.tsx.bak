'use client'

import { useApp } from './providers'
import { useEffect } from 'react'
import AuthPage from './components/AuthPage'
import MainApp from './components/MainApp'

export default function Home() {
  const { user } = useApp()

  return (
    <main className="min-h-screen bg-gray-50">
      {user ? <MainApp /> : <AuthPage />}
    </main>
  )
}

'use client'

import { useEffect } from 'react'
import { useUser } from '../contexts/UserContext'
import {
  ChatBubbleLeftRightIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { user, setUser } = useUser()

  useEffect(() => {
    if (!isOpen) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, onClose])

  useEffect(() => {
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      onClose()
    }
  }

  const avatarUrl =
    user?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user?.displayName || user?.username || 'U'
    )}&background=2d5a2d&color=fff&bold=true`

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`lg:hidden fixed inset-0 bg-gray-900/50 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`lg:hidden fixed left-0 top-0 h-full w-[86%] max-w-[340px] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-green-700 flex items-center justify-center shadow-sm">
                <ChatBubbleLeftRightIcon className="w-[18px] h-[18px] text-white" />
              </div>
              <span className="text-[17px] font-bold text-gray-900 tracking-tight">
                DomuGrauds
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Aizvērt izvēlni"
              className="inline-flex items-center justify-center w-9 h-9 -mr-1 rounded-xl text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3.5">
              <img
                src={avatarUrl}
                alt={user?.displayName || 'User'}
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-gray-900 truncate leading-tight">
                  {user?.displayName || 'Lietotājs'}
                </p>
                <p className="text-[13px] text-gray-500 truncate mt-0.5">
                  @{user?.username || 'username'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <p className="px-3 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Konts
            </p>

            {(user as any)?.role === 'admin' && (
              <a
                href="/admin"
                onClick={onClose}
                className="w-full flex items-center gap-3 px-3 h-12 rounded-xl text-brand-green-700 hover:bg-brand-green-700/5 active:bg-brand-green-700/10 transition-colors"
              >
                <ShieldCheckIcon className="w-5 h-5" />
                <span className="text-[15px] font-medium">Admin panelis</span>
              </a>
            )}
          </div>

          <div className="px-3 py-3 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 h-12 rounded-xl text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span className="text-[15px] font-medium">Iziet</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

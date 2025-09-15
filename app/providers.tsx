'use client'

import { ReactNode } from 'react'
import { UserProvider } from './contexts/UserContext'
import { ThreadProvider } from './contexts/ThreadContext'
import { GroupProvider } from './contexts/GroupContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { TopicDayProvider } from './contexts/TopicDayContext'
import { ToastProvider, useToast } from './contexts/ToastContext'
import { WebSocketProvider } from './contexts/WebSocketContext'
import ToastContainer from './components/Toast-simple'

function ToastWrapper() {
  const { toasts, removeToast } = useToast()
  return <ToastContainer toasts={toasts} onRemove={removeToast} />
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <WebSocketProvider>
        <UserProvider>
          <ThreadProvider>
            <GroupProvider>
              <NotificationProvider>
                <TopicDayProvider>
                  {children}
                  <ToastWrapper />
                </TopicDayProvider>
              </NotificationProvider>
            </GroupProvider>
          </ThreadProvider>
        </UserProvider>
      </WebSocketProvider>
    </ToastProvider>
  )
}

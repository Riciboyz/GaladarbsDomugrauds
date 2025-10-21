'use client'

import { ReactNode } from 'react'
import { UserProvider } from './contexts/UserContext'
import { ThreadProvider } from './contexts/ThreadContext'
import { GroupProvider } from './contexts/GroupContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { TopicDayProvider } from './contexts/TopicDayContext'
import { ToastProvider, useToast } from './contexts/ToastContext'
import { WebSocketProvider } from './contexts/WebSocketContext'
import { WeatherProvider } from './contexts/WeatherContext'
import ToastContainer from './components/Toast-simple'
// import { RealtimeNotificationsProvider } from './components/RealtimeNotificationsProvider'

function ToastWrapper() {
  const { toasts, removeToast } = useToast()
  return <ToastContainer toasts={toasts} onRemove={removeToast} />
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <WeatherProvider>
        <UserProvider>
          <WebSocketProvider>
            <ThreadProvider>
              <GroupProvider>
                <NotificationProvider>
                  {/* <RealtimeNotificationsProvider> */}
                    <TopicDayProvider>
                      {children}
                      <ToastWrapper />
                    </TopicDayProvider>
                  {/* </RealtimeNotificationsProvider> */}
                </NotificationProvider>
              </GroupProvider>
            </ThreadProvider>
          </WebSocketProvider>
        </UserProvider>
      </WeatherProvider>
    </ToastProvider>
  )
}

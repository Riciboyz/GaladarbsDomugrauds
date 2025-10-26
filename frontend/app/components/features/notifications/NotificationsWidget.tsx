'use client'

import { useEffect, useMemo, useState } from 'react'
import { useNotification } from '../../contexts/NotificationContext'
import { useUser } from '../../contexts/UserContext'
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications'

export default function NotificationsWidget() {
  const { notifications, markNotificationAsRead, loadNotificationsFromAPI } = useNotification() as any
  const { user } = useUser()
  useRealtimeNotifications()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Only load notifications once when user changes, not on every render
    if (user) {
      loadNotificationsFromAPI()
    }
  }, [user?.id]) // Only depend on user ID, not the entire user object

  const unreadCount = useMemo(() => notifications.filter((n: any) => !n.read).length, [notifications])

  const markAll = async () => {
    try {
      // Optimistic UI
      notifications.forEach((n: any) => markNotificationAsRead(n.id))
      // Best-effort sync can be added here if needed per-notification
    } catch (e) {}
  }


  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">
        Notifications
        {unreadCount > 0 && (
          <span className="ml-2 inline-flex items-center justify-center text-xs px-2 py-0.5 rounded-full bg-red-600 text-white">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <span className="text-sm font-medium">Notifications</span>
            <div className="flex gap-2">
              <button onClick={markAll} className="text-xs text-blue-600 hover:underline">Mark all as read</button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No notifications</div>
            ) : (
              notifications.map((n: any) => (
                <div key={n.id} className={`px-4 py-3 text-sm ${n.read ? 'text-gray-500' : 'text-gray-900'} border-b`}> 
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{n.type}</div>
                      <div>{n.message}</div>
                      <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                    {!n.read && (
                      <button onClick={() => markNotificationAsRead(n.id)} className="text-xs text-blue-600 hover:underline">Read</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}



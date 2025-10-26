'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useWebSocket } from './WebSocketContext'

// Types
// Viena komentāra datu modelis (stingri tipi, TS izcels kļūdas, ja padod nepareizu tipu)
export interface Comment {
  id: string // komentāra unikāls identifikators
  authorId: string // lietotāja ID, kurš uzrakstīja komentāru
  content: string // komentāra teksts
  createdAt: Date // izveides datums/Laiks (Date objekts)
  likes: string[] // lietotāju ID saraksts, kas ieliko "patīk"
  dislikes: string[] // lietotāju ID saraksts, kas ieliko "nepatīk"
}

// Galvenā "Thread" (ieraksta/domas) datu struktūra
export interface Thread {
  id: string // ieraksta unikāls identifikators
  authorId: string // autora lietotāja ID
  content: string // ieraksta saturs (teksts)
  createdAt: Date // izveides laiks (Date)
  likes: string[] // lietotāju ID, kuri ielikuši "patīk"
  dislikes: string[] // lietotāju ID, kuri ielikuši "nepatīk"
  comments: Comment[] // komentāru saraksts pie ieraksta
  replies: Thread[] // atbilžu (child thread) saraksts
  parentId?: string // ja šis ir atbildes ieraksts, te glabājas vecāka ID
  visibility: 'public' | 'followers' // redzamība: publisks vai tikai sekotājiem
  topicDayId?: string // saistība ar "Daily Topic" (ja ir)
  groupId?: string // saistība ar grupu (ja ieraksts pieder grupai)
  attachments?: string[] // pielikumu (failu/attēlu URL) saraksts
}

// Context
interface ThreadContextType {
  threads: Thread[]
  setThreads: (threads: Thread[]) => void
  addThread: (thread: Thread) => void
  updateThread: (threadId: string, updates: Partial<Thread>) => void
  deleteThread: (threadId: string) => void
  loadThreadsFromAPI: () => Promise<void>
  searchThreads: (query: string) => Promise<Thread[]>
}

const ThreadContext = createContext<ThreadContextType | undefined>(undefined)

export function useThread() {
  const context = useContext(ThreadContext)
  if (context === undefined) {
    throw new Error('useThread must be used within a ThreadProvider')
  }
  return context
}

export function ThreadProvider({ children }: { children: ReactNode }) {
  const [threads, setThreads] = useState<Thread[]>([])
  const { isConnected } = useWebSocket()

  // Load threads from API on component mount
  useEffect(() => {
    loadThreadsFromAPI()
  }, [])

  // Listen for WebSocket messages to update threads in real-time
  useEffect(() => {
    const handleWebSocketMessage = (event: CustomEvent) => {
      try {
        // event.detail might already be an object or a string
        const message = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail
        console.log('📝 ThreadContext: Received WebSocket message:', message.type)
        
        switch (message.type) {
          case 'new_thread':
          case 'thread_created':
            console.log('📝 ThreadContext: New thread received:', message.data)
            addThread(message.data)
            break
          case 'thread_updated':
            console.log('📝 ThreadContext: Thread updated:', message.data)
            updateThread(message.data.id, message.data)
            break
          case 'thread_deleted':
            console.log('📝 ThreadContext: Thread deleted:', message.data.threadId)
            deleteThread(message.data.threadId)
            break
        }
      } catch (error) {
        console.error('❌ ThreadContext: Error handling WebSocket message:', error)
      }
    }

    // Add event listener to window for WebSocket messages
    window.addEventListener('websocket-message', handleWebSocketMessage as EventListener)
    
    return () => {
      window.removeEventListener('websocket-message', handleWebSocketMessage as EventListener)
    }
  }, [])

  const loadThreadsFromAPI = async () => {
    try {
      console.log('🔄 Loading threads from API...')
      const response = await fetch('/api/threads', {
        cache: 'no-store', // Always fetch fresh data
        next: { revalidate: 0 }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        // Convert string dates back to Date objects
        const threadsWithDates = data.threads.map((thread: any) => ({
          ...thread,
          createdAt: new Date(thread.createdAt)
        }))
        setThreads(threadsWithDates)
        console.log('✅ Loaded threads:', threadsWithDates.length, 'threads')
      } else {
        console.error('❌ Failed to load threads:', data.error)
      }
    } catch (error) {
      console.error('❌ Error loading threads:', error)
    }
  }

  const addThread = (thread: Thread) => {
    // Normalize incoming thread (WS/API may use snake_case)
    const normalizeThread = (t: any): Thread => {
      const likes = typeof t.likes === 'string' ? JSON.parse(t.likes) : (t.likes || [])
      const dislikes = typeof t.dislikes === 'string' ? JSON.parse(t.dislikes) : (t.dislikes || [])
      const attachments = typeof t.attachments === 'string' ? JSON.parse(t.attachments) : (t.attachments || [])
      return {
        id: t.id,
        authorId: t.authorId || t.author_id,
        content: t.content,
        createdAt: new Date(t.createdAt || t.created_at || Date.now()),
        likes,
        dislikes,
        comments: t.comments || [],
        replies: t.replies || [],
        parentId: t.parentId || t.parent_id,
        visibility: t.visibility || 'public',
        topicDayId: t.topicDayId || t.topic_day_id,
        groupId: t.groupId || t.group_id,
        attachments
      }
    }

    const normalized = normalizeThread(thread)
    console.log('addThread called with (normalized):', normalized)
    console.log('Current threads before add:', threads.length)
    
    if (normalized.parentId) {
      // This is a reply, add it to the parent thread's replies
      setThreads(prev => {
        // Prevent duplicate replies
        const parent = prev.find(t => t.id === normalized.parentId)
        if (parent && parent.replies?.some(r => r.id === normalized.id)) {
          return prev
        }
        const updated = prev.map(t => 
          t.id === normalized.parentId 
            ? { ...t, replies: [...t.replies, normalized] }
            : t
        )
        console.log('Updated threads for reply:', updated.length)
        return updated
      })
    } else {
      // This is a new thread
      setThreads(prev => {
        // Prevent duplicates by id
        if (prev.some(t => t.id === normalized.id)) {
          return prev
        }
        const updated = [normalized, ...prev]
        console.log('Updated threads for new thread:', updated.length)
        console.log('New thread added:', updated[0])
        return updated
      })
    }
  }

  const updateThread = (threadId: string, updates: Partial<Thread>) => {
    setThreads(prev => prev.map(thread => 
      thread.id === threadId ? { ...thread, ...updates } : thread
    ))
  }

  const deleteThread = (threadId: string) => {
    setThreads(prev => prev.filter(thread => thread.id !== threadId))
  }

  const searchThreads = async (query: string): Promise<Thread[]> => {
    try {
      const response = await fetch(`/api/threads/search?q=${encodeURIComponent(query)}`)
      
      if (response.ok) {
        const data = await response.json()
        return data.threads || []
      } else {
        throw new Error('Search failed')
      }
    } catch (error) {
      console.error('Error searching threads:', error)
      return []
    }
  }

  const value: ThreadContextType = {
    threads,
    setThreads,
    addThread,
    updateThread,
    deleteThread,
    loadThreadsFromAPI,
    searchThreads,
  }

  return (
    <ThreadContext.Provider value={value}>
      {children}
    </ThreadContext.Provider>
  )
}

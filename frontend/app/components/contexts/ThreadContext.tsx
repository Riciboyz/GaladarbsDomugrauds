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


export interface EmbeddedAuthor {
  id: string
  username: string
  displayName: string
  avatar?: string
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
  author?: EmbeddedAuthor // iestrādāts autors no backend (lai uzrādītu arī pirms `users` saraksta atjaunināšanas)
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

  const normalizeThread = (t: any, depth = 0): Thread => {
    const safeParse = (v: any, fallback: any) => {
      if (typeof v !== 'string') return v ?? fallback
      try {
        return JSON.parse(v)
      } catch {
        return fallback
      }
    }

    const likes = safeParse(t.likes, [])
    const dislikes = safeParse(t.dislikes, [])
    const attachments = safeParse(t.attachments, [])

    const rawReplies = Array.isArray(t.replies) ? t.replies : []
    const replies = depth >= 1 ? [] : rawReplies.map((r: any) => normalizeThread(r, depth + 1))

    // Iestrādāts autors var nākt gan no REST (rowToThread → `author.avatarUrl`),
    // gan no WebSocket, gan no optimistiskā klienta pievienojuma. Saglabājam to,
    // lai jauni lietotāji netiktu parādīti kā "Unknown User", kamēr `users`
    // saraksts vēl nav atsvaidzināts.
    const rawAuthor = t.author
    const author: EmbeddedAuthor | undefined = rawAuthor && rawAuthor.id
      ? {
          id: rawAuthor.id,
          username: rawAuthor.username || 'unknown',
          displayName: rawAuthor.displayName || rawAuthor.display_name || rawAuthor.username || 'Unknown User',
          avatar: rawAuthor.avatar || rawAuthor.avatarUrl || rawAuthor.avatar_url || undefined,
        }
      : undefined

    return {
      id: t.id,
      authorId: t.authorId || t.author_id,
      content: t.content,
      createdAt: new Date(t.createdAt || t.created_at || Date.now()),
      likes: Array.isArray(likes) ? likes : [],
      dislikes: Array.isArray(dislikes) ? dislikes : [],
      comments: Array.isArray(t.comments) ? t.comments : [],
      replies,
      parentId: t.parentId || t.parent_id,
      visibility: t.visibility || 'public',
      topicDayId: t.topicDayId || t.topic_day_id,
      groupId: t.groupId || t.group_id,
      attachments: Array.isArray(attachments) ? attachments : [],
      author,
    }
  }

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
        const normalizedThreads = (data.threads || []).map((thread: any) => {
          try {
            return normalizeThread(thread)
          } catch (e) {
            // Fall back to minimal safe shape if JSON parsing fails
            return {
              id: thread.id,
              authorId: thread.authorId || thread.author_id,
              content: thread.content,
              createdAt: new Date(thread.createdAt || thread.created_at || Date.now()),
              likes: [],
              dislikes: [],
              comments: [],
              replies: [],
              parentId: thread.parentId || thread.parent_id,
              visibility: thread.visibility || 'public',
              topicDayId: thread.topicDayId || thread.topic_day_id,
              groupId: thread.groupId || thread.group_id,
              attachments: [],
            } as Thread
          }
        })
        setThreads(normalizedThreads)
        console.log('✅ Loaded threads:', normalizedThreads.length, 'threads')
      } else {
        console.error('❌ Failed to load threads:', data.error)
      }
    } catch (error) {
      console.error('❌ Error loading threads:', error)
    }
  }

  const addThread = (thread: Thread) => {
    // Normalize incoming thread (WS/API may use snake_case)
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

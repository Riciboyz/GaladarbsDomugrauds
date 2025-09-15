'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Types
export interface Comment {
  id: string
  authorId: string
  content: string
  createdAt: Date
  likes: string[]
  dislikes: string[]
}

export interface Thread {
  id: string
  authorId: string
  content: string
  createdAt: Date
  likes: string[]
  dislikes: string[]
  comments: Comment[]
  replies: Thread[]
  parentId?: string
  visibility: 'public' | 'followers'
  topicDayId?: string
  groupId?: string
  attachments?: string[]
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

  // Load threads from API on component mount
  useEffect(() => {
    loadThreadsFromAPI()
  }, [])

  const loadThreadsFromAPI = async () => {
    try {
      console.log('🔄 Loading threads from API...')
      const response = await fetch('/api/threads')
      
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
    console.log('addThread called with:', thread)
    console.log('Current threads before add:', threads.length)
    
    if (thread.parentId) {
      // This is a reply, add it to the parent thread's replies
      setThreads(prev => {
        const updated = prev.map(t => 
          t.id === thread.parentId 
            ? { ...t, replies: [...t.replies, thread] }
            : t
        )
        console.log('Updated threads for reply:', updated.length)
        return updated
      })
    } else {
      // This is a new thread
      setThreads(prev => {
        const updated = [thread, ...prev]
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

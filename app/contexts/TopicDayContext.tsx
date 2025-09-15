'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

// Types
export interface TopicDay {
  id: string
  title: string
  description: string
  date: string
  time?: string
  location?: string
  maxParticipants: number
  participants?: string[]
  threads?: string[]
}

// Context
interface TopicDayContextType {
  topicDays: TopicDay[]
  setTopicDays: (topicDays: TopicDay[]) => void
  addTopicDay: (topicDay: TopicDay) => void
  createTopicDay: (topicDayData: any) => Promise<void>
}

const TopicDayContext = createContext<TopicDayContextType | undefined>(undefined)

export function useTopicDay() {
  const context = useContext(TopicDayContext)
  if (context === undefined) {
    throw new Error('useTopicDay must be used within a TopicDayProvider')
  }
  return context
}

// Mock data
const mockTopicDays: TopicDay[] = [
  {
    id: '1',
    title: 'Show your pet',
    description: 'Share a photo or story about your beloved pet!',
    date: '2023-12-01',
    time: '14:00',
    location: 'Online',
    maxParticipants: 50,
    participants: [],
    threads: [],
  },
  {
    id: '2',
    title: 'Favorite food',
    description: 'What\'s your favorite dish? Share your culinary preferences!',
    date: '2023-12-02',
    time: '16:30',
    location: 'Conference Room A',
    maxParticipants: 30,
    participants: [],
    threads: [],
  },
]

export function TopicDayProvider({ children }: { children: ReactNode }) {
  const [topicDays, setTopicDays] = useState<TopicDay[]>(mockTopicDays)

  const addTopicDay = (topicDay: TopicDay) => {
    setTopicDays(prev => [...prev, topicDay])
  }

  const createTopicDay = async (topicDayData: any) => {
    try {
      const response = await fetch('/api/topic-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(topicDayData),
      })

      if (response.ok) {
        const data = await response.json()
        addTopicDay(data.topicDay)
      } else {
        throw new Error('Failed to create topic day')
      }
    } catch (err) {
      console.error('Error creating topic day:', err)
      throw err
    }
  }

  const value: TopicDayContextType = {
    topicDays,
    setTopicDays,
    addTopicDay,
    createTopicDay,
  }

  return (
    <TopicDayContext.Provider value={value}>
      {children}
    </TopicDayContext.Provider>
  )
}

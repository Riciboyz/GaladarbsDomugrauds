'use client'

import { useState, useEffect } from 'react'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { useRouter } from 'next/navigation'
import { CalendarIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

interface DailyTopic {
  id: string
  title: string
  description: string
  is_active: boolean
  created_at: string
  created_by_username: string
  created_by_display_name: string
}

interface DailyTopicBannerProps {
  onTopicClick?: (topicId: string) => void
}

export default function DailyTopicBanner({ onTopicClick }: DailyTopicBannerProps) {
  const [topic, setTopic] = useState<DailyTopic | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadActiveTopic()
  }, [])

  // Listen for real-time topic updates
  const { lastMessage } = useWebSocket()
  useEffect(() => {
    if (!lastMessage) return
    const { type, data } = lastMessage
    if (type === 'daily_topic_active_set') {
      setTopic(data)
    } else if (type === 'daily_topic_updated' && topic && data.id === topic.id) {
      setTopic({ ...topic, ...data })
    } else if (type === 'daily_topic_deleted' && topic && data.id === topic.id) {
      setTopic(null)
    }
  }, [lastMessage, topic])

  const loadActiveTopic = async () => {
    try {
      const response = await fetch('/api/daily-topic')
      const data = await response.json()
      
      if (data.success && data.topic) {
        setTopic(data.topic)
      }
    } catch (error) {
      console.error('Error loading daily topic:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClick = () => {
    if (topic) {
      if (onTopicClick) {
        onTopicClick(topic.id)
      } else {
        router.push(`/topic/${topic.id}`)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="bg-surface-2 rounded-2xl p-8 mb-8 border border-border-ui animate-pulse">
        <div className="h-6 bg-border-ui rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-border-ui rounded w-1/2"></div>
      </div>
    )
  }

  if (!topic) {
    return null
  }

  return (
    <div 
      onClick={handleClick}
      className="bg-surface-2 rounded-2xl p-6 mb-6 cursor-pointer border border-border-ui shadow-dg-sm hover:shadow-dg-md transition-shadow duration-200 group"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <CalendarIcon className="w-6 h-6 text-accent" />
            <h2 className="text-xl font-semibold text-ink">Daily Topic</h2>
          </div>
          <h3 className="text-xl font-semibold text-ink mb-1">{topic.title}</h3>
          {topic.description && (
            <p className="text-ink-muted text-sm mb-2 leading-relaxed">{topic.description}</p>
          )}
          <div className="flex items-center gap-4 text-ink-muted text-sm">
            <span>Created by {topic.created_by_display_name}</span>
            <span>•</span>
            <span>{new Date(topic.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-accent">
          <span className="text-sm font-medium">Participate</span>
          <ArrowRightIcon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
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
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-2xl p-6 mb-8 animate-pulse">
        <div className="h-6 bg-white/20 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-white/20 rounded w-1/2"></div>
      </div>
    )
  }

  if (!topic) {
    return null
  }

  return (
    <div 
      onClick={handleClick}
      className="bg-gradient-to-r from-black via-gray-800 to-gray-700 rounded-2xl p-6 mb-8 cursor-pointer hover:shadow-2xl shadow-black/30 transition-all duration-300 transform hover:scale-[1.02] group border border-gray-800"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <CalendarIcon className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Daily Topic</h2>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">{topic.title}</h3>
          {topic.description && (
            <p className="text-white/90 text-sm mb-3">{topic.description}</p>
          )}
          <div className="flex items-center space-x-4 text-white/80 text-sm">
            <span>Created by {topic.created_by_display_name}</span>
            <span>•</span>
            <span>{new Date(topic.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-white group-hover:translate-x-1 transition-transform duration-200">
          <span className="text-sm font-medium">Participate</span>
          <ArrowRightIcon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

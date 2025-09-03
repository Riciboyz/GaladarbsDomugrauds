'use client'

import { useState } from 'react'
import { useApp } from '../providers'
import ThreadCard from './ThreadCard'
import CreateThread from './CreateThread'
import { 
  CalendarDaysIcon,
  PlusIcon,
  FireIcon,
  ClockIcon,
  UsersIcon
} from '@heroicons/react/24/outline'
import { format, isToday, isYesterday, isTomorrow } from 'date-fns'

export default function TopicDays() {
  const { topicDays, threads, addTopicDay, user } = useApp()
  const [showCreateTopic, setShowCreateTopic] = useState(false)
  const [selectedTopicDay, setSelectedTopicDay] = useState<string | null>(null)

  const today = new Date()
  const currentTopicDay = topicDays.find(td => 
    format(new Date(td.date), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
  )

  const getTopicDayThreads = (topicDayId: string) => {
    return threads.filter(thread => thread.topicDayId === topicDayId)
      .sort((a, b) => (b.likes.length - b.dislikes.length) - (a.likes.length - a.dislikes.length))
  }

  const handleCreateTopic = (title: string, description: string) => {
    const newTopicDay = {
      id: Math.random().toString(),
      title,
      description,
      date: new Date(),
      threads: []
    }
    addTopicDay(newTopicDay)
    setShowCreateTopic(false)
  }

  const formatDate = (date: Date) => {
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'MMM d, yyyy')
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-secondary-200 p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Topic Days</h1>
            <p className="text-secondary-500">Daily discussion topics to spark conversations</p>
          </div>
          <button
            onClick={() => setShowCreateTopic(true)}
            className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Create Topic</span>
          </button>
        </div>

        {/* Current Topic Day */}
        {currentTopicDay && (
          <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-6 border border-primary-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <CalendarDaysIcon className="h-5 w-5 text-primary-600" />
                  <span className="text-sm font-medium text-primary-600">Today's Topic</span>
                </div>
                <h2 className="text-xl font-bold text-secondary-900 mb-2">
                  {currentTopicDay.title}
                </h2>
                <p className="text-secondary-600 mb-4">
                  {currentTopicDay.description}
                </p>
                <div className="flex items-center space-x-4 text-sm text-secondary-500">
                  <div className="flex items-center space-x-1">
                    <UsersIcon className="h-4 w-4" />
                    <span>{getTopicDayThreads(currentTopicDay.id).length} threads</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FireIcon className="h-4 w-4" />
                    <span>Popular today</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTopicDay(currentTopicDay.id)}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Join Discussion
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {selectedTopicDay ? (
          /* Topic Day Threads */
          <div>
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setSelectedTopicDay(null)}
                className="flex items-center space-x-2 text-secondary-600 hover:text-secondary-900 transition-colors"
              >
                <span>←</span>
                <span>Back to all topics</span>
              </button>
              <button
                onClick={() => {
                  // Open create thread modal with topic day ID
                }}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Add to Discussion
              </button>
            </div>

            {(() => {
              const topicDay = topicDays.find(td => td.id === selectedTopicDay)
              const topicThreads = getTopicDayThreads(selectedTopicDay)
              
              if (!topicDay) return null

              return (
                <div>
                  <div className="bg-white rounded-xl border border-secondary-200 p-6 mb-6">
                    <h2 className="text-2xl font-bold text-secondary-900 mb-2">
                      {topicDay.title}
                    </h2>
                    <p className="text-secondary-600 mb-4">
                      {topicDay.description}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-secondary-500">
                      <div className="flex items-center space-x-1">
                        <CalendarDaysIcon className="h-4 w-4" />
                        <span>{formatDate(new Date(topicDay.date))}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <UsersIcon className="h-4 w-4" />
                        <span>{topicThreads.length} threads</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {topicThreads.length === 0 ? (
                      <div className="bg-white rounded-xl border border-secondary-200 p-8 text-center">
                        <CalendarDaysIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-secondary-900 mb-2">
                          No discussions yet
                        </h3>
                        <p className="text-secondary-500 mb-4">
                          Be the first to start a discussion about this topic!
                        </p>
                        <button
                          onClick={() => {
                            // Open create thread modal
                          }}
                          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          Start Discussion
                        </button>
                      </div>
                    ) : (
                      topicThreads.map((thread) => (
                        <ThreadCard key={thread.id} thread={thread} />
                      ))
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        ) : (
          /* All Topic Days */
          <div>
            <div className="grid gap-6">
              {topicDays.length === 0 ? (
                <div className="bg-white rounded-xl border border-secondary-200 p-8 text-center">
                  <CalendarDaysIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-secondary-900 mb-2">
                    No topic days yet
                  </h3>
                  <p className="text-secondary-500 mb-4">
                    Create the first topic day to start daily discussions!
                  </p>
                  <button
                    onClick={() => setShowCreateTopic(true)}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Create First Topic
                  </button>
                </div>
              ) : (
                topicDays
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((topicDay) => {
                    const topicThreads = getTopicDayThreads(topicDay.id)
                    const totalLikes = topicThreads.reduce((sum, thread) => sum + thread.likes.length, 0)
                    
                    return (
                      <div
                        key={topicDay.id}
                        className="bg-white rounded-xl border border-secondary-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedTopicDay(topicDay.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <CalendarDaysIcon className="h-5 w-5 text-primary-600" />
                              <span className="text-sm font-medium text-primary-600">
                                {formatDate(new Date(topicDay.date))}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-secondary-900 mb-2">
                              {topicDay.title}
                            </h3>
                            <p className="text-secondary-600 mb-4">
                              {topicDay.description}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-secondary-500">
                              <div className="flex items-center space-x-1">
                                <UsersIcon className="h-4 w-4" />
                                <span>{topicThreads.length} threads</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <FireIcon className="h-4 w-4" />
                                <span>{totalLikes} likes</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm text-secondary-500">Click to view</span>
                          </div>
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Topic Modal */}
      {showCreateTopic && (
        <CreateTopicModal onClose={() => setShowCreateTopic(false)} onCreate={handleCreateTopic} />
      )}
    </div>
  )
}

interface CreateTopicModalProps {
  onClose: () => void
  onCreate: (title: string, description: string) => void
}

function CreateTopicModal({ onClose, onCreate }: CreateTopicModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim() && description.trim()) {
      onCreate(title.trim(), description.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <h2 className="text-xl font-bold text-secondary-900">Create Topic Day</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <span className="text-secondary-500">×</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-secondary-700 mb-2">
                Topic Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Show your pet, Favorite food, etc."
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this topic is about and encourage participation..."
                rows={4}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Create Topic
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

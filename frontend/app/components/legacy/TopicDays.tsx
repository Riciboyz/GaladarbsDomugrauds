'use client'

import { useState } from 'react'
import { useTopicDay } from '../contexts/TopicDayContext'
import Button from './Button'
import Input from './Input'
import { 
  CalendarIcon,
  PlusIcon,
  XMarkIcon,
  ClockIcon,
  UsersIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'

export default function TopicDays() {
  const { topicDays, createTopicDay } = useTopicDay()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTopicDay, setNewTopicDay] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    maxParticipants: 50
  })

  const handleCreateTopicDay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTopicDay.title.trim() || !newTopicDay.date) return

    try {
      await createTopicDay(newTopicDay)
      setNewTopicDay({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        maxParticipants: 50
      })
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating topic day:', error)
    }
  }

  const upcomingTopicDays = topicDays.filter(td => new Date(td.date) >= new Date())
  const pastTopicDays = topicDays.filter(td => new Date(td.date) < new Date())

  return (
    <div className="max-w-4xl mx-auto">
      {/* Ultra-Minimal Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-1 text-gray-900">Topic Days</h1>
            <p className="body-regular text-gray-600 mt-1">Join discussions on trending topics</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            leftIcon={<PlusIcon className="w-4 h-4" />}
          >
            Create Topic Day
          </Button>
        </div>
      </div>

      {/* Upcoming Topic Days */}
      {upcomingTopicDays.length > 0 && (
        <div className="mb-8">
          <h2 className="heading-3 text-gray-900 mb-4">Upcoming</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingTopicDays.map((topicDay) => (
              <div key={topicDay.id} className="card-elevated hover:shadow-lg transition-all duration-200">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <CalendarIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(topicDay.date).toLocaleDateString()}
                      </p>
                      {topicDay.time && (
                        <p className="text-sm text-gray-500">{topicDay.time}</p>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="heading-4 text-gray-900 mb-2">{topicDay.title}</h3>
                  <p className="body-regular text-gray-600 mb-4 line-clamp-3">
                    {topicDay.description}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    {topicDay.location && (
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <div className="w-4 h-4 bg-gray-200 rounded"></div>
                        <span>{topicDay.location}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <UsersIcon className="w-4 h-4" />
                      <span>{topicDay.participants?.length || 0} / {topicDay.maxParticipants} participants</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <ChatBubbleLeftIcon className="w-4 h-4" />
                      <span>{topicDay.threads?.length || 0} discussions</span>
                    </div>
                  </div>
                  
                  <Button className="w-full">
                    Join Discussion
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Topic Days */}
      {pastTopicDays.length > 0 && (
        <div>
          <h2 className="heading-3 text-gray-900 mb-4">Past Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastTopicDays.map((topicDay) => (
              <div key={topicDay.id} className="card opacity-75">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                      <CalendarIcon className="w-6 h-6 text-gray-500" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(topicDay.date).toLocaleDateString()}
                      </p>
                      {topicDay.time && (
                        <p className="text-sm text-gray-500">{topicDay.time}</p>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="heading-4 text-gray-900 mb-2">{topicDay.title}</h3>
                  <p className="body-regular text-gray-600 mb-4 line-clamp-3">
                    {topicDay.description}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    {topicDay.location && (
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <div className="w-4 h-4 bg-gray-200 rounded"></div>
                        <span>{topicDay.location}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <UsersIcon className="w-4 h-4" />
                      <span>{topicDay.participants?.length || 0} participants</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <ChatBubbleLeftIcon className="w-4 h-4" />
                      <span>{topicDay.threads?.length || 0} discussions</span>
                    </div>
                  </div>
                  
                  <Button variant="secondary" className="w-full" disabled>
                    Event Ended
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {topicDays.length === 0 && (
        <div className="card p-12 text-center">
          <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="heading-3 text-gray-900 mb-2">No topic days yet</h3>
          <p className="body-regular text-gray-600 mb-6">
            Create your first topic day to start meaningful discussions
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
          >
            Create First Topic Day
          </Button>
        </div>
      )}

      {/* Create Topic Day Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-elevated w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="heading-3 text-gray-900">Create Topic Day</h3>
              <Button
                onClick={() => setShowCreateModal(false)}
                variant="ghost"
                size="sm"
              >
                <XMarkIcon className="w-5 h-5" />
              </Button>
            </div>
            
            <form onSubmit={handleCreateTopicDay} className="p-6 space-y-4">
              <Input
                label="Title"
                value={newTopicDay.title}
                onChange={(e) => setNewTopicDay(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter topic title"
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newTopicDay.description}
                  onChange={(e) => setNewTopicDay(prev => ({ ...prev, description: e.target.value }))}
                  className="input-textarea h-24"
                  placeholder="Describe the topic and what you'll discuss..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date"
                  type="date"
                  value={newTopicDay.date}
                  onChange={(e) => setNewTopicDay(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
                <Input
                  label="Time"
                  type="time"
                  value={newTopicDay.time}
                  onChange={(e) => setNewTopicDay(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
              
              <Input
                label="Location (Optional)"
                value={newTopicDay.location}
                onChange={(e) => setNewTopicDay(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Online, Conference Room A"
              />
              
              <Input
                label="Max Participants"
                type="number"
                value={newTopicDay.maxParticipants}
                onChange={(e) => setNewTopicDay(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) || 50 }))}
                min="1"
                max="1000"
              />
            </form>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-100">
              <Button
                onClick={() => setShowCreateModal(false)}
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTopicDay}
              >
                Create Topic Day
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
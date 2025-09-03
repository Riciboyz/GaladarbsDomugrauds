'use client'

import { useState } from 'react'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

interface Event {
  id: string
  title: string
  date: Date
  time?: string
  color?: string
  description?: string
}

interface CalendarProps {
  events?: Event[]
  onDateClick?: (date: Date) => void
  onEventClick?: (event: Event) => void
  onEventAdd?: (date: Date) => void
  className?: string
  showWeekends?: boolean
  startOfWeek?: 'sunday' | 'monday'
}

export default function Calendar({
  events = [],
  onDateClick,
  onEventClick,
  onEventAdd,
  className = '',
  showWeekends = true,
  startOfWeek = 'sunday'
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = startOfWeek === 'sunday' 
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    return startOfWeek === 'monday' ? (firstDay + 6) % 7 : firstDay
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      event.date.toDateString() === date.toDateString()
    )
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-24 border border-secondary-200" />
      )
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dayEvents = getEventsForDate(date)
      const isCurrentDay = isToday(date)
      const isCurrentMonthDay = isCurrentMonth(date)

      days.push(
        <div
          key={day}
          className={`h-24 border border-secondary-200 p-2 cursor-pointer hover:bg-secondary-50 transition-colors ${
            isCurrentDay ? 'bg-primary-50 border-primary-200' : ''
          } ${!isCurrentMonthDay ? 'text-secondary-400' : ''}`}
          onClick={() => onDateClick?.(date)}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm font-medium ${isCurrentDay ? 'text-primary-600' : ''}`}>
              {day}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEventAdd?.(date)
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-secondary-200 rounded transition-all"
            >
              <PlusIcon className="h-3 w-3 text-secondary-500" />
            </button>
          </div>
          
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map((event) => (
              <div
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onEventClick?.(event)
                }}
                className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: event.color || '#3B82F6' }}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-secondary-500">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        </div>
      )
    }

    return days
  }

  return (
    <div className={`bg-white rounded-lg border border-secondary-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-secondary-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-secondary-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded transition-colors"
          >
            Today
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-secondary-100 rounded transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 text-secondary-600" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-secondary-100 rounded transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5 text-secondary-600" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-0 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-secondary-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-0">
          {renderCalendarDays()}
        </div>
      </div>
    </div>
  )
}

// Hook for calendar state management
export function useCalendar() {
  const [events, setEvents] = useState<Event[]>([])

  const addEvent = (event: Omit<Event, 'id'>) => {
    const newEvent: Event = {
      ...event,
      id: Math.random().toString(36).substr(2, 9)
    }
    setEvents(prev => [...prev, newEvent])
  }

  const updateEvent = (eventId: string, updates: Partial<Event>) => {
    setEvents(prev => prev.map(event =>
      event.id === eventId ? { ...event, ...updates } : event
    ))
  }

  const deleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(event => event.id !== eventId))
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      event.date.toDateString() === date.toDateString()
    )
  }

  return {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate
  }
}
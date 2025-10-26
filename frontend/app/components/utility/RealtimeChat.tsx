'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '../contexts/UserContext'
import { 
  PaperAirplaneIcon,
  UserGroupIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface RealtimeChatProps {
  groupId?: string
  onClose?: () => void
}

interface Message {
  id: string
  authorId: string
  content: string
  createdAt: Date
  type: 'text' | 'image' | 'emoji'
}

export default function RealtimeChat({ groupId, onClose }: RealtimeChatProps) {
  const { user, users } = useUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Mock WebSocket connection (in real app, use Socket.IO)
  useEffect(() => {
    // Simulate real-time message updates
    const interval = setInterval(() => {
      // This would be replaced with actual WebSocket events
      if (Math.random() > 0.95) { // 5% chance every second
        const randomUser = users[Math.floor(Math.random() * users.length)]
        if (randomUser && randomUser.id !== user?.id) {
          const newMsg: Message = {
            id: Date.now().toString(),
            authorId: randomUser.id,
            content: 'This is a real-time message! 🚀',
            createdAt: new Date(),
            type: 'text'
          }
          setMessages(prev => [...prev, newMsg])
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [users, user])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return

    const message: Message = {
      id: Date.now().toString(),
      authorId: user.id,
      content: newMessage.trim(),
      createdAt: new Date(),
      type: 'text'
    }

    setMessages(prev => [...prev, message])
    setNewMessage('')
    setIsTyping(false)

    // In a real app, this would send via WebSocket
    // socket.emit('send_message', { message, groupId })
  }

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    
    if (!isTyping) {
      setIsTyping(true)
      // In a real app, emit typing start
      // socket.emit('typing_start', { groupId, userId: user?.id })
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      // In a real app, emit typing stop
      // socket.emit('typing_stop', { groupId, userId: user?.id })
    }, 1000)
  }

  const getAuthor = (authorId: string) => {
    return users.find(u => u.id === authorId)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (!user) return null

  return (
    <div className="flex flex-col h-96 bg-white rounded-xl border border-gray-200 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <UserGroupIcon className="w-6 h-6 text-gray-600" />
          <div>
            <h3 className="font-semibold text-gray-900">
              {groupId ? 'Group Chat' : 'Real-time Chat'}
            </h3>
            <p className="text-sm text-gray-500">
              {typingUsers.length > 0 
                ? `${typingUsers.length} user${typingUsers.length > 1 ? 's' : ''} typing...`
                : 'Online'
              }
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="btn-icon"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <UserGroupIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const author = getAuthor(message.authorId)
            const isOwnMessage = message.authorId === user.id

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwnMessage
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {!isOwnMessage && author && (
                    <p className="text-xs font-medium mb-1 opacity-75">
                      {author.displayName}
                    </p>
                  )}
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

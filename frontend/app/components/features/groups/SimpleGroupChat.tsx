'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '../../contexts/UserContext'
import { useToast } from '../../contexts/ToastContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { 
  PaperAirplaneIcon,
  PhotoIcon,
  PaperClipIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface SimpleGroupChatProps {
  group: any
  onClose: () => void
}

interface Message {
  id: string
  group_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'image' | 'file'
  attachment_url?: string
  created_at: string
  username: string
  display_name: string
  avatar?: string
}

export default function SimpleGroupChat({ group, onClose }: SimpleGroupChatProps) {
  const { user } = useUser()
  const { success, error: showError } = useToast()
  const { isConnected, joinGroup, leaveGroup, sendGroupMessage, lastMessage } = useWebSocket()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!group?.id || !user) return
    joinGroup(group.id)
    return () => {
      leaveGroup(group.id)
    }
  }, [group?.id, user?.id, joinGroup, leaveGroup])

  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'group_message') return
    const message = lastMessage.data as Message
    if (message.group_id !== group?.id) return
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev
      return [...prev, message]
    })
  }, [lastMessage, group?.id])

  // Load messages
  useEffect(() => {
    if (group?.id) {
      loadMessages()
    }
  }, [group?.id])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    if (!group?.id) return
    
    try {
      setIsLoading(true)
      console.log('📥 SimpleGroupChat: Loading messages for group:', group.id)
      
      const response = await fetch(`/api/groups/chat?groupId=${group.id}&limit=50`, {
        credentials: 'include',
      })
      const data = await response.json()
      
      if (response.ok && data.success) {
        console.log('📥 SimpleGroupChat: Loaded messages:', data.messages.length)
        setMessages(data.messages.reverse())
      } else {
        console.error('❌ SimpleGroupChat: Error loading messages:', data.error)
      }
    } catch (error) {
      console.error('❌ SimpleGroupChat: Error loading messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || !group?.id) return

    const messageContent = newMessage.trim()
    if (isConnected) {
      const sent = sendGroupMessage(group.id, messageContent, 'text')
      if (sent) {
        setNewMessage('')
        return
      }
    }
    try {
      const response = await fetch('/api/groups/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          groupId: group.id,
          content: messageContent,
          messageType: 'text'
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }
      setNewMessage('')
      if (!isConnected) {
        // Keep UX working even when realtime socket is down.
        await loadMessages()
      }
    } catch (error) {
      console.error('❌ SimpleGroupChat: Error sending message:', error)
      showError('Send Message', 'Failed to send message')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !group?.id) return

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      showError('File Too Large', 'File must be less than 50MB')
      return
    }

    // Determine file type and icon
    let messageType: 'image' | 'file' = 'file'
    let fileIcon = '📎'
    
    if (file.type.startsWith('image/')) {
      messageType = 'image'
      fileIcon = '📷'
    } else if (file.type.startsWith('video/')) {
      fileIcon = '🎥'
    } else if (file.type.startsWith('audio/')) {
      fileIcon = '🎵'
    } else if (file.type.includes('pdf')) {
      fileIcon = '📄'
    } else if (file.type.includes('document') || file.type.includes('word')) {
      fileIcon = '📝'
    } else if (file.type.includes('zip') || file.type.includes('rar')) {
      fileIcon = '🗜️'
    }

    try {
      setIsUploading(true)
      
      // Upload file
      const formData = new FormData()
      formData.append('file', file)
      
      const uploadResponse = await fetch('/api/upload/chat', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      const uploadData = await uploadResponse.json()
      
      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Upload failed')
      }

      // Send file message
      const content = `${fileIcon} ${file.name}`
      if (isConnected) {
        const sent = sendGroupMessage(group.id, content, messageType, uploadData.url)
        if (sent) {
          success('File Sent', 'File uploaded and sent successfully!')
          return
        }
      }
      
      const messageResponse = await fetch('/api/groups/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          groupId: group.id,
          content: content,
          messageType: messageType,
          attachmentUrl: uploadData.url
        })
      })

      const messageData = await messageResponse.json()
      
      if (!messageResponse.ok) {
        throw new Error(messageData.error || 'Failed to send file')
      }

      if (!isConnected) {
        await loadMessages()
      }
      success('File Sent', 'File uploaded and sent successfully!')
      
    } catch (error) {
      console.error('❌ SimpleGroupChat: Error uploading file:', error)
      showError('Upload Failed', 'Failed to upload file. Please try again.')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60)
    
    if (diffInMinutes < 1) {
      return 'just now'
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m ago`
    } else if (diffInMinutes < 1440) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const isOwnMessage = (message: Message) => {
    return message.sender_id === user?.id
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="card-elevated flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-ui">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center">
                {group?.avatar ? (
                  <img src={group.avatar} alt={group.name} className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <span className="text-lg font-semibold text-ink-muted">
                    {group?.name?.charAt(0) || 'G'}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="heading-4 text-ink">{group?.name || 'Group Chat'}</h3>
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`} title={isConnected ? 'Connected' : 'Disconnected'}></div>
                </div>
                <p className="text-sm text-ink-muted">
                  {group?.memberCount || group?.members?.length || 0} members
                  {isConnected && ' • Real-time enabled'}
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="btn-icon"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-ink-muted">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex space-x-2 max-w-xs lg:max-w-md ${isOwnMessage(message) ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {!isOwnMessage(message) && (
                        <div className="w-8 h-8 bg-border-ui rounded-full flex items-center justify-center flex-shrink-0">
                          {message.avatar ? (
                            <img src={message.avatar} alt={message.username} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium text-ink-muted">
                              {message.username?.charAt(0) || 'U'}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className={`px-4 py-2 rounded-lg ${
                        isOwnMessage(message)
                          ? 'bg-accent text-accent-fg'
                          : 'bg-surface text-ink'
                      }`}>
                        {!isOwnMessage(message) && (
                          <p className="text-xs font-medium mb-1 opacity-75">
                            @{message.username}
                          </p>
                        )}
                        <p className="text-sm">{message.content}</p>
                        {message.message_type === 'image' && message.attachment_url && (
                          <div className="mt-2">
                            <img 
                              src={message.attachment_url} 
                              alt="Chat image"
                              className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setSelectedImage(message.attachment_url || '')}
                            />
                          </div>
                        )}
                        {message.message_type === 'file' && message.attachment_url && (
                          <div className="mt-2">
                            <a
                              href={message.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-2 px-4 py-2 bg-surface-2 hover:bg-border-ui rounded-lg transition-colors"
                            >
                              <PaperClipIcon className="w-4 h-4 text-ink-muted" />
                              <span className="text-sm font-medium text-ink">
                                {message.content.replace(/^[^\s]+ /, '')}
                              </span>
                              <span className="text-xs text-ink-muted">Download</span>
                            </a>
                          </div>
                        )}
                        <p className={`text-xs mt-1 ${
                          isOwnMessage(message) ? 'text-accent-fg/75' : 'text-ink-muted'
                        }`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-border-ui">
            <form onSubmit={sendMessage} className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="input pr-12"
                  disabled={!user}
                />
                
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-icon text-ink-muted/60 hover:text-ink"
                    title="Attach files"
                  >
                    <PaperClipIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className={`btn-icon transition-colors ${
                      isUploading 
                        ? 'text-ink-muted/40 cursor-not-allowed' 
                        : 'text-ink-muted/60 hover:text-ink'
                    }`}
                    title={isUploading ? 'Uploading...' : 'Attach image'}
                  >
                    {isUploading ? (
                      <div className="w-4 h-4 border-2 border-border-ui border-t-ink rounded-full animate-spin"></div>
                    ) : (
                      <PhotoIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar,.mp4,.mp3,.wav,.avi,.mov,.png,.jpg,.jpeg,.gif,.svg"
                />
              </div>
              
              <button
                type="submit"
                disabled={!newMessage.trim() || !user || isUploading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-white/70 transition-colors z-10"
            >
              <XMarkIcon className="w-8 h-8" />
            </button>
            <img 
              src={selectedImage} 
              alt="Enlarged chat image"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useUser } from '../contexts/UserContext'
import { useToast } from '../contexts/ToastContext'
import { useWebSocket } from '../contexts/WebSocketContext'
import { useGroup } from '../contexts/GroupContext'
import { 
  PaperAirplaneIcon,
  PhotoIcon,
  PaperClipIcon,
  XMarkIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'

interface GroupChatProps {
  group: any
  onClose: () => void
}

interface Message {
  id: string
  group_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'image' | 'file' | 'system'
  attachment_url?: string
  created_at: string
  username: string
  display_name: string
  avatar?: string
}

export default function GroupChat({ group, onClose }: GroupChatProps) {
  const { user } = useUser()
  const { success, error: showError } = useToast()
  const { sendGroupMessage, sendTyping, sendStopTyping } = useWebSocket()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // WebSocket connection
  const { 
    isConnected, 
    lastMessage,
    joinGroup, 
    leaveGroup
  } = useWebSocket()

  // Track joined groups to prevent spam
  const joinedGroupsRef = useRef(new Set<string>())
  const currentGroupRef = useRef<string | null>(null)
  const isJoiningRef = useRef(false)
  
  // Store functions in refs to avoid dependency issues
  const joinGroupRef = useRef(joinGroup)
  const leaveGroupRef = useRef(leaveGroup)
  
  // Update refs when functions change
  joinGroupRef.current = joinGroup
  leaveGroupRef.current = leaveGroup

  // Join group when WebSocket connects (only once per group)
  useEffect(() => {
    console.log('🔍 GroupChat: useEffect triggered', { 
      isConnected, 
      groupId: group.id, 
      hasJoined: joinedGroupsRef.current.has(group.id),
      isJoining: isJoiningRef.current,
      currentGroup: currentGroupRef.current
    })
    
    // Prevent multiple simultaneous joins
    if (isJoiningRef.current) {
      console.log('🚫 Already joining, skipping')
      return
    }
    
    // If group changed, leave previous group
    if (currentGroupRef.current && currentGroupRef.current !== group.id) {
      console.log('👋 Leaving previous group:', currentGroupRef.current)
      leaveGroupRef.current(currentGroupRef.current)
      joinedGroupsRef.current.delete(currentGroupRef.current)
      currentGroupRef.current = null
    }
    
    // Join new group if connected and not already joined
    if (isConnected && group.id && !joinedGroupsRef.current.has(group.id)) {
      console.log('👥 Joining group:', group.id)
      isJoiningRef.current = true
      const success = joinGroupRef.current(group.id)
      if (success) {
        joinedGroupsRef.current.add(group.id)
        currentGroupRef.current = group.id
        console.log('✅ Successfully joined group:', group.id)
      } else {
        console.log('❌ Failed to join group:', group.id)
      }
      
      // Reset joining flag after a short delay
      setTimeout(() => {
        isJoiningRef.current = false
      }, 1000)
    } else {
      console.log('🚫 Not joining group:', { isConnected, groupId: group.id, hasJoined: joinedGroupsRef.current.has(group.id) })
    }
  }, [isConnected, group.id]) // Removed all function dependencies

  // Leave group when component unmounts
  useEffect(() => {
    return () => {
      if (isConnected && currentGroupRef.current) {
        console.log('👋 Leaving group on unmount:', currentGroupRef.current)
        leaveGroupRef.current(currentGroupRef.current)
        joinedGroupsRef.current.delete(currentGroupRef.current)
        currentGroupRef.current = null
      }
    }
  }, []) // Empty dependency array - only run on unmount
  // React to site-wide websocket messages relevant to this group
  useEffect(() => {
    const handleWebSocketMessage = (event: CustomEvent) => {
      try {
        const message = JSON.parse(event.detail)
        const { type, data } = message

        // Normalize helper to our Message shape
        const normalize = (m: any): Message => ({
          id: m.id,
          group_id: m.group_id || m.groupId || group.id,
          sender_id: m.sender_id || m.senderId,
          content: m.content,
          message_type: m.message_type || m.messageType || 'text',
          attachment_url: m.attachment_url || m.attachmentUrl,
          created_at: m.created_at || m.createdAt || new Date().toISOString(),
          username: m.username,
          display_name: m.display_name || m.displayName,
          avatar: m.avatar
        })

        if (type === 'group_message' || type === 'message_sent') {
          console.log('💬 GroupChat: Received group message:', { type, data, groupId: group.id })
          const msgObj = data?.message ? data.message : data
          const msgGroupId = msgObj?.group_id || msgObj?.groupId
          console.log('💬 GroupChat: Message group ID:', msgGroupId, 'Current group ID:', group.id)
          if (msgGroupId === group.id) {
            const normalized = normalize(msgObj)
            console.log('💬 GroupChat: Adding message to chat:', normalized)
            setMessages(prev => {
              if (prev.some(m => m.id === normalized.id)) {
                console.log('💬 GroupChat: Message already exists, skipping')
                return prev
              }
              console.log('💬 GroupChat: Adding new message to state')
              return [...prev, normalized]
            })
            scrollToBottom()
          } else {
            console.log('💬 GroupChat: Message not for this group, ignoring')
          }
        }
        if ((type === 'user_typing' || type === 'user_stopped_typing') && data?.groupId === group.id) {
          if (type === 'user_typing') {
            setTypingUsers(prev => Array.from(new Set([...prev, data.userId])))
          } else {
            setTypingUsers(prev => prev.filter(id => id !== data.userId))
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message in GroupChat:', error)
      }
    }

    // Listen for WebSocket messages
    window.addEventListener('websocket-message', handleWebSocketMessage as EventListener)
    
    return () => {
      window.removeEventListener('websocket-message', handleWebSocketMessage as EventListener)
    }
  }, [group.id])

  useEffect(() => {
    loadMessages()
  }, [group.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  // Close image modal with Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedImage) {
        setSelectedImage(null)
      }
    }

    if (selectedImage) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedImage])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true)
      const response = await fetch(`/api/groups/chat?groupId=${group.id}&limit=50`)
      if (response.status === 404) {
        // Group not found or no messages endpoint -> treat as empty gracefully
        setMessages([])
        return
      }
      const data = await response.json()
      if (response.ok && data.success) {
        const newMessages = (data.messages || []).reverse()
        // Only update if messages actually changed
        setMessages(prevMessages => {
          if (prevMessages.length !== newMessages.length || 
              prevMessages[prevMessages.length - 1]?.id !== newMessages[newMessages.length - 1]?.id) {
            return newMessages
          }
          return prevMessages
        })
      } else {
        throw new Error(data.error || 'Failed to load messages')
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      // Avoid noisy toasts when there are just no messages
      // Only show toast for real errors (non-404)
      // Note: response status not available here, so keep console error only
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

    const messageContent = newMessage.trim()
    
    // Send via WebSocket if connected, otherwise fallback to API
    if (isConnected) {
      sendGroupMessage(group.id, messageContent, 'text')
      // Optimistic add for sender; WS echo will be de-duplicated by id
      const optimisticMsg: Message = {
        id: `tmp_${Date.now()}`,
        group_id: group.id,
        sender_id: user.id,
        content: messageContent,
        message_type: 'text',
        created_at: new Date().toISOString(),
        username: user.username,
        display_name: user.displayName,
        avatar: user.avatar
      }
      setMessages(prev => [...prev, optimisticMsg])
      setNewMessage('')
      scrollToBottom()
      return
    } else {
      // Fallback to API
      try {
        const response = await fetch('/api/groups/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: group.id,
            content: messageContent,
            messageType: 'text'
          })
        })

        const data = await response.json()
        
        if (response.ok) {
          setNewMessage('')
          // Add the new message to the list
          const newMsg: Message = {
            id: data.messageId,
            group_id: group.id,
            sender_id: user.id,
            content: messageContent,
            message_type: 'text',
            created_at: new Date().toISOString(),
            username: user.username,
            display_name: user.displayName,
            avatar: user.avatar
          }
          setMessages(prev => [...prev, newMsg])
        } else {
          throw new Error(data.error || 'Failed to send message')
        }
      } catch (error) {
        console.error('Error sending message:', error)
        showError('Send Message', 'Failed to send message')
      }
    }
  }

  const handleImageButtonClick = () => {
    fileInputRef.current?.click()
  }

  // Handle typing indicators
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    
    if (isConnected && !isTyping) {
      sendTyping(group.id)
      setIsTyping(true)
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (isConnected) {
        sendStopTyping(group.id)
        setIsTyping(false)
      }
    }, 1000)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file size (50MB max for all files)
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
      const messageResponse = await fetch('/api/groups/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          groupId: group.id,
          content: `${fileIcon} ${file.name}`,
          messageType: messageType,
          attachmentUrl: uploadData.url
        })
      })

      const messageData = await messageResponse.json()
      
      if (!messageResponse.ok) {
        throw new Error(messageData.error || 'Failed to send file')
      }

      // Clear input and append locally for instant feedback
      e.target.value = ''
      const localMsg: Message = {
        id: messageData.messageId,
        group_id: group.id,
        sender_id: user.id,
        content: `${fileIcon} ${file.name}`,
        message_type: messageType,
        attachment_url: uploadData.url,
        created_at: new Date().toISOString(),
        username: user.username,
        display_name: user.displayName,
        avatar: user.avatar
      }
      setMessages(prev => [...prev, localMsg])
      success('File Sent', 'File uploaded and sent successfully!')
      
    } catch (error) {
      console.error('Error uploading file:', error)
      showError('Upload Failed', 'Failed to upload file. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60)
    const diffInHours = diffInMinutes / 60
    
    if (diffInMinutes < 1) {
      return 'just now'
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m ago`
    } else if (diffInHours < 24) {
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
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                {group.avatar ? (
                  <img src={group.avatar} alt={group.name} className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <span className="text-lg font-semibold text-gray-600">
                    {group.name.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="heading-4 text-gray-900">{group.name}</h3>
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`} title={isConnected ? 'Connected' : 'Disconnected'}></div>
                </div>
                <p className="text-sm text-gray-500">
                  {group.memberCount || group.members?.length || 0} members
                  {isConnected && ' • Real-time enabled'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="relative">
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  className="btn-icon"
                >
                  <EllipsisVerticalIcon className="w-5 h-5" />
                </button>
                
                {showOptions && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                    <button
                      onClick={() => {
                        setShowOptions(false)
                        // Add group management functionality here
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Group Settings
                    </button>
                    <button
                      onClick={() => {
                        setShowOptions(false)
                        // Add member list functionality here
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      View Members
                    </button>
                  </div>
                )}
              </div>
              
              <button
                onClick={onClose}
                className="btn-icon"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-gray-500">No messages yet. Start the conversation!</p>
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
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                          {message.avatar ? (
                            <img src={message.avatar} alt={message.username} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium text-gray-600">
                              {message.username?.charAt(0) || 'U'}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className={`px-4 py-2 rounded-lg ${
                        isOwnMessage(message)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
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
                              className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              <PaperClipIcon className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700">
                                {message.content.replace(/^[^\s]+ /, '')} {/* Remove emoji and space */}
                              </span>
                              <span className="text-xs text-gray-500">Download</span>
                            </a>
                          </div>
                        )}
                        <p className={`text-xs mt-1 ${
                          isOwnMessage(message) ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Typing indicators */}
                {typingUsers.length > 0 && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500 italic">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span>
                      {typingUsers.length === 1 
                        ? `${typingUsers[0]} is typing...`
                        : `${typingUsers.join(', ')} are typing...`
                      }
                    </span>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-100">
            <form onSubmit={sendMessage} className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="input pr-12"
                  disabled={!user}
                />
                
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-icon text-gray-400 hover:text-gray-600"
                    title="Attach files (images, videos, documents, etc.)"
                  >
                    <PaperClipIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleImageButtonClick}
                    disabled={isUploading}
                    className={`btn-icon transition-colors ${
                      isUploading 
                        ? 'text-gray-300 cursor-not-allowed' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title={isUploading ? 'Uploading...' : 'Attach image'}
                  >
                    {isUploading ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
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
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
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

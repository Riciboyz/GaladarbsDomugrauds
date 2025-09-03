'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import ToastContainer, { useToast, Toast } from './components/Toast'

// Types
export interface User {
  id: string
  username: string
  displayName: string
  email: string
  avatar?: string
  bio?: string
  followers: string[]
  following: string[]
  createdAt: Date
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
}

export interface Comment {
  id: string
  authorId: string
  content: string
  createdAt: Date
  likes: string[]
  dislikes: string[]
}

export interface TopicDay {
  id: string
  title: string
  description: string
  date: Date
  threads: string[]
}

export interface Group {
  id: string
  name: string
  description?: string
  avatar?: string
  members: string[]
  admins: string[]
  isPublic: boolean
  createdAt: Date
  threads: string[]
}

export interface Notification {
  id: string
  userId: string
  type: 'like' | 'comment' | 'follow' | 'topic_day' | 'group_invite'
  message: string
  read: boolean
  createdAt: Date
  relatedId?: string
}

// Context
interface AppContextType {
  user: User | null
  setUser: (user: User | null) => void
  threads: Thread[]
  setThreads: (threads: Thread[]) => void
  users: User[]
  setUsers: (users: User[]) => void
  topicDays: TopicDay[]
  setTopicDays: (topicDays: TopicDay[]) => void
  groups: Group[]
  setGroups: (groups: Group[]) => void
  notifications: Notification[]
  setNotifications: (notifications: Notification[]) => void
  addThread: (thread: Thread) => void
  updateThread: (threadId: string, updates: Partial<Thread>) => void
  deleteThread: (threadId: string) => void
  addUser: (user: User) => void
  updateUser: (userId: string, updates: Partial<User>) => void
  addTopicDay: (topicDay: TopicDay) => void
  addGroup: (group: Group) => void
  updateGroup: (groupId: string, updates: Partial<Group>) => void
  addNotification: (notification: Notification) => void
  markNotificationAsRead: (notificationId: string) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within a Providers')
  }
  return context
}

// Mock data
const mockUsers: User[] = [
  {
    id: '1',
    username: 'john_doe',
    displayName: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    bio: 'Software developer and coffee enthusiast ☕ | Building amazing things with code',
    followers: ['2', '3', '4', '5'],
    following: ['2', '3', '4'],
    createdAt: new Date('2023-01-01'),
  },
  {
    id: '2',
    username: 'jane_smith',
    displayName: 'Jane Smith',
    email: 'jane@example.com',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    bio: 'UI/UX Designer 🎨 | Creating beautiful digital experiences',
    followers: ['1', '3', '5', '6'],
    following: ['1', '3'],
    createdAt: new Date('2023-01-02'),
  },
  {
    id: '3',
    username: 'mike_wilson',
    displayName: 'Mike Wilson',
    email: 'mike@example.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    bio: 'Photographer 📸 | Capturing moments around the world',
    followers: ['1', '2', '4', '6'],
    following: ['1', '2', '4'],
    createdAt: new Date('2023-01-03'),
  },
  {
    id: '4',
    username: 'sarah_jones',
    displayName: 'Sarah Jones',
    email: 'sarah@example.com',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    bio: 'Content Creator ✍️ | Sharing stories and insights',
    followers: ['1', '3', '5'],
    following: ['1', '2', '3'],
    createdAt: new Date('2023-01-04'),
  },
  {
    id: '5',
    username: 'alex_chen',
    displayName: 'Alex Chen',
    email: 'alex@example.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    bio: 'Tech Entrepreneur 🚀 | Building the future',
    followers: ['1', '2', '4', '6'],
    following: ['1', '2'],
    createdAt: new Date('2023-01-05'),
  },
  {
    id: '6',
    username: 'emma_brown',
    displayName: 'Emma Brown',
    email: 'emma@example.com',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    bio: 'Marketing Specialist 📈 | Helping brands grow',
    followers: ['2', '3', '5'],
    following: ['2', '3', '4', '5'],
    createdAt: new Date('2023-01-06'),
  },
]

const mockThreads: Thread[] = [
  {
    id: '1',
    authorId: '1',
    content: 'Just finished building this amazing social media app! 🚀 The team worked incredibly hard on this project. #coding #webdev #react',
    createdAt: new Date('2023-12-01T10:00:00'),
    likes: ['2', '3', '4', '5'],
    dislikes: [],
    comments: [
      {
        id: '1',
        authorId: '2',
        content: 'This looks incredible! Great work! 👏',
        createdAt: new Date('2023-12-01T10:15:00'),
        likes: ['1', '3'],
        dislikes: []
      }
    ],
    replies: [],
    visibility: 'public',
  },
  {
    id: '2',
    authorId: '2',
    content: 'Love the new design trends this year! What do you think? #design #ui #ux',
    createdAt: new Date('2023-12-01T11:00:00'),
    likes: ['1', '3', '4'],
    dislikes: [],
    comments: [],
    replies: [],
    visibility: 'public',
  },
  {
    id: '3',
    authorId: '3',
    content: 'Captured this amazing sunset today! Nature never fails to amaze me 🌅 #photography #nature #sunset',
    createdAt: new Date('2023-12-01T12:00:00'),
    likes: ['1', '2', '4', '5', '6'],
    dislikes: [],
    comments: [
      {
        id: '2',
        authorId: '1',
        content: 'Stunning shot! 📸',
        createdAt: new Date('2023-12-01T12:10:00'),
        likes: ['3'],
        dislikes: []
      }
    ],
    replies: [],
    visibility: 'public',
  },
  {
    id: '4',
    authorId: '4',
    content: 'Working on some exciting content for next week! Can\'t wait to share it with you all ✍️ #content #writing',
    createdAt: new Date('2023-12-01T13:00:00'),
    likes: ['1', '2', '3'],
    dislikes: [],
    comments: [],
    replies: [],
    visibility: 'public',
  },
  {
    id: '5',
    authorId: '5',
    content: 'The future of technology is here! Excited about what we\'re building 🚀 #tech #innovation #startup',
    createdAt: new Date('2023-12-01T14:00:00'),
    likes: ['1', '2', '4', '6'],
    dislikes: [],
    comments: [],
    replies: [],
    visibility: 'public',
  },
  {
    id: '6',
    authorId: '6',
    content: 'Marketing tip of the day: Authenticity always wins! Be genuine in your brand voice 💡 #marketing #tips',
    createdAt: new Date('2023-12-01T15:00:00'),
    likes: ['2', '3', '4', '5'],
    dislikes: [],
    comments: [],
    replies: [],
    visibility: 'public',
  },
]

const mockTopicDays: TopicDay[] = [
  {
    id: '1',
    title: 'Show your pet',
    description: 'Share a photo or story about your beloved pet!',
    date: new Date('2023-12-01'),
    threads: [],
  },
  {
    id: '2',
    title: 'Favorite food',
    description: 'What\'s your favorite dish? Share your culinary preferences!',
    date: new Date('2023-12-02'),
    threads: [],
  },
]

const mockGroups: Group[] = [
  {
    id: '1',
    name: 'Tech Enthusiasts',
    description: 'Discussion about latest technology trends and innovations',
    avatar: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=150&h=150&fit=crop',
    members: ['1', '2', '3', '5'],
    admins: ['1'],
    isPublic: true,
    createdAt: new Date('2023-01-01'),
    threads: [],
  },
  {
    id: '2',
    name: 'Design Community',
    description: 'Share your designs and get feedback from fellow designers',
    avatar: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=150&h=150&fit=crop',
    members: ['2', '4', '6'],
    admins: ['2'],
    isPublic: true,
    createdAt: new Date('2023-01-02'),
    threads: [],
  },
  {
    id: '3',
    name: 'Photography Lovers',
    description: 'Showcase your photography and learn from others',
    avatar: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=150&h=150&fit=crop',
    members: ['3', '1', '4'],
    admins: ['3'],
    isPublic: true,
    createdAt: new Date('2023-01-03'),
    threads: [],
  },
  {
    id: '4',
    name: 'Startup Founders',
    description: 'Private group for startup founders to share experiences',
    avatar: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=150&h=150&fit=crop',
    members: ['5', '1'],
    admins: ['5'],
    isPublic: false,
    createdAt: new Date('2023-01-04'),
    threads: [],
  },
]

export function Providers({ children }: { children: ReactNode }) {
  const { toasts, removeToast, success, error } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [threads, setThreads] = useState<Thread[]>(mockThreads)
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [topicDays, setTopicDays] = useState<TopicDay[]>(mockTopicDays)
  const [groups, setGroups] = useState<Group[]>(mockGroups)
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      userId: '1',
      type: 'like',
      message: 'Jane Smith liked your thread',
      read: false,
      createdAt: new Date('2023-12-01T10:30:00'),
      relatedId: '1'
    },
    {
      id: '2',
      userId: '1',
      type: 'follow',
      message: 'Sarah Jones started following you',
      read: false,
      createdAt: new Date('2023-12-01T11:00:00')
    },
    {
      id: '3',
      userId: '1',
      type: 'comment',
      message: 'Mike Wilson commented on your thread',
      read: true,
      createdAt: new Date('2023-12-01T12:00:00'),
      relatedId: '1'
    },
    {
      id: '4',
      userId: '1',
      type: 'topic_day',
      message: 'New topic day: "Show your pet" is now live!',
      read: false,
      createdAt: new Date('2023-12-01T09:00:00'),
      relatedId: '1'
    },
    {
      id: '5',
      userId: '1',
      type: 'group_invite',
      message: 'You\'ve been invited to join "Design Community"',
      read: false,
      createdAt: new Date('2023-12-01T08:00:00'),
      relatedId: '2'
    }
  ])

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  // Save user to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
    }
  }, [user])

  const addThread = (thread: Thread) => {
    setThreads(prev => [thread, ...prev])
    success('Thread posted!', 'Your thread has been shared successfully.')
  }

  const updateThread = (threadId: string, updates: Partial<Thread>) => {
    setThreads(prev => prev.map(thread => 
      thread.id === threadId ? { ...thread, ...updates } : thread
    ))
  }

  const deleteThread = (threadId: string) => {
    setThreads(prev => prev.filter(thread => thread.id !== threadId))
  }

  const addUser = (user: User) => {
    setUsers(prev => [...prev, user])
    success('Welcome!', 'Your account has been created successfully.')
  }

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, ...updates } : user
    ))
  }

  const addTopicDay = (topicDay: TopicDay) => {
    setTopicDays(prev => [...prev, topicDay])
  }

  const addGroup = (group: Group) => {
    setGroups(prev => [...prev, group])
    success('Group created!', 'Your group has been created successfully.')
  }

  const updateGroup = (groupId: string, updates: Partial<Group>) => {
    setGroups(prev => prev.map(group => 
      group.id === groupId ? { ...group, ...updates } : group
    ))
  }

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev])
  }

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(notification => 
      notification.id === notificationId ? { ...notification, read: true } : notification
    ))
  }

  const value: AppContextType = {
    user,
    setUser,
    threads,
    setThreads,
    users,
    setUsers,
    topicDays,
    setTopicDays,
    groups,
    setGroups,
    notifications,
    setNotifications,
    addThread,
    updateThread,
    deleteThread,
    addUser,
    updateUser,
    addTopicDay,
    addGroup,
    updateGroup,
    addNotification,
    markNotificationAsRead,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </AppContext.Provider>
  )
}

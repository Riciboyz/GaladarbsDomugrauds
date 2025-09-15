'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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

// Context
interface UserContextType {
  user: User | null
  setUser: (user: User | null) => void
  users: User[]
  setUsers: (users: User[]) => void
  addUser: (user: User) => void
  updateUser: (user: User, users?: User[]) => void
  loadUsersFromAPI: () => Promise<void>
  followUser: (userId: string) => Promise<boolean>
  unfollowUser: (userId: string) => Promise<boolean>
  isFollowing: (userId: string) => boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
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

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>(mockUsers)

  // Load user from session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if user is logged in via session
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
        if (data.success && data.user) {
          setUser(data.user)
          // Add current user to users array if not already present
          setUsers(prev => {
            const exists = prev.find(u => u.id === data.user.id)
            if (!exists) {
              return [...prev, data.user]
            }
            return prev
          })
          // Load all users from API
          loadUsersFromAPI()
          return
        }
        }
        
        // Fallback to localStorage
        const savedUser = localStorage.getItem('user')
        if (savedUser) {
          try {
            const userData = JSON.parse(savedUser)
            setUser(userData)
            // Add current user to users array if not already present
            setUsers(prev => {
              const exists = prev.find(u => u.id === userData.id)
              if (!exists) {
                return [...prev, userData]
              }
              return prev
            })
          } catch (parseError) {
            localStorage.removeItem('user')
          }
        }
      } catch (error) {
        // Fallback to localStorage
        const savedUser = localStorage.getItem('user')
        if (savedUser) {
          try {
            const userData = JSON.parse(savedUser)
            setUser(userData)
            // Add current user to users array if not already present
            setUsers(prev => {
              const exists = prev.find(u => u.id === userData.id)
              if (!exists) {
                return [...prev, userData]
              }
              return prev
            })
            // Load all users from API
            loadUsersFromAPI()
          } catch (parseError) {
            localStorage.removeItem('user')
          }
        }
      }
    }
    
    checkSession()
  }, [])

  // Load users from API on component mount
  useEffect(() => {
    loadUsersFromAPI()
  }, [])

  // Save user to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
    }
  }, [user])

  const loadUsersFromAPI = async () => {
    try {
      console.log('🔄 Loading users from API...')
      const response = await fetch('/api/users')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        // Convert string dates back to Date objects
        const usersWithDates = data.users.map((user: any) => ({
          ...user,
          createdAt: new Date(user.createdAt)
        }))
        setUsers(usersWithDates)
        console.log('✅ Loaded users:', usersWithDates.length, 'users')
      } else {
        console.error('❌ Failed to load users:', data.error)
      }
    } catch (error) {
      console.error('❌ Error loading users:', error)
    }
  }

  const addUser = (user: User) => {
    setUsers(prev => [...prev, user])
  }

  const updateUser = (updatedUser: User, updatedUsers?: User[]) => {
    console.log('updateUser called:', { updatedUser, updatedUsers })
    
    // Update current user state
    setUser(updatedUser)
    
    // Update users list if provided
    if (updatedUsers) {
      setUsers(updatedUsers)
    } else {
      // Update single user in the list
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u))
    }
  }

  const followUser = async (userId: string): Promise<boolean> => {
    if (!user) return false
    
    try {
      const response = await fetch('/api/users/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: 'follow'
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Update current user's following list
          const updatedUser = {
            ...user,
            following: [...user.following, userId]
          }
          setUser(updatedUser)
          
          // Update the target user's followers list
          setUsers(prev => prev.map(u => 
            u.id === userId 
              ? { ...u, followers: [...u.followers, user.id] }
              : u
          ))
          
          return true
        }
      }
      return false
    } catch (error) {
      console.error('Error following user:', error)
      return false
    }
  }

  const unfollowUser = async (userId: string): Promise<boolean> => {
    if (!user) return false
    
    try {
      const response = await fetch('/api/users/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: 'unfollow'
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Update current user's following list
          const updatedUser = {
            ...user,
            following: user.following.filter(id => id !== userId)
          }
          setUser(updatedUser)
          
          // Update the target user's followers list
          setUsers(prev => prev.map(u => 
            u.id === userId 
              ? { ...u, followers: u.followers.filter(id => id !== user.id) }
              : u
          ))
          
          return true
        }
      }
      return false
    } catch (error) {
      console.error('Error unfollowing user:', error)
      return false
    }
  }

  const isFollowing = (userId: string): boolean => {
    if (!user) return false
    return user.following.includes(userId)
  }

  const value: UserContextType = {
    user,
    setUser,
    users,
    setUsers,
    addUser,
    updateUser,
    loadUsersFromAPI,
    followUser,
    unfollowUser,
    isFollowing,
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

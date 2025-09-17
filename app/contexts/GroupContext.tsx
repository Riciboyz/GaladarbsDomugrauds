'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Types
export interface Group {
  id: string
  name: string
  description?: string
  avatar?: string
  members: string[]
  admins: string[]
  isPublic: boolean
  isPrivate?: boolean
  createdBy: string
  memberCount?: number
  isMember?: boolean
  createdAt: Date | string
  threads: string[]
  creator?: {
    id: string
    username: string
    displayName: string
    avatar?: string
  }
}

// Context
interface GroupContextType {
  groups: Group[]
  setGroups: (groups: Group[]) => void
  addGroup: (group: Group) => void
  updateGroup: (groupId: string, updates: Partial<Group>) => void
  deleteGroup: (groupId: string) => void
  createGroup: (groupData: any) => Promise<void>
  loadGroups: () => Promise<void>
}

const GroupContext = createContext<GroupContextType | undefined>(undefined)

export function useGroup() {
  const context = useContext(GroupContext)
  if (context === undefined) {
    throw new Error('useGroup must be used within a GroupProvider')
  }
  return context
}

// Mock data
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

export function GroupProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>(() => {
    if (typeof window !== 'undefined') {
      const savedGroups = localStorage.getItem('threads-groups')
      if (savedGroups) {
        try {
          return JSON.parse(savedGroups).map((group: any) => ({
            ...group,
            createdAt: new Date(group.createdAt)
          }))
        } catch (error) {
          console.error('Error parsing saved groups:', error)
        }
      }
    }
    return mockGroups
  })

  const addGroup = (group: Group) => {
    setGroups(prev => {
      const newGroups = [...prev, group]
      localStorage.setItem('threads-groups', JSON.stringify(newGroups))
      return newGroups
    })
  }

  const updateGroup = (groupId: string, updates: Partial<Group>) => {
    setGroups(prev => {
      const updatedGroups = prev.map(group => 
        group.id === groupId ? { ...group, ...updates } : group
      )
      localStorage.setItem('threads-groups', JSON.stringify(updatedGroups))
      return updatedGroups
    })
  }

  const deleteGroup = (groupId: string) => {
    setGroups(prev => {
      const filteredGroups = prev.filter(group => group.id !== groupId)
      localStorage.setItem('threads-groups', JSON.stringify(filteredGroups))
      return filteredGroups
    })
  }

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/groups')
      const data = await response.json()
      
      if (data.success) {
        setGroups(data.groups)
      } else {
        console.error('Error loading groups:', data.error)
        // Fallback to mock data
        setGroups(mockGroups)
      }
    } catch (error) {
      console.error('Error loading groups:', error)
      // Fallback to mock data
      setGroups(mockGroups)
    }
  }

  const createGroup = async (groupData: any) => {
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData),
      })

      if (response.ok) {
        const data = await response.json()
        addGroup(data.group)
      } else {
        throw new Error('Failed to create group')
      }
    } catch (err) {
      console.error('Error creating group:', err)
      throw err
    }
  }

  // Load groups on mount
  useEffect(() => {
    loadGroups()
  }, [])

  const value: GroupContextType = {
    groups,
    setGroups,
    addGroup,
    updateGroup,
    deleteGroup,
    createGroup,
    loadGroups,
  }

  return (
    <GroupContext.Provider value={value}>
      {children}
    </GroupContext.Provider>
  )
}

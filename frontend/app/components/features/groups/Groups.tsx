'use client'

import { useState, useEffect } from 'react'
import { useGroup, Group } from '../../contexts/GroupContext'
import { useUser } from '../../contexts/UserContext'
import { useToast } from '../../contexts/ToastContext'
import { 
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  UsersIcon,
  ChatBubbleLeftIcon,
  Cog6ToothIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline'
import GroupManagement from './GroupManagement'
import SimpleGroupChat from './SimpleGroupChat'
import { INPUT_LIMITS, remainingChars } from '../../constants/inputLimits'

type MutualUser = { id: string; username: string; displayName: string; avatar?: string }

export default function Groups() {
  const { groups, createGroup, loadGroups, joinGroupRealtime, leaveGroupRealtime } = useGroup()
  const { user } = useUser()
  const { success, error: showError } = useToast()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [showManagement, setShowManagement] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [newGroup, setNewGroup] = useState<{
    name: string
    description: string
    visibility: 'public' | 'private'
  }>({
    name: '',
    description: '',
    visibility: 'public',
  })
  const [mutualChoices, setMutualChoices] = useState<MutualUser[]>([])
  const [mutualsLoading, setMutualsLoading] = useState(false)
  const [selectedAddUserIds, setSelectedAddUserIds] = useState<string[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [groupToLeave, setGroupToLeave] = useState<Group | null>(null)
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'joined' | 'created'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('groups-active-tab') as any
      if (saved === 'all' || saved === 'joined' || saved === 'created') return saved
    }
    return 'all'
  })

  // Persist tab selection so refresh keeps the same view
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('groups-active-tab', activeTab)
    }
  }, [activeTab])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (openMenuId && !target.closest('[data-dropdown]')) {
        setOpenMenuId(null)
      }
    }

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])

  // Load groups on mount
  useEffect(() => {
    loadGroups()
  }, [])

  useEffect(() => {
    if (newGroup.visibility !== 'private') setSelectedAddUserIds([])
  }, [newGroup.visibility])

  useEffect(() => {
    if (!showCreateModal) {
      setSelectedAddUserIds([])
      setMutualChoices([])
      setNewGroup({ name: '', description: '', visibility: 'public' })
    }
  }, [showCreateModal])

  useEffect(() => {
    if (!showCreateModal || !user || newGroup.visibility !== 'private') {
      setMutualChoices([])
      return
    }
    let cancelled = false
    setMutualsLoading(true)
    fetch('/api/users/mutual-follows', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        if (d.success && Array.isArray(d.users)) setMutualChoices(d.users)
        else setMutualChoices([])
      })
      .catch(() => {
        if (!cancelled) setMutualChoices([])
      })
      .finally(() => {
        if (!cancelled) setMutualsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [showCreateModal, user?.id, newGroup.visibility])

  const allCount = groups.length
  const joinedCount = user ? groups.filter((g) => g.members?.includes(user.id)).length : 0
  const createdCount = user ? groups.filter(g => g.createdBy === user.id).length : 0

  const visibleGroups = groups
    .filter(group => {
      if (activeTab === 'all') {
        return true
      }
      if (activeTab === 'joined') {
        return !!user && group.members?.includes(user.id)
      }
      if (activeTab === 'created') {
        if (!user) return false
        return group.createdBy === user.id
      }
      return false
    })
    .filter(group =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroup.name.trim()) return

    try {
      await createGroup({
        name: newGroup.name.trim(),
        description: newGroup.description.trim(),
        visibility: newGroup.visibility,
        addUserIds:
          newGroup.visibility === 'private' && selectedAddUserIds.length
            ? selectedAddUserIds
            : undefined,
      })
      setShowCreateModal(false)
      success('Izveidots', 'Grupa saglabāta.')
    } catch (error) {
      console.error('Error creating group:', error)
      showError(
        'Kļūda',
        error instanceof Error ? error.message : 'Neizdevās izveidot grupu.'
      )
    }
  }

  const handleJoinGroup = async (group: any) => {
    if (!user) return

    try {
      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ groupId: group.id })
      })

      const data = await response.json()
      
      if (response.ok) {
        success('Veiksmīgi', 'Veiksmīgi pievienojies grupai!')
        // Join real-time group
        joinGroupRealtime(group.id)
        // Refresh groups and jump into chat of the joined group
        await loadGroups()
        const updated = groups.find(g => g.id === group.id) || group
        setSelectedGroup(updated)
        setShowChat(true)
        setActiveTab('joined')
      } else {
        throw new Error(data.error || 'Neizdevās pievienoties grupai')
      }
    } catch (error) {
      console.error('Error joining group:', error)
      showError('Kļūda', 'Neizdevās pievienoties grupai. Mēģini vēlreiz.')
    }
  }

  const handleLeaveGroup = (group: any) => {
    if (!user) return
    setGroupToLeave(group)
    setShowLeaveModal(true)
  }

  const confirmLeaveGroup = async () => {
    if (!groupToLeave || !user) return

    setLeaveLoading(true)
    try {
      const response = await fetch(`/api/groups/join?groupId=${groupToLeave.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()
      
      if (response.ok) {
        success('Veiksmīgi', 'Veiksmīgi pameti grupu!')
        // Leave real-time group
        leaveGroupRealtime(groupToLeave.id)
        setShowLeaveModal(false)
        setGroupToLeave(null)
        // Refresh groups
        loadGroups()
      } else {
        throw new Error(data.error || 'Neizdevās pamest grupu')
      }
    } catch (error) {
      console.error('Error leaving group:', error)
      showError('Kļūda', 'Neizdevās pamest grupu. Mēģini vēlreiz.')
    } finally {
      setLeaveLoading(false)
    }
  }

  const handleDeleteGroup = (group: any) => {
    if (!user || group.createdBy !== user.id) return
    setGroupToDelete(group)
    setShowDeleteModal(true)
  }

  const confirmDeleteGroup = async () => {
    if (!groupToDelete || !user) return

    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/groups?groupId=${groupToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()
      
      if (response.ok) {
        success('Veiksmīgi', 'Grupa veiksmīgi izdzēsta!')
        setShowDeleteModal(false)
        setGroupToDelete(null)
        // Refresh groups by reloading from API
        loadGroups()
      } else {
        throw new Error(data.error || 'Neizdevās dzēst grupu')
      }
    } catch (error) {
      console.error('Error deleting group:', error)
      showError('Kļūda', 'Neizdevās dzēst grupu. Mēģini vēlreiz.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleOpenChat = (group: any) => {
    console.log('🔍 Groups: Opening chat for group:', group)
    console.log('🔍 Groups: Group ID:', group?.id)
    setSelectedGroup(group)
    setShowChat(true)
  }

  const handleOpenManagement = (group: any) => {
    setSelectedGroup(group)
    setShowManagement(true)
  }

  const handleGroupUpdate = () => {
    // Refresh groups by reloading from API
    loadGroups()
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Instagram/Twitter Style Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink mb-1 sm:mb-2">Grupas</h1>
            <p className="text-sm sm:text-base text-ink-muted">Atklāj un pievienojies kopienām, kas tevi interesē</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-accent text-accent-fg px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-semibold hover:bg-accent-hover transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-2 shadow-lg self-start sm:self-auto"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Izveidot grupu</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-4 overflow-x-auto">
          <div className="inline-flex border border-border-ui rounded-xl bg-surface-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-medium rounded-l-xl transition-colors ${
                activeTab === 'all' ? 'bg-accent text-accent-fg' : 'text-ink-muted hover:bg-surface'
              }`}
            >
              Visas ({allCount})
            </button>
            <button
              onClick={() => setActiveTab('joined')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'joined' ? 'bg-accent text-accent-fg' : 'text-ink-muted hover:bg-surface'
              }`}
            >
              Pievienotās ({joinedCount})
            </button>
            <button
              onClick={() => setActiveTab('created')}
              className={`px-4 py-2 text-sm font-medium rounded-r-xl transition-colors ${
                activeTab === 'created' ? 'bg-accent text-accent-fg' : 'text-ink-muted hover:bg-surface'
              } ${!user ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={!user}
            >
              Tavas izveidotās ({createdCount})
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="w-5 h-5 text-ink-muted/60 absolute left-4 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Meklēt grupas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface-2 text-ink placeholder-ink-muted/70 border border-border-ui rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>

      {/* Groups Grid - Instagram/Twitter Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleGroups.map((group) => (
          <div key={group.id} className="bg-surface-2 border border-border-ui rounded-2xl hover:shadow-xl transition-all duration-300 overflow-hidden group">
            {/* Cover Image/Header */}
            <div className="relative h-32 overflow-hidden">
              {group.avatar ? (
                // Show actual image if avatar exists
                <div className="relative w-full h-full">
                  <img 
                    src={group.avatar} 
                    alt={group.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20"></div>
                </div>
              ) : (
                // Show accent-tinted gradient background if no avatar
                <div className="w-full h-full bg-gradient-to-br from-accent/40 via-accent/20 to-surface-2"></div>
              )}
              
              {/* Overlay content */}
              <div className="absolute inset-0">
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                  <span className="bg-black/30 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full border border-white/20">
                    {group.visibility === 'private' ? '🔒 Privāta' : '🌐 Publiska'}
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center space-x-2 text-white/90">
                    <UsersIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{group.members?.length || 0} dalībnieki</span>
                    {group.onlineMembers && group.onlineMembers.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-300">{group.onlineMembers.length} tiešsaistē</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Group Info */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-ink text-xl mb-1 break-words [overflow-wrap:anywhere] line-clamp-2">
                    {group.name}
                  </h3>
                  <p className="text-ink-muted text-sm line-clamp-2 break-words [overflow-wrap:anywhere]">
                    {group.description}
                  </p>
                  {group.typingUsers && group.typingUsers.length > 0 && (
                    <div className="flex items-center space-x-1 mt-1">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-accent rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-accent">
                        {group.typingUsers.length === 1 ? 'Kāds raksta...' : `${group.typingUsers.length} cilvēki raksta...`}
                      </span>
                    </div>
                  )}
                </div>
                {/* Only show 3-dots menu for groups created by current user */}
                {user && group.createdBy === user.id && (
                  <div className="relative ml-3" data-dropdown>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === group.id ? null : group.id)
                      }}
                      className={`p-2 rounded-full transition-all duration-200 ${
                        openMenuId === group.id 
                          ? 'bg-surface text-ink' 
                          : 'text-ink-muted/70 hover:text-ink hover:bg-surface'
                      }`}
                      aria-label="Vairāk opciju"
                    >
                      <EllipsisHorizontalIcon className="w-5 h-5" />
                    </button>
                    
                    {openMenuId === group.id && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-surface-2 border border-border-ui rounded-2xl shadow-2xl py-2 z-[9999] animate-in slide-in-from-top-2 duration-200" data-dropdown>
                        <div className="px-2">
                          <button 
                            onClick={() => { 
                              setOpenMenuId(null)
                              handleOpenManagement(group) 
                            }} 
                            className="w-full text-left px-4 py-3 text-sm text-ink hover:bg-surface rounded-xl flex items-center space-x-3 transition-colors"
                          >
                            <Cog6ToothIcon className="w-4 h-4 text-ink-muted" />
                            <span>Pārvaldīt grupu</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>


              {/* Last Activity */}
              {group.lastActivity && (
                <div className="text-xs text-ink-muted mb-2">
                  Pēdējā aktivitāte: {new Date(group.lastActivity).toLocaleString()}
                </div>
              )}

              {/* Action Button */}
              <div className="space-y-3">
                {user && !group.members?.includes(user.id) && group.visibility !== 'private' && (
                  <button
                    onClick={() => handleJoinGroup(group)}
                    className="w-full bg-accent text-accent-fg px-6 py-3 rounded-xl text-sm font-semibold hover:bg-accent-hover transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    Pievienoties grupai
                  </button>
                )}
                {user && group.members?.includes(user.id) && (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleOpenChat(group)}
                      className="w-full bg-accent text-accent-fg px-6 py-3 rounded-xl text-sm font-semibold hover:bg-accent-hover transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-2"
                    >
                      <ChatBubbleLeftIcon className="w-4 h-4" />
                      <span>Atvērt čatu</span>
                    </button>
                    {/* Show Pamest grupu button for members who didn't create the group */}
                    {group.createdBy !== user.id && (
                      <button
                        onClick={() => handleLeaveGroup(group)}
                        className="w-full bg-surface text-ink border border-border-ui px-6 py-2 rounded-xl text-sm font-medium hover:bg-surface-2 transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <XMarkIcon className="w-4 h-4" />
                        <span>Pamest grupu</span>
                      </button>
                    )}
                  </div>
                )}
                {!user && (
                  <div className="text-center">
                    <span className="text-sm text-ink-muted bg-surface px-4 py-2 rounded-xl inline-block">
                      Lūdzu pieslēdzies, lai pievienotos
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {visibleGroups.length === 0 && (
        <div className="card p-12 text-center">
          <UserGroupIcon className="w-12 h-12 text-ink-muted/60 mx-auto mb-4" />
          <h3 className="heading-3 text-ink mb-2">
            {searchQuery ? 'Grupas netika atrastas' : 'Nav grupu, ko rādīt'}
          </h3>
          <p className="body-regular text-ink-muted mb-6">
            {searchQuery 
              ? 'Pamēģini citus meklēšanas vārdus'
              : activeTab === 'joined'
                ? 'Pievienojies grupai, lai sāktu čatot tiešraidē'
                : activeTab === 'created'
                  ? 'You have not created any groups yet'
                  : 'Pašlaik nav pieejamu grupu'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Izveidot pirmo grupu
            </button>
          )}
        </div>
      )}

      {/* Izveidot grupu Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-elevated w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border-ui">
              <h3 className="heading-3 text-ink">Izveidot grupu</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-icon"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <form
              onSubmit={handleCreateGroup}
              className="p-6 space-y-4"
              id="create-group-form"
            >
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Grupas nosaukums</label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="Ievadi grupas nosaukumu"
                  maxLength={INPUT_LIMITS.groupName}
                  required
                />
                <p className="mt-1 text-xs text-ink-muted text-right">
                  {remainingChars(INPUT_LIMITS.groupName, newGroup.name)} simboli atlikuši
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Apraksts</label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                  className="input-textarea h-24"
                  placeholder="Apraksti, par ko ir šī grupa..."
                  maxLength={INPUT_LIMITS.groupDescription}
                />
                <p className="mt-1 text-xs text-ink-muted text-right">
                  {remainingChars(INPUT_LIMITS.groupDescription, newGroup.description)} simboli atlikuši
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-border-ui"
                  checked={newGroup.visibility === 'private'}
                  onChange={(e) =>
                    setNewGroup((prev) => ({
                      ...prev,
                      visibility: e.target.checked ? 'private' : 'public',
                    }))
                  }
                />
                <span>
                  <span className="block text-sm font-medium text-ink">Privāta grupa</span>
                  <span className="block text-sm text-ink-muted">
                    Redz tikai grupas biedri. Pievienot var lietotājus, ar kuriem tev ir savstarpēja sekošana (tu viņiem un viņi tev).
                  </span>
                </span>
              </label>

              {newGroup.visibility === 'private' && (
                <div className="space-y-2">
                  <span className="block text-sm font-medium text-ink">
                    Pievienot biedrus (nav obligāti)
                  </span>
                  <p className="text-sm text-ink-muted">
                    Rāda tikai savstarpējos sekotājus — atzīmē, kurus gribi grupā jau tagad.
                  </p>
                  {mutualsLoading ? (
                    <p className="text-sm text-ink-muted">Ielādē…</p>
                  ) : mutualChoices.length === 0 ? (
                    <p className="text-sm text-ink-muted">
                      Nav savstarpējo sekotāju. Seko kādam, kas arī seko tev, lai varētu pievienot.
                    </p>
                  ) : (
                    <ul className="max-h-48 overflow-y-auto space-y-2 rounded-lg border border-border-ui p-2 bg-surface">
                      {mutualChoices.map((u) => (
                        <li key={u.id}>
                          <label className="flex items-center gap-3 cursor-pointer py-1 px-1 rounded-md hover:bg-surface-2">
                            <input
                              type="checkbox"
                              className="rounded border-border-ui"
                              checked={selectedAddUserIds.includes(u.id)}
                              onChange={() =>
                                setSelectedAddUserIds((prev) =>
                                  prev.includes(u.id)
                                    ? prev.filter((id) => id !== u.id)
                                    : [...prev, u.id]
                                )
                              }
                            />
                            <span className="text-sm text-ink">
                              {u.displayName}{' '}
                              <span className="text-ink-muted">@{u.username}</span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </form>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-border-ui">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-ink-muted hover:text-ink transition-colors duration-200 font-medium text-sm"
              >
                Atcelt
              </button>
              <button
                type="submit"
                form="create-group-form"
                className="btn-primary"
              >
                Izveidot grupu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Chat Modal */}
        {showChat && selectedGroup && (
          <SimpleGroupChat
            group={selectedGroup}
            onClose={() => {
              setShowChat(false)
              setSelectedGroup(null)
            }}
          />
        )}

      {/* Group Management Modal */}
      {showManagement && selectedGroup && (
        <GroupManagement
          group={selectedGroup}
          onClose={() => {
            setShowManagement(false)
            setSelectedGroup(null)
          }}
          onUpdate={handleGroupUpdate}
        />
      )}

      {/* Beautiful Dzēst grupu Modal */}
      {showDeleteModal && groupToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-2 rounded-2xl shadow-2xl max-w-md w-full animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="p-6 border-b border-border-ui">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-500/15 rounded-full flex items-center justify-center">
                  <XMarkIcon className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">Dzēst grupu</h3>
                  <p className="text-sm text-ink-muted">Šo darbību nevar atsaukt</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-ink mb-4">
                Vai tiešām vēlies dzēst <span className="font-semibold">"{groupToDelete.name}"</span>? 
                Tas neatgriezeniski dzēsīs grupu un visu tās saturu.
              </p>
              
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 text-red-500 mt-0.5">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-red-500">Brīdinājums</h4>
                    <p className="text-sm text-ink mt-1">
                      Visas ziņas, dalībnieki un grupas dati tiks neatgriezeniski dzēsti.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 p-6 bg-surface rounded-b-2xl">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setGroupToDelete(null)
                }}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-ink bg-surface-2 border border-border-ui rounded-xl hover:bg-surface transition-colors disabled:opacity-50"
              >
                Atcelt
              </button>
              <button
                onClick={confirmDeleteGroup}
                disabled={deleteLoading}
                className="px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {deleteLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Dzēš...</span>
                  </>
                ) : (
                  <>
                    <XMarkIcon className="w-4 h-4" />
                    <span>Dzēst grupu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pamest grupu Modal */}
      {showLeaveModal && groupToLeave && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-2 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-border-ui">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-500/15 rounded-full flex items-center justify-center">
                  <XMarkIcon className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">Pamest grupu</h3>
                  <p className="text-sm text-ink-muted">Šo darbību nevar atsaukt</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-ink mb-2">
                  Vai tiešām vēlies pamest <span className="font-semibold text-ink">"{groupToLeave.name}"</span>?
                </p>
                <p className="text-sm text-ink-muted">
                  Tu vairs nesaņemsi paziņojumus no šīs grupas un nevarēsi piedalīties grupas diskusijās.
                </p>
              </div>

              {/* Group Info */}
              <div className="bg-surface rounded-xl p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-border-ui rounded-lg flex items-center justify-center">
                    {groupToLeave.avatar ? (
                      <img src={groupToLeave.avatar} alt={groupToLeave.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <UserGroupIcon className="w-5 h-5 text-ink-muted" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-ink">{groupToLeave.name}</h4>
                    <p className="text-sm text-ink-muted">{groupToLeave.description}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center space-x-1 text-xs text-ink-muted">
                        <UsersIcon className="w-3 h-3" />
                        <span>{groupToLeave.memberCount || groupToLeave.members?.length || 0} dalībnieki</span>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium rounded-full text-emerald-500 bg-emerald-500/15">
                        Publiska
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowLeaveModal(false)
                    setGroupToLeave(null)
                  }}
                  disabled={leaveLoading}
                  className="flex-1 px-4 py-3 text-sm font-medium text-ink bg-surface border border-border-ui rounded-xl hover:bg-surface-2 transition-colors disabled:opacity-50"
                >
                  Atcelt
                </button>
                <button
                  onClick={confirmLeaveGroup}
                  disabled={leaveLoading}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-orange-600 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {leaveLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Pamet...</span>
                    </>
                  ) : (
                    <>
                      <XMarkIcon className="w-4 h-4" />
                      <span>Pamest grupu</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Posts Modal */}
    </div>
  )
}
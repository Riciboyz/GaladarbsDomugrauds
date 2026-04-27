'use client'

import { useState, useEffect } from 'react'
import { useUser } from '../../contexts/UserContext'
import { useToast } from '../../contexts/ToastContext'
import { 
  UserGroupIcon,
  UsersIcon,
  TrashIcon,
  UserMinusIcon,
  PencilIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

interface GroupManagementProps {
  group: any
  onClose: () => void
  onUpdate: () => void
}

export default function GroupManagement({ group, onClose, onUpdate }: GroupManagementProps) {
  const { user } = useUser()
  const { success, error: showError } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMemberManagement, setShowMemberManagement] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [allMutuals, setAllMutuals] = useState<{ id: string; username: string; displayName: string; avatar?: string }[]>([])
  const [mutualsLoading, setMutualsLoading] = useState(false)
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    name: group.name,
    description: group.description || '',
    avatar: group.avatar || ''
  })

  useEffect(() => {
    if (showMemberManagement) {
      loadGroupMembers()
    }
  }, [showMemberManagement])

  useEffect(() => {
    if (!showMemberManagement || group.visibility !== 'private') {
      setAllMutuals([])
      return
    }
    let cancelled = false
    setMutualsLoading(true)
    fetch('/api/users/mutual-follows', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.success || !Array.isArray(d.users)) return
        setAllMutuals(d.users)
      })
      .catch(() => {
        if (!cancelled) setAllMutuals([])
      })
      .finally(() => {
        if (!cancelled) setMutualsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [showMemberManagement, group.visibility, group.id])

  // Listen for real-time member changes
  useEffect(() => {
    if (!group?.id) return

    const handleMemberAdded = (event: CustomEvent) => {
      const data = event.detail
      if (data.groupId === group.id) {
        console.log('📨 GroupManagement: Member added:', data)
        loadGroupMembers() // Reload members
        success('Dalībnieks pievienots', 'Grupai pievienots jauns dalībnieks!')
      }
    }

    const handleMemberRemoved = (event: CustomEvent) => {
      const data = event.detail
      if (data.groupId === group.id) {
        console.log('📨 GroupManagement: Member removed:', data)
        loadGroupMembers() // Reload members
        success('Dalībnieks noņemts', 'Dalībnieks noņemts no grupas!')
      }
    }

    // Add event listeners
    window.addEventListener('member_added', handleMemberAdded as EventListener)
    window.addEventListener('member_removed', handleMemberRemoved as EventListener)

    return () => {
      window.removeEventListener('member_added', handleMemberAdded as EventListener)
      window.removeEventListener('member_removed', handleMemberRemoved as EventListener)
    }
  }, [group?.id])

  const loadGroupMembers = async () => {
    try {
      const response = await fetch(`/api/groups/members?groupId=${group.id}`, {
        credentials: 'include'
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setMembers((data.members || []).map((member: any) => ({
          id: member.id,
          username: member.username,
          displayName: member.display_name,
          avatar: member.avatar
        })))
      }
    } catch (error) {
      console.error('Error loading members:', error)
    }
  }

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const response = await fetch('/api/groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          groupId: group.id,
          ...editForm
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        success('Veiksmīgi', 'Grupa veiksmīgi atjaunināta!')
        setIsEditing(false)
        onUpdate()
      } else {
        throw new Error(data.error || 'Neizdevās atjaunināt grupu')
      }
    } catch (error) {
      console.error('Error updating group:', error)
      showError('Kļūda', 'Neizdevās atjaunināt grupu. Mēģini vēlreiz.')
    }
  }

  const handleDeleteGroup = async () => {
    if (!user) return

    try {
      console.log('🗑️ Deleting group:', group.id)
      const response = await fetch(`/api/groups?groupId=${group.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()
      console.log('📡 Delete response:', response.status, data)
      
      if (response.ok) {
        success('Veiksmīgi', 'Grupa veiksmīgi izdzēsta!')
        onUpdate()
        onClose()
      } else {
        throw new Error(data.error || 'Neizdevās dzēst grupu')
      }
    } catch (error) {
      console.error('❌ Error deleting group:', error)
      showError('Kļūda', 'Neizdevās dzēst grupu. Mēģini vēlreiz.')
    }
  }

  const removeMember = async (userId: string) => {
    if (!group?.id || !user?.id) return

    try {
      const response = await fetch(`/api/groups/members?groupId=${group.id}&userId=${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })

      const data = await response.json()
      
      if (response.ok) {
        success('Dalībnieks noņemts', 'Dalībnieks veiksmīgi noņemts!')
        loadGroupMembers()
      } else {
        throw new Error(data.error || 'Neizdevās noņemt dalībnieku')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      showError('Dalībnieka noņemšana', 'Neizdevās noņemt dalībnieku. Mēģini vēlreiz.')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    await removeMember(memberId)
  }

  const memberIdSet = new Set(members.map((m) => m.id))
  const mutualsNotInGroup = allMutuals.filter((u) => !memberIdSet.has(u.id))

  const addMemberById = async (userId: string) => {
    if (!group?.id || !user?.id) return
    setAddingMemberId(userId)
    try {
      const response = await fetch('/api/groups/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ groupId: group.id, userId }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Neizdevās pievienot dalībnieku')
      }
      success('Pievienots', 'Lietotājs pievienots grupai.')
      loadGroupMembers()
      onUpdate()
    } catch (error) {
      console.error('Error adding member:', error)
      showError('Pievienošana', error instanceof Error ? error.message : 'Neizdevās pievienot.')
    } finally {
      setAddingMemberId(null)
    }
  }

  if (!user || group.createdBy !== user.id) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border-ui">
          <h3 className="heading-3 text-ink">Grupas pārvaldība</h3>
          <button
            onClick={onClose}
            className="btn-icon"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Group Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 bg-surface rounded-xl flex items-center justify-center">
                {group.avatar ? (
                  <img src={group.avatar} alt={group.name} className="w-16 h-16 rounded-xl object-cover" />
                ) : (
                  <UserGroupIcon className="w-8 h-8 text-ink-muted" />
                )}
              </div>
              <div>
                <h4 className="heading-4 text-ink">{group.name}</h4>
                <p className="body-regular text-ink-muted">{group.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-ink-muted">
                  <div className="flex items-center space-x-1">
                    <UsersIcon className="w-4 h-4" />
                    <span>{group.memberCount || group.members?.length || 0} dalībnieki</span>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      group.visibility === 'private'
                        ? 'text-amber-600 bg-amber-500/15'
                        : 'text-emerald-500 bg-emerald-500/15'
                    }`}
                  >
                    {group.visibility === 'private' ? 'Privāta' : 'Publiska'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-secondary flex items-center space-x-2"
            >
              <PencilIcon className="w-4 h-4" />
              <span>{isEditing ? 'Atcelt rediģēšanu' : 'Rediģēt grupu'}</span>
            </button>
            
            <button
              onClick={() => setShowMemberManagement(!showMemberManagement)}
              className="btn-secondary flex items-center space-x-2"
            >
              <UsersIcon className="w-4 h-4" />
              <span>{showMemberManagement ? 'Paslēpt dalībniekus' : 'Pārvaldīt dalībniekus'}</span>
            </button>
            
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-secondary text-red-500 hover:text-red-400 flex items-center space-x-2"
            >
              <TrashIcon className="w-4 h-4" />
              <span>Dzēst grupu</span>
            </button>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <form onSubmit={handleUpdateGroup} className="space-y-4 p-4 bg-surface rounded-lg">
              <h5 className="heading-5 text-ink">Rediģēt grupas detaļas</h5>
              
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Grupas nosaukums</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="Ievadi grupas nosaukumu"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Apraksts</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="input-textarea h-24"
                  placeholder="Apraksti, par ko ir šī grupa..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Avatara URL</label>
                <input
                  type="url"
                  value={editForm.avatar}
                  onChange={(e) => setEditForm(prev => ({ ...prev, avatar: e.target.value }))}
                  className="input"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-ink-muted hover:text-ink transition-colors duration-200 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Saglabāt izmaiņas
                </button>
              </div>
            </form>
          )}

          {/* Member Management */}
          {showMemberManagement && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="heading-5 text-ink">Grupas dalībnieki</h5>
                <span className="text-sm text-ink-muted">{members.length} dalībnieki</span>
              </div>

              {group.visibility === 'private' && (
                <div className="space-y-2 rounded-lg border border-border-ui p-4 bg-surface">
                  <h6 className="text-sm font-semibold text-ink">Pievienot biedru</h6>
                  <p className="text-xs text-ink-muted">
                    Tikai savstarpējie sekotāji — tu viņiem seko un viņi tev.
                  </p>
                  {mutualsLoading ? (
                    <p className="text-sm text-ink-muted">Ielādē…</p>
                  ) : mutualsNotInGroup.length === 0 ? (
                    <p className="text-sm text-ink-muted">
                      Nav pieejamu savstarpējo sekotāju ārpus grupas.
                    </p>
                  ) : (
                    <ul className="space-y-2 max-h-40 overflow-y-auto">
                      {mutualsNotInGroup.map((u) => (
                        <li
                          key={u.id}
                          className="flex items-center justify-between gap-2 py-1"
                        >
                          <span className="text-sm text-ink truncate">
                            {u.displayName}{' '}
                            <span className="text-ink-muted">@{u.username}</span>
                          </span>
                          <button
                            type="button"
                            disabled={addingMemberId === u.id}
                            onClick={() => addMemberById(u.id)}
                            className="btn-secondary shrink-0 flex items-center gap-1 text-xs py-1.5 px-2"
                          >
                            <PlusIcon className="w-4 h-4" />
                            {addingMemberId === u.id ? '…' : 'Pievienot'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {members.length === 0 ? (
                  <div className="text-center py-8 text-ink-muted">
                    <UsersIcon className="w-12 h-12 mx-auto mb-2 text-ink-muted/50" />
                    <p>Dalībnieki nav atrasti</p>
                  </div>
                ) : (
                  members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-surface rounded-lg hover:bg-surface-2 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-border-ui rounded-full flex items-center justify-center">
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.displayName} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium text-ink-muted">
                              {member.displayName?.charAt(0) || 'U'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ink">{member.displayName}</p>
                          <p className="text-xs text-ink-muted">@{member.username}</p>
                          {member.id === group.createdBy && (
                            <span className="inline-block px-2 py-1 text-xs font-medium text-accent bg-accent/15 rounded-full mt-1">
                              Izveidotājs
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {member.id !== group.createdBy && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Noņemt dalībnieku"
                        >
                          <UserMinusIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <h5 className="heading-5 text-red-500 mb-2">Dzēst grupu</h5>
              <p className="body-regular text-ink mb-4">
                Vai tiešām vēlies dzēst &quot;{group.name}&quot;? Šo darbību nevar atsaukt, un tā dzēsīs visus grupas datus, ieskaitot ziņas un dalībnieku informāciju.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-ink-muted hover:text-ink transition-colors duration-200 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteGroup}
                  className="btn-secondary text-red-500 hover:text-red-400 flex items-center space-x-2"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>Dzēst grupu</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

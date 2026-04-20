'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useUser } from '../components/contexts/UserContext'

type TopicDay = {
  id: string
  title: string
  description: string
  date: string
  status?: string
  created_by_display_name?: string
  created_by_username?: string
}

type AdminUser = {
  id: string
  username: string
  displayName: string
  email: string
  role?: string
  bannedUntil?: string | null
  mutedUntil?: string | null
  deletedAt?: string | null
  lastActiveAt?: string | null
}

type Stats = {
  date: string
  newUsers: number
  topicSubmissions: number
}

type AuditLog = {
  id: string
  actorId: string
  actorUsername: string
  actorDisplayName: string
  action: string
  entityType: string
  entityId: string | null
  metadata: string
  createdAt: string
}

type ReportRow = {
  id: string
  reporter_id: string
  thread_id: string
  reason: string
  status: string
  created_at: string
  reporter_username: string
  reporter_display_name: string
  thread_content: string
  thread_parent_id: string | null
  visibility: string
}

type TabId = 'overview' | 'users' | 'calendar' | 'moderation' | 'audit'

export default function AdminPage() {
  const { user, isLoading } = useUser()
  const [tab, setTab] = useState<TabId>('overview')
  const [topicDays, setTopicDays] = useState<TopicDay[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loadingTopicDays, setLoadingTopicDays] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingStats, setLoadingStats] = useState(false)
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [loadingReports, setLoadingReports] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)
  const [editingForm, setEditingForm] = useState({ title: '', description: '', date: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [userActionLoadingId, setUserActionLoadingId] = useState<string | null>(null)
  const [topicActionLoadingId, setTopicActionLoadingId] = useState<string | null>(null)
  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()
  const [form, setForm] = useState({ title: '', description: '', date: today, status: 'scheduled' as string })
  const [userFilters, setUserFilters] = useState({ q: '', role: '', includeDeleted: false })
  const [statsDate, setStatsDate] = useState(today)
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1)
  const [bulkStart, setBulkStart] = useState(today)

  const canAdmin = user?.role === 'admin'
  const canAccessPanel = canAdmin

  useEffect(() => {
    if (!canAccessPanel) return
    setTab('overview')
  }, [canAccessPanel])

  const loadCalendarMonth = useCallback(async () => {
    setLoadingTopicDays(true)
    setError('')
    try {
      const response = await fetch(
        `/api/topic-days/calendar?year=${calYear}&month=${calMonth}`,
        { credentials: 'include' }
      )
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load calendar')
      }
      setTopicDays(data.topicDays || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load calendar')
    } finally {
      setLoadingTopicDays(false)
    }
  }, [calYear, calMonth])

  const loadUsers = async () => {
    setLoadingUsers(true)
    setError('')
    try {
      const qs = new URLSearchParams()
      if (userFilters.q) qs.set('q', userFilters.q)
      if (userFilters.role) qs.set('role', userFilters.role)
      if (userFilters.includeDeleted) qs.set('includeDeleted', '1')
      const response = await fetch(`/api/users/admin/all?${qs}`, { credentials: 'include' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load users')
      }
      setUsers(data.users || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/stats?date=${statsDate}`, { credentials: 'include' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load stats')
      }
      setStats(data.stats)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats')
    } finally {
      setLoadingStats(false)
    }
  }, [statsDate])

  const loadAudit = useCallback(async () => {
    setLoadingAudit(true)
    setError('')
    try {
      const response = await fetch('/api/admin/audit-logs?limit=80', { credentials: 'include' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load audit log')
      }
      setAuditLogs(data.logs || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit log')
    } finally {
      setLoadingAudit(false)
    }
  }, [])

  const loadReports = useCallback(async () => {
    setLoadingReports(true)
    setError('')
    try {
      const response = await fetch('/api/reports', { credentials: 'include' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load reports')
      }
      setReports(data.reports || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports')
    } finally {
      setLoadingReports(false)
    }
  }, [])

  useEffect(() => {
    if (!canAccessPanel) return
    if (tab === 'overview' && canAdmin) void loadStats()
    if (tab === 'moderation' && canAdmin) void loadReports()
    if (tab === 'audit' && canAdmin) void loadAudit()
  }, [tab, canAccessPanel, canAdmin, loadStats, loadReports, loadAudit])

  useEffect(() => {
    if (!canAccessPanel || tab !== 'overview' || !canAdmin) return
    void loadStats()
  }, [statsDate, tab, canAccessPanel, canAdmin, loadStats])

  useEffect(() => {
    if (!canAccessPanel || tab !== 'users' || !canAdmin) return
    void loadUsers()
  }, [tab, canAccessPanel, canAdmin])

  useEffect(() => {
    if (!canAccessPanel || tab !== 'calendar' || !canAdmin) return
    void loadCalendarMonth()
  }, [tab, canAccessPanel, canAdmin, calYear, calMonth, loadCalendarMonth])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canAdmin) return
    setSubmitting(true)
    setError('')
    setSuccess('')
    if (form.date < today) {
      setError('Topic nevar veidot ar pagājušu datumu.')
      setSubmitting(false)
      return
    }
    try {
      const response = await fetch('/api/topic-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create topic day')
      }
      setSuccess('Daily Topic izveidots veiksmīgi.')
      setForm((prev) => ({ ...prev, title: '', description: '', date: today }))
      await loadCalendarMonth()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create topic day')
    } finally {
      setSubmitting(false)
    }
  }

  const startEditTopic = (topicDay: TopicDay) => {
    setEditingTopicId(topicDay.id)
    setEditingForm({
      title: topicDay.title,
      description: topicDay.description || '',
      date: topicDay.date,
    })
    setError('')
    setSuccess('')
  }

  const cancelEditTopic = () => {
    setEditingTopicId(null)
    setEditingForm({ title: '', description: '', date: '' })
  }

  const saveTopicEdit = async (id: string) => {
    setTopicActionLoadingId(id)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`/api/topic-days/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingForm),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update topic')
      }
      setSuccess('Topic atjaunināts veiksmīgi.')
      cancelEditTopic()
      await loadCalendarMonth()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update topic')
    } finally {
      setTopicActionLoadingId(null)
    }
  }

  const setTopicStatus = async (id: string, status: string) => {
    setTopicActionLoadingId(id)
    setError('')
    try {
      const response = await fetch(`/api/topic-days/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update status')
      }
      await loadCalendarMonth()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status')
    } finally {
      setTopicActionLoadingId(null)
    }
  }

  const deleteTopic = async (id: string) => {
    if (!window.confirm('Dzēst šo topic?')) return
    setTopicActionLoadingId(id)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`/api/topic-days/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete topic')
      }
      setSuccess('Topic izdzēsts.')
      await loadCalendarMonth()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete topic')
    } finally {
      setTopicActionLoadingId(null)
    }
  }

  const bulkWeek = async () => {
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/topic-days/bulk-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ startDate: bulkStart }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Bulk create failed')
      }
      setSuccess(`Izveidoti ${data.topicDays?.length || 0} melnraksti (draft).`)
      await loadCalendarMonth()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk create failed')
    } finally {
      setSubmitting(false)
    }
  }

  const patchUser = async (target: AdminUser, body: Record<string, unknown>) => {
    setUserActionLoadingId(target.id)
    setError('')
    try {
      const response = await fetch(`/api/users/admin/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Update failed')
      }
      await loadUsers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setUserActionLoadingId(null)
    }
  }

  const softDeleteUser = async (target: AdminUser) => {
    if (!window.confirm(`Soft-delete kontu @${target.username}?`)) return
    setUserActionLoadingId(target.id)
    setError('')
    try {
      const response = await fetch(`/api/users/admin/${target.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete user')
      }
      setSuccess(`Konts @${target.username} atzīmēts kā dzēsts.`)
      await loadUsers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete user')
    } finally {
      setUserActionLoadingId(null)
    }
  }

  const restoreUser = async (target: AdminUser) => {
    setUserActionLoadingId(target.id)
    setError('')
    try {
      const response = await fetch(`/api/users/admin/${target.id}/restore`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Restore failed')
      }
      await loadUsers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed')
    } finally {
      setUserActionLoadingId(null)
    }
  }

  const moderationAction = async (
    path: string,
    method: string,
    body?: Record<string, unknown>
  ) => {
    setError('')
    try {
      const response = await fetch(path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Request failed')
      }
      await loadReports()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    }
  }

  const calendarMap = useMemo(() => {
    const m = new Map<string, TopicDay>()
    for (const t of topicDays) {
      m.set(t.date.slice(0, 10), t)
    }
    return m
  }, [topicDays])

  const calendarCells = useMemo(() => {
    const first = new Date(calYear, calMonth - 1, 1)
    const startPad = (first.getDay() + 6) % 7
    const daysInMonth = new Date(calYear, calMonth, 0).getDate()
    const cells: { day: number | null; iso: string | null }[] = []
    for (let i = 0; i < startPad; i++) cells.push({ day: null, iso: null })
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ day: d, iso })
    }
    return cells
  }, [calYear, calMonth])

  const statusColor = (s?: string) => {
    if (s === 'published') return 'bg-emerald-100 text-emerald-900 border-emerald-200'
    if (s === 'scheduled') return 'bg-amber-100 text-amber-900 border-amber-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  if (isLoading) {
    return <main className="p-8 text-gray-700">Loading...</main>
  }

  if (!user) {
    return <main className="p-8 text-gray-700">Please login first.</main>
  }

  if (!canAccessPanel) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-2xl font-bold text-red-900">Forbidden</h1>
          <p className="mt-2 text-red-700">Administratora piekļuve nepieciešama.</p>
        </div>
      </main>
    )
  }

  const tabs: { id: TabId; label: string; adminOnly?: boolean }[] = [
    { id: 'overview', label: 'Pārskats', adminOnly: true },
    { id: 'users', label: 'Lietotāji', adminOnly: true },
    { id: 'calendar', label: 'Daily Topic kalendārs', adminOnly: true },
    { id: 'moderation', label: 'Moderācija', adminOnly: true },
    { id: 'audit', label: 'Audit žurnāls', adminOnly: true },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="mx-auto max-w-6xl p-6 md:p-10 space-y-6">
        <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin panelis</h1>
              <p className="text-gray-600 mt-2">
                Metrikas, lietotāji, daily topics, moderācija un audits.
              </p>
            </div>
            <div className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
              @{user.username} · {user.role}
            </div>
          </div>
          <nav className="mt-4 flex flex-wrap gap-2">
            {tabs.map((t) => {
              if (t.adminOnly && !canAdmin) return null
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    tab === t.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              )
            })}
          </nav>
        </header>

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">{success}</div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>
        )}

        {tab === 'overview' && canAdmin && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <h2 className="text-xl font-semibold text-gray-900">Dienas metrikas</h2>
              <input
                type="date"
                value={statsDate}
                onChange={(e) => setStatsDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => loadStats()}
                className="rounded-lg bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
              >
                Atsvaidzināt
              </button>
            </div>
            {loadingStats ? (
              <p className="text-gray-600">Ielādē...</p>
            ) : stats ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Jauni lietotāji', stats.newUsers],
                  ['Topic submissions', stats.topicSubmissions],
                ].map(([label, val]) => (
                  <div key={String(label)} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">{val}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        )}

        {tab === 'users' && canAdmin && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Lietotāju pārvaldība</h2>
            <div className="flex flex-wrap gap-3 items-end">
              <input
                value={userFilters.q}
                onChange={(e) => setUserFilters((f) => ({ ...f, q: e.target.value }))}
                placeholder="Meklēt (username, vārds, e-pasts)"
                className="min-w-[200px] flex-1 rounded-xl border border-gray-300 p-2.5 text-sm"
              />
              <select
                value={userFilters.role}
                onChange={(e) => setUserFilters((f) => ({ ...f, role: e.target.value }))}
                className="rounded-xl border border-gray-300 p-2.5 text-sm"
              >
                <option value="">Visas lomas</option>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={userFilters.includeDeleted}
                  onChange={(e) => setUserFilters((f) => ({ ...f, includeDeleted: e.target.checked }))}
                />
                Ietvert dzēstos
              </label>
              <button
                type="button"
                onClick={() => loadUsers()}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
              >
                Filtrēt
              </button>
            </div>
            {loadingUsers ? (
              <p className="text-gray-600">Ielādē...</p>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                {users.map((u) => (
                  <article
                    key={u.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-wrap gap-3 items-start justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">
                        {u.displayName} <span className="text-sm text-gray-600">@{u.username}</span>
                      </p>
                      <p className="text-sm text-gray-600">{u.email}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Loma: {u.role || 'user'}
                        {u.deletedAt ? ' · dzēsts' : ''}
                        {u.bannedUntil ? ` · ban līdz ${u.bannedUntil}` : ''}
                        {u.mutedUntil ? ` · mute līdz ${u.mutedUntil}` : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <select
                          key={`role-${u.id}-${u.role}`}
                          value={u.role === 'admin' ? 'admin' : 'user'}
                          disabled={userActionLoadingId === u.id || u.id === user.id}
                          onChange={(e) => patchUser(u, { role: e.target.value })}
                          className="rounded-lg border border-gray-300 text-sm p-1"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                        <button
                          type="button"
                          disabled={userActionLoadingId === u.id || u.id === user.id}
                          onClick={() => {
                            const d = window.prompt('Ban līdz (YYYY-MM-DD) vai tukšs noņemt', '')
                            if (d === null) return
                            patchUser(u, { bannedUntil: d.trim() || null })
                          }}
                          className="rounded-lg bg-amber-600 px-2 py-1 text-xs text-white hover:bg-amber-500"
                        >
                          Ban
                        </button>
                        <button
                          type="button"
                          disabled={userActionLoadingId === u.id || u.id === user.id}
                          onClick={() => {
                            const d = window.prompt('Mute līdz (YYYY-MM-DD) vai tukšs noņemt', '')
                            if (d === null) return
                            patchUser(u, { mutedUntil: d.trim() || null })
                          }}
                          className="rounded-lg bg-slate-600 px-2 py-1 text-xs text-white hover:bg-slate-500"
                        >
                          Mute
                        </button>
                        {u.deletedAt ? (
                          <button
                            type="button"
                            onClick={() => restoreUser(u)}
                            disabled={userActionLoadingId === u.id}
                            className="rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white"
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => softDeleteUser(u)}
                            disabled={userActionLoadingId === u.id || u.id === user.id}
                            className="rounded-lg bg-red-600 px-2 py-1 text-xs text-white"
                          >
                            Soft delete
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'calendar' && canAdmin && (
          <>
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Kalendārs</h2>
              <div className="flex flex-wrap gap-3 items-center mb-4">
                <button
                  type="button"
                  className="rounded-lg border px-2 py-1 text-sm"
                  onClick={() => {
                    if (calMonth <= 1) {
                      setCalMonth(12)
                      setCalYear((y) => y - 1)
                    } else setCalMonth((m) => m - 1)
                  }}
                >
                  ←
                </button>
                <span className="font-medium">
                  {calYear}.{String(calMonth).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  className="rounded-lg border px-2 py-1 text-sm"
                  onClick={() => {
                    if (calMonth >= 12) {
                      setCalMonth(1)
                      setCalYear((y) => y + 1)
                    } else setCalMonth((m) => m + 1)
                  }}
                >
                  →
                </button>
              </div>
              {loadingTopicDays ? (
                <p className="text-gray-600">Ielādē...</p>
              ) : (
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-1">
                  {['P', 'O', 'T', 'C', 'Pk', 'S', 'Sv'].map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                  {calendarCells.map((c, idx) => {
                    const td = c.iso ? calendarMap.get(c.iso) : null
                    return (
                      <div
                        key={idx}
                        className={`min-h-[72px] rounded-lg border p-1 text-left ${
                          c.day ? 'border-gray-200 bg-white' : 'border-transparent bg-transparent'
                        }`}
                      >
                        {c.day != null && (
                          <>
                            <div className="text-xs font-semibold text-gray-800">{c.day}</div>
                            {td && (
                              <div className={`mt-0.5 truncate rounded border px-0.5 text-[10px] ${statusColor(td.status)}`}>
                                {td.title.slice(0, 18)}
                                {td.title.length > 18 ? '…' : ''}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Bulk create (7 dienas, draft)</h3>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="date"
                  value={bulkStart}
                  onChange={(e) => setBulkStart(e.target.value)}
                  className="rounded-lg border border-gray-300 p-2 text-sm"
                />
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => bulkWeek()}
                  className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-60"
                >
                  Izveidot nedēļu
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Pievienot Daily Topic</h2>
              <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Topic title"
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                />
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                  required
                  min={today}
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                />
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="rounded-xl border border-gray-300 bg-white p-3 text-sm md:col-span-2"
                >
                  <option value="draft">draft</option>
                  <option value="scheduled">scheduled</option>
                  <option value="published">published</option>
                </select>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Description"
                  rows={4}
                  className="md:col-span-2 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                />
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-gray-900 px-5 py-2.5 font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
                  >
                    {submitting ? 'Saving...' : 'Create Daily Topic'}
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Topic days (mēnesis)</h2>
              {loadingTopicDays ? (
                <p className="text-gray-600">Loading...</p>
              ) : topicDays.length === 0 ? (
                <p className="text-gray-600">Nav ierakstu šajā mēnesī.</p>
              ) : (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                  {topicDays.map((topicDay) => (
                    <article key={topicDay.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex flex-wrap gap-2 items-center justify-between">
                        <h3 className="font-semibold text-gray-900">
                          {editingTopicId === topicDay.id ? 'Edit Topic' : topicDay.title}
                        </h3>
                        <span className={`rounded-lg px-2 py-1 text-xs border ${statusColor(topicDay.status)}`}>
                          {topicDay.status || 'published'}
                        </span>
                        <span className="rounded-lg bg-white px-2 py-1 text-sm text-gray-600 border border-gray-200">
                          {editingTopicId === topicDay.id ? editingForm.date : topicDay.date}
                        </span>
                      </div>
                      {editingTopicId === topicDay.id ? (
                        <div className="space-y-3 mt-3">
                          <input
                            value={editingForm.title}
                            onChange={(e) => setEditingForm((prev) => ({ ...prev, title: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 bg-white p-2.5 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                          />
                          <textarea
                            value={editingForm.description}
                            onChange={(e) => setEditingForm((prev) => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 bg-white p-2.5 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                          />
                          <input
                            type="date"
                            value={editingForm.date}
                            onChange={(e) => setEditingForm((prev) => ({ ...prev, date: e.target.value }))}
                            className="w-full md:w-64 rounded-lg border border-gray-300 bg-white p-2.5 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                          />
                          <div className="flex gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => saveTopicEdit(topicDay.id)}
                              disabled={topicActionLoadingId === topicDay.id}
                              className="rounded-lg bg-gray-900 px-3 py-1.5 text-white transition hover:bg-gray-800 disabled:opacity-60"
                            >
                              {topicActionLoadingId === topicDay.id ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditTopic}
                              className="rounded-lg bg-white border border-gray-300 px-3 py-1.5 text-gray-900 transition hover:bg-gray-100"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {topicDay.description && <p className="text-gray-700 mt-2">{topicDay.description}</p>}
                          <div className="flex gap-2 mt-3 flex-wrap">
                            <button
                              type="button"
                              onClick={() => startEditTopic(topicDay)}
                              className="rounded-lg bg-gray-900 px-3 py-1.5 text-white transition hover:bg-gray-800"
                            >
                              Edit
                            </button>
                            {(['draft', 'scheduled', 'published'] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                disabled={topicActionLoadingId === topicDay.id}
                                onClick={() => setTopicStatus(topicDay.id, st)}
                                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-50"
                              >
                                {st}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => deleteTopic(topicDay.id)}
                              disabled={topicActionLoadingId === topicDay.id}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-white transition hover:bg-red-500 disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Created by {topicDay.created_by_display_name || topicDay.created_by_username || 'unknown'}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {tab === 'moderation' && canAdmin && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Ziņotie ieraksti</h2>
              <button
                type="button"
                onClick={() => loadReports()}
                className="rounded-lg bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
              >
                Atsvaidzināt
              </button>
            </div>
            {loadingReports ? (
              <p className="text-gray-600">Ielādē...</p>
            ) : reports.length === 0 ? (
              <p className="text-gray-600">Nav atvērtu ziņojumu.</p>
            ) : (
              <div className="space-y-4 max-h-[75vh] overflow-y-auto">
                {reports.map((r) => (
                  <article key={r.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
                    <div className="text-sm text-gray-600">
                      @{r.reporter_username} · {r.status} · {r.created_at}
                    </div>
                    <p className="text-xs text-gray-500">Thread {r.thread_id}</p>
                    <p className="text-gray-800 text-sm whitespace-pre-wrap line-clamp-4">{r.thread_content}</p>
                    {r.reason ? <p className="text-xs text-gray-600">Iemesls: {r.reason}</p> : null}
                    <p className="text-xs">visibility: {r.visibility}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-gray-800 px-2 py-1 text-xs text-white"
                        onClick={() => moderationAction(`/api/reports/${r.id}`, 'PATCH', { status: 'reviewed' })}
                      >
                        Atzīmēt kā apskatītu
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-gray-500 px-2 py-1 text-xs text-white"
                        onClick={() => moderationAction(`/api/reports/${r.id}`, 'PATCH', { status: 'dismissed' })}
                      >
                        Noraidīt
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-amber-700 px-2 py-1 text-xs text-white"
                        onClick={() =>
                          moderationAction(`/api/threads/${r.thread_id}/moderation`, 'PATCH', { action: 'hide' })
                        }
                      >
                        Slēpt
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-emerald-700 px-2 py-1 text-xs text-white"
                        onClick={() =>
                          moderationAction(`/api/threads/${r.thread_id}/moderation`, 'PATCH', { action: 'unhide' })
                        }
                      >
                        Atvērt
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-red-700 px-2 py-1 text-xs text-white"
                        onClick={() => {
                          if (!window.confirm('Dzēst šo pavedienu/komentāru?')) return
                          moderationAction(`/api/threads/admin/${r.thread_id}`, 'DELETE')
                        }}
                      >
                        Dzēst
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'audit' && canAdmin && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Admin aktivitātes</h2>
              <button
                type="button"
                onClick={() => loadAudit()}
                className="rounded-lg bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
              >
                Atsvaidzināt
              </button>
            </div>
            {loadingAudit ? (
              <p className="text-gray-600">Ielādē...</p>
            ) : (
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white border-b">
                    <tr>
                      <th className="p-2">Laiks</th>
                      <th className="p-2">Administrators</th>
                      <th className="p-2">Darbība</th>
                      <th className="p-2">Entītāte</th>
                      <th className="p-2">Metadati</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((a) => (
                      <tr key={a.id} className="border-b border-gray-100 align-top">
                        <td className="p-2 whitespace-nowrap text-gray-600">{a.createdAt}</td>
                        <td className="p-2">
                          @{a.actorUsername}
                          <div className="text-xs text-gray-500">{a.actorDisplayName}</div>
                        </td>
                        <td className="p-2 font-mono text-xs">{a.action}</td>
                        <td className="p-2 text-xs">
                          {a.entityType} {a.entityId ? <span className="text-gray-500">{a.entityId}</span> : ''}
                        </td>
                        <td className="p-2 max-w-md break-all font-mono text-[11px] text-gray-700">{a.metadata}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}

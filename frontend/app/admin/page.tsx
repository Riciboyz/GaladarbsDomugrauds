'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useUser } from '../components/contexts/UserContext'
import type {
  FeatureSuggestion,
  FeatureSuggestionStatus,
  TopicSuggestion,
} from '../components/features/suggestions/types'
import {
  FEATURE_CATEGORY_LABELS,
  FEATURE_STATUS_LABELS,
} from '../components/features/suggestions/types'

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

type DmReportRow = {
  id: string
  reporter_id: string
  message_id: string
  reason: string
  status: string
  created_at: string
  reporter_username: string
  reporter_display_name: string
  message_content: string
  sender_id: string
  conversation_id: string
  sender_username: string
  sender_display_name: string
}

type TabId = 'overview' | 'users' | 'calendar' | 'moderation' | 'audit' | 'suggestions'

export default function AdminPage() {
  const { user, isLoading } = useUser()
  const [tab, setTab] = useState<TabId>('overview')
  const [topicDays, setTopicDays] = useState<TopicDay[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [reports, setReports] = useState<ReportRow[]>([])
  const [dmReports, setDmReports] = useState<DmReportRow[]>([])
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[]>([])
  const [featureSuggestions, setFeatureSuggestions] = useState<FeatureSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestionActionId, setSuggestionActionId] = useState<string | null>(null)
  const [topicSuggestionFilter, setTopicSuggestionFilter] = useState<'pending' | 'all'>('pending')
  const [featureSuggestionFilter, setFeatureSuggestionFilter] = useState<FeatureSuggestionStatus | 'all'>('all')
  const [loadingTopicDays, setLoadingTopicDays] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingStats, setLoadingStats] = useState(false)
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [loadingReports, setLoadingReports] = useState(false)
  const [loadingDmReports, setLoadingDmReports] = useState(false)
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

  const loadDmReports = useCallback(async () => {
    setLoadingDmReports(true)
    setError('')
    try {
      const response = await fetch('/api/admin/dm-reports', { credentials: 'include' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load DM reports')
      }
      setDmReports(data.reports || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load DM reports')
    } finally {
      setLoadingDmReports(false)
    }
  }, [])

  const loadTopicSuggestions = useCallback(async () => {
    setLoadingSuggestions(true)
    setError('')
    try {
      const response = await fetch(
        `/api/topic-suggestions?status=${topicSuggestionFilter}&sort=new`,
        { credentials: 'include' }
      )
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load topic suggestions')
      }
      setTopicSuggestions(data.suggestions || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load topic suggestions')
    } finally {
      setLoadingSuggestions(false)
    }
  }, [topicSuggestionFilter])

  const loadFeatureSuggestions = useCallback(async () => {
    setLoadingSuggestions(true)
    setError('')
    try {
      const response = await fetch(
        `/api/feature-suggestions?status=${featureSuggestionFilter}&sort=new&category=all`,
        { credentials: 'include' }
      )
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load feature suggestions')
      }
      setFeatureSuggestions(data.suggestions || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feature suggestions')
    } finally {
      setLoadingSuggestions(false)
    }
  }, [featureSuggestionFilter])

  const approveTopicSuggestion = async (id: string, defaultTitle: string) => {
    const iso = window.prompt(
      `Datums (YYYY-MM-DD), kad publicēt "${defaultTitle}":`,
      today
    )
    if (!iso) return
    const d = iso.trim().slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setError('Nederīgs datums')
      return
    }
    setSuggestionActionId(id)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`/api/topic-suggestions/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ date: d }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Approve failed')
      }
      setSuccess(`Ieteikums publicēts kā dienas tēma (${d}).`)
      await loadTopicSuggestions()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve failed')
    } finally {
      setSuggestionActionId(null)
    }
  }

  const rejectTopicSuggestion = async (id: string) => {
    const reason = window.prompt('Iemesls (neobligāti):', '')
    if (reason === null) return
    setSuggestionActionId(id)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`/api/topic-suggestions/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: reason.trim() }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Reject failed')
      }
      setSuccess('Ieteikums noraidīts.')
      await loadTopicSuggestions()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reject failed')
    } finally {
      setSuggestionActionId(null)
    }
  }

  const deleteTopicSuggestion = async (id: string) => {
    if (!window.confirm('Dzēst šo ieteikumu?')) return
    setSuggestionActionId(id)
    setError('')
    try {
      const response = await fetch(`/api/topic-suggestions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Delete failed')
      }
      await loadTopicSuggestions()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setSuggestionActionId(null)
    }
  }

  const updateFeatureSuggestion = async (
    id: string,
    patch: { status?: FeatureSuggestionStatus; adminNote?: string }
  ) => {
    setSuggestionActionId(id)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`/api/feature-suggestions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Update failed')
      }
      setFeatureSuggestions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...(data.suggestion || {}) } : s))
      )
      setSuccess('Atjaunināts.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSuggestionActionId(null)
    }
  }

  const deleteFeatureSuggestion = async (id: string) => {
    if (!window.confirm('Dzēst šo ieteikumu?')) return
    setSuggestionActionId(id)
    setError('')
    try {
      const response = await fetch(`/api/feature-suggestions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Delete failed')
      }
      await loadFeatureSuggestions()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setSuggestionActionId(null)
    }
  }

  useEffect(() => {
    if (!canAccessPanel) return
    if (tab === 'overview' && canAdmin) void loadStats()
    if (tab === 'moderation' && canAdmin) {
      void loadReports()
      void loadDmReports()
    }
    if (tab === 'audit' && canAdmin) void loadAudit()
  }, [tab, canAccessPanel, canAdmin, loadStats, loadReports, loadDmReports, loadAudit])

  useEffect(() => {
    if (!canAccessPanel || tab !== 'suggestions' || !canAdmin) return
    void loadTopicSuggestions()
    void loadFeatureSuggestions()
  }, [tab, canAccessPanel, canAdmin, loadTopicSuggestions, loadFeatureSuggestions])

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
      await loadDmReports()
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
    if (s === 'published') return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
    if (s === 'scheduled') return 'bg-amber-500/15 text-amber-500 border-amber-500/30'
    return 'bg-surface text-ink border-border-ui'
  }

  if (isLoading) {
    return <main className="p-8 text-ink-muted">Loading...</main>
  }

  if (!user) {
    return <main className="p-8 text-ink-muted">Please login first.</main>
  }

  if (!canAccessPanel) {
    return (
      <main className="min-h-screen bg-surface p-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <h1 className="text-2xl font-bold text-red-500">Forbidden</h1>
          <p className="mt-2 text-ink">Administratora piekļuve nepieciešama.</p>
        </div>
      </main>
    )
  }

  const tabs: { id: TabId; label: string; adminOnly?: boolean }[] = [
    { id: 'overview', label: 'Pārskats', adminOnly: true },
    { id: 'users', label: 'Lietotāji', adminOnly: true },
    { id: 'calendar', label: 'Daily Topic kalendārs', adminOnly: true },
    { id: 'suggestions', label: 'Ieteikumi', adminOnly: true },
    { id: 'moderation', label: 'Moderācija', adminOnly: true },
    { id: 'audit', label: 'Audit žurnāls', adminOnly: true },
  ]

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-6xl p-6 md:p-10 space-y-6">
        <header className="rounded-2xl border border-border-ui bg-surface-2 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-ink">Admin panelis</h1>
              <p className="text-ink-muted mt-2">
                Metrikas, lietotāji, daily topics, moderācija un audits.
              </p>
            </div>
            <div className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg">
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
                      ? 'bg-accent text-accent-fg'
                      : 'bg-surface text-ink hover:bg-border-ui'
                  }`}
                >
                  {t.label}
                </button>
              )
            })}
          </nav>
        </header>

        {success && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-500">{success}</div>
        )}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-500">{error}</div>
        )}

        {tab === 'overview' && canAdmin && (
          <section className="rounded-2xl border border-border-ui bg-surface-2 p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <h2 className="text-xl font-semibold text-ink">Dienas metrikas</h2>
              <input
                type="date"
                value={statsDate}
                onChange={(e) => setStatsDate(e.target.value)}
                className="rounded-lg bg-surface text-ink border border-border-ui px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => loadStats()}
                className="rounded-lg bg-surface text-ink border border-border-ui px-3 py-1 text-sm hover:bg-border-ui"
              >
                Atsvaidzināt
              </button>
            </div>
            {loadingStats ? (
              <p className="text-ink-muted">Ielādē...</p>
            ) : stats ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Jauni lietotāji', stats.newUsers],
                  ['Topic submissions', stats.topicSubmissions],
                ].map(([label, val]) => (
                  <div key={String(label)} className="rounded-xl border border-border-ui bg-surface p-4">
                    <p className="text-sm text-ink-muted">{label}</p>
                    <p className="text-2xl font-bold text-ink">{val}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        )}

        {tab === 'users' && canAdmin && (
          <section className="rounded-2xl border border-border-ui bg-surface-2 p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-ink">Lietotāju pārvaldība</h2>
            <div className="flex flex-wrap gap-3 items-end">
              <input
                value={userFilters.q}
                onChange={(e) => setUserFilters((f) => ({ ...f, q: e.target.value }))}
                placeholder="Meklēt (username, vārds, e-pasts)"
                className="min-w-[200px] flex-1 rounded-xl bg-surface text-ink placeholder-ink-muted/70 border border-border-ui p-2.5 text-sm"
              />
              <select
                value={userFilters.role}
                onChange={(e) => setUserFilters((f) => ({ ...f, role: e.target.value }))}
                className="rounded-xl bg-surface text-ink border border-border-ui p-2.5 text-sm"
              >
                <option value="">Visas lomas</option>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-ink-muted">
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
                className="rounded-xl bg-accent px-4 py-2 text-sm text-accent-fg hover:bg-accent-hover"
              >
                Filtrēt
              </button>
            </div>
            {loadingUsers ? (
              <p className="text-ink-muted">Ielādē...</p>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                {users.map((u) => (
                  <article
                    key={u.id}
                    className="rounded-xl border border-border-ui bg-surface p-4 flex flex-wrap gap-3 items-start justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">
                        {u.displayName} <span className="text-sm text-ink-muted">@{u.username}</span>
                      </p>
                      <p className="text-sm text-ink-muted">{u.email}</p>
                      <p className="mt-1 text-xs text-ink-muted">
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
                          className="rounded-lg bg-surface-2 text-ink border border-border-ui text-sm p-1"
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
            <section className="rounded-2xl border border-border-ui bg-surface-2 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-ink mb-3">Kalendārs</h2>
              <div className="flex flex-wrap gap-3 items-center mb-4">
                <button
                  type="button"
                  className="rounded-lg border border-border-ui text-ink px-2 py-1 text-sm hover:bg-surface"
                  onClick={() => {
                    if (calMonth <= 1) {
                      setCalMonth(12)
                      setCalYear((y) => y - 1)
                    } else setCalMonth((m) => m - 1)
                  }}
                >
                  ←
                </button>
                <span className="font-medium text-ink">
                  {calYear}.{String(calMonth).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  className="rounded-lg border border-border-ui text-ink px-2 py-1 text-sm hover:bg-surface"
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
                <p className="text-ink-muted">Ielādē...</p>
              ) : (
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-ink-muted mb-1">
                  {['P', 'O', 'T', 'C', 'Pk', 'S', 'Sv'].map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                  {calendarCells.map((c, idx) => {
                    const td = c.iso ? calendarMap.get(c.iso) : null
                    return (
                      <div
                        key={idx}
                        className={`min-h-[72px] rounded-lg border p-1 text-left ${
                          c.day ? 'border-border-ui bg-surface' : 'border-transparent bg-transparent'
                        }`}
                      >
                        {c.day != null && (
                          <>
                            <div className="text-xs font-semibold text-ink">{c.day}</div>
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

            <section className="rounded-2xl border border-border-ui bg-surface-2 p-6 shadow-sm">
              <h3 className="font-semibold text-ink mb-2">Bulk create (7 dienas, draft)</h3>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="date"
                  value={bulkStart}
                  onChange={(e) => setBulkStart(e.target.value)}
                  className="rounded-lg bg-surface text-ink border border-border-ui p-2 text-sm"
                />
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => bulkWeek()}
                  className="rounded-xl bg-accent px-4 py-2 text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60"
                >
                  Izveidot nedēļu
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-border-ui bg-surface-2 p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-ink">Pievienot Daily Topic</h2>
              <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Topic title"
                  required
                  className="w-full rounded-xl border border-border-ui bg-surface p-3 text-ink placeholder-ink-muted/70 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                  required
                  min={today}
                  className="w-full rounded-xl border border-border-ui bg-surface p-3 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="rounded-xl border border-border-ui bg-surface text-ink p-3 text-sm md:col-span-2"
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
                  className="md:col-span-2 w-full rounded-xl border border-border-ui bg-surface p-3 text-ink placeholder-ink-muted/70 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-accent px-5 py-2.5 font-medium text-accent-fg transition hover:bg-accent-hover disabled:opacity-60"
                  >
                    {submitting ? 'Saving...' : 'Create Daily Topic'}
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-border-ui bg-surface-2 p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-ink">Topic days (mēnesis)</h2>
              {loadingTopicDays ? (
                <p className="text-ink-muted">Loading...</p>
              ) : topicDays.length === 0 ? (
                <p className="text-ink-muted">Nav ierakstu šajā mēnesī.</p>
              ) : (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                  {topicDays.map((topicDay) => (
                    <article key={topicDay.id} className="rounded-xl border border-border-ui bg-surface p-4">
                      <div className="flex flex-wrap gap-2 items-center justify-between">
                        <h3 className="font-semibold text-ink">
                          {editingTopicId === topicDay.id ? 'Edit Topic' : topicDay.title}
                        </h3>
                        <span className={`rounded-lg px-2 py-1 text-xs border ${statusColor(topicDay.status)}`}>
                          {topicDay.status || 'published'}
                        </span>
                        <span className="rounded-lg bg-surface-2 px-2 py-1 text-sm text-ink-muted border border-border-ui">
                          {editingTopicId === topicDay.id ? editingForm.date : topicDay.date}
                        </span>
                      </div>
                      {editingTopicId === topicDay.id ? (
                        <div className="space-y-3 mt-3">
                          <input
                            value={editingForm.title}
                            onChange={(e) => setEditingForm((prev) => ({ ...prev, title: e.target.value }))}
                            className="w-full rounded-lg border border-border-ui bg-surface-2 p-2.5 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                          />
                          <textarea
                            value={editingForm.description}
                            onChange={(e) => setEditingForm((prev) => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="w-full rounded-lg border border-border-ui bg-surface-2 p-2.5 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                          />
                          <input
                            type="date"
                            value={editingForm.date}
                            onChange={(e) => setEditingForm((prev) => ({ ...prev, date: e.target.value }))}
                            className="w-full md:w-64 rounded-lg border border-border-ui bg-surface-2 p-2.5 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                          />
                          <div className="flex gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => saveTopicEdit(topicDay.id)}
                              disabled={topicActionLoadingId === topicDay.id}
                              className="rounded-lg bg-accent px-3 py-1.5 text-accent-fg transition hover:bg-accent-hover disabled:opacity-60"
                            >
                              {topicActionLoadingId === topicDay.id ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditTopic}
                              className="rounded-lg bg-surface-2 border border-border-ui px-3 py-1.5 text-ink transition hover:bg-surface"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {topicDay.description && <p className="text-ink mt-2">{topicDay.description}</p>}
                          <div className="flex gap-2 mt-3 flex-wrap">
                            <button
                              type="button"
                              onClick={() => startEditTopic(topicDay)}
                              className="rounded-lg bg-accent px-3 py-1.5 text-accent-fg transition hover:bg-accent-hover"
                            >
                              Edit
                            </button>
                            {(['draft', 'scheduled', 'published'] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                disabled={topicActionLoadingId === topicDay.id}
                                onClick={() => setTopicStatus(topicDay.id, st)}
                                className="rounded-lg border border-border-ui bg-surface-2 text-ink px-2 py-1 text-xs hover:bg-surface disabled:opacity-50"
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
                      <p className="text-xs text-ink-muted mt-2">
                        Created by {topicDay.created_by_display_name || topicDay.created_by_username || 'unknown'}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {tab === 'suggestions' && canAdmin && (
          <>
            <section className="rounded-2xl border border-border-ui bg-surface-2 p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-ink">Dienas tēmu ieteikumi</h2>
                <div className="flex gap-2">
                  {(['pending', 'all'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTopicSuggestionFilter(s)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium border transition ${
                        topicSuggestionFilter === s
                          ? 'bg-accent text-accent-fg border-accent'
                          : 'bg-surface text-ink-muted border-border-ui hover:text-ink'
                      }`}
                    >
                      {s === 'pending' ? 'Gaida apstiprinājumu' : 'Visi'}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => loadTopicSuggestions()}
                    className="rounded-lg bg-surface text-ink border border-border-ui px-3 py-1 text-sm hover:bg-border-ui"
                  >
                    Atsvaidzināt
                  </button>
                </div>
              </div>

              {loadingSuggestions ? (
                <p className="text-ink-muted">Ielādē...</p>
              ) : topicSuggestions.length === 0 ? (
                <p className="text-ink-muted">Nav ieteikumu.</p>
              ) : (
                <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                  {topicSuggestions.map((s) => (
                    <article
                      key={s.id}
                      className="rounded-xl border border-border-ui bg-surface p-4 space-y-2"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-ink break-words">{s.title}</h3>
                          <p className="text-xs text-ink-muted">
                            @{s.author?.username} · {new Date(s.created_at).toLocaleString()} ·{' '}
                            balsis: {s.votes} ({s.vote_count})
                          </p>
                        </div>
                        <span
                          className={`rounded-lg px-2 py-1 text-xs border ${
                            s.status === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                              : s.status === 'rejected'
                              ? 'bg-red-500/15 text-red-500 border-red-500/30'
                              : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                          }`}
                        >
                          {s.status}
                        </span>
                      </div>
                      {s.description && (
                        <p className="text-ink text-sm whitespace-pre-wrap">{s.description}</p>
                      )}
                      {s.image_url && (
                        <img
                          src={s.image_url}
                          alt={s.title}
                          className="max-h-64 rounded-lg border border-border-ui"
                        />
                      )}
                      {s.admin_note && (
                        <p className="text-xs text-ink-muted">
                          <span className="font-semibold text-ink">Piezīme:</span> {s.admin_note}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {s.status !== 'approved' && (
                          <button
                            type="button"
                            disabled={suggestionActionId === s.id}
                            onClick={() => approveTopicSuggestion(s.id, s.title)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500 disabled:opacity-60"
                          >
                            Publicēt kā dienas tēmu...
                          </button>
                        )}
                        {s.status !== 'rejected' && (
                          <button
                            type="button"
                            disabled={suggestionActionId === s.id}
                            onClick={() => rejectTopicSuggestion(s.id)}
                            className="rounded-lg bg-surface-2 border border-border-ui text-ink px-3 py-1.5 text-xs hover:bg-surface disabled:opacity-60"
                          >
                            Noraidīt
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={suggestionActionId === s.id}
                          onClick={() => deleteTopicSuggestion(s.id)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-500 disabled:opacity-60"
                        >
                          Dzēst
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border-ui bg-surface-2 p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-ink">Vispārīgie ieteikumi</h2>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'pending', 'planned', 'in_progress', 'done', 'rejected'] as const).map(
                    (s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFeatureSuggestionFilter(s)}
                        className={`rounded-lg px-3 py-1 text-xs font-medium border transition ${
                          featureSuggestionFilter === s
                            ? 'bg-accent text-accent-fg border-accent'
                            : 'bg-surface text-ink-muted border-border-ui hover:text-ink'
                        }`}
                      >
                        {s === 'all' ? 'Visi' : FEATURE_STATUS_LABELS[s]}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => loadFeatureSuggestions()}
                    className="rounded-lg bg-surface text-ink border border-border-ui px-3 py-1 text-sm hover:bg-border-ui"
                  >
                    Atsvaidzināt
                  </button>
                </div>
              </div>

              {loadingSuggestions ? (
                <p className="text-ink-muted">Ielādē...</p>
              ) : featureSuggestions.length === 0 ? (
                <p className="text-ink-muted">Nav ieteikumu.</p>
              ) : (
                <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                  {featureSuggestions.map((s) => (
                    <FeatureSuggestionAdminCard
                      key={s.id}
                      suggestion={s}
                      busy={suggestionActionId === s.id}
                      onUpdate={(patch) => updateFeatureSuggestion(s.id, patch)}
                      onDelete={() => deleteFeatureSuggestion(s.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {tab === 'moderation' && canAdmin && (
          <>
          <section className="rounded-2xl border border-border-ui bg-surface-2 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-ink">Ziņotie ieraksti</h2>
              <button
                type="button"
                onClick={() => loadReports()}
                className="rounded-lg bg-surface text-ink border border-border-ui px-3 py-1 text-sm hover:bg-border-ui"
              >
                Atsvaidzināt
              </button>
            </div>
            {loadingReports ? (
              <p className="text-ink-muted">Ielādē...</p>
            ) : reports.length === 0 ? (
              <p className="text-ink-muted">Nav atvērtu ziņojumu.</p>
            ) : (
              <div className="space-y-4 max-h-[75vh] overflow-y-auto">
                {reports.map((r) => (
                  <article key={r.id} className="rounded-xl border border-border-ui bg-surface p-4 space-y-2">
                    <div className="text-sm text-ink-muted">
                      @{r.reporter_username} · {r.status} · {r.created_at}
                    </div>
                    <p className="text-xs text-ink-muted">Thread {r.thread_id}</p>
                    <p className="text-ink text-sm whitespace-pre-wrap line-clamp-4">{r.thread_content}</p>
                    {r.reason ? <p className="text-xs text-ink-muted">Iemesls: {r.reason}</p> : null}
                    <p className="text-xs text-ink-muted">visibility: {r.visibility}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-accent px-2 py-1 text-xs text-accent-fg hover:bg-accent-hover"
                        onClick={() => moderationAction(`/api/reports/${r.id}`, 'PATCH', { status: 'reviewed' })}
                      >
                        Atzīmēt kā apskatītu
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-surface-2 border border-border-ui px-2 py-1 text-xs text-ink hover:bg-surface"
                        onClick={() => moderationAction(`/api/reports/${r.id}`, 'PATCH', { status: 'dismissed' })}
                      >
                        Noraidīt
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-amber-600 px-2 py-1 text-xs text-white hover:bg-amber-500"
                        onClick={() =>
                          moderationAction(`/api/threads/${r.thread_id}/moderation`, 'PATCH', { action: 'hide' })
                        }
                      >
                        Slēpt
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500"
                        onClick={() =>
                          moderationAction(`/api/threads/${r.thread_id}/moderation`, 'PATCH', { action: 'unhide' })
                        }
                      >
                        Atvērt
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-500"
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

          <section className="rounded-2xl border border-border-ui bg-surface-2 p-6 shadow-sm mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-ink">Ziņotās privātās ziņas</h2>
              <button
                type="button"
                onClick={() => loadDmReports()}
                className="rounded-lg bg-surface text-ink border border-border-ui px-3 py-1 text-sm hover:bg-border-ui"
              >
                Atsvaidzināt
              </button>
            </div>
            {loadingDmReports ? (
              <p className="text-ink-muted">Ielādē...</p>
            ) : dmReports.length === 0 ? (
              <p className="text-ink-muted">Nav DM ziņojumu.</p>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {dmReports.map((r) => (
                  <article key={r.id} className="rounded-xl border border-border-ui bg-surface p-4 space-y-2">
                    <div className="text-sm text-ink-muted">
                      @{r.reporter_username} · {r.status} · {r.created_at}
                    </div>
                    <p className="text-xs text-ink-muted">
                      Ziņa no @{r.sender_username} · saruna {r.conversation_id}
                    </p>
                    <p className="text-ink text-sm whitespace-pre-wrap line-clamp-6">{r.message_content}</p>
                    {r.reason ? <p className="text-xs text-ink-muted">Iemesls: {r.reason}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-accent px-2 py-1 text-xs text-accent-fg hover:bg-accent-hover"
                        onClick={() =>
                          moderationAction(`/api/admin/dm-reports/${r.id}`, 'PATCH', { status: 'reviewed' })
                        }
                      >
                        Atzīmēt kā apskatītu
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-surface-2 border border-border-ui px-2 py-1 text-xs text-ink hover:bg-surface"
                        onClick={() =>
                          moderationAction(`/api/admin/dm-reports/${r.id}`, 'PATCH', { status: 'dismissed' })
                        }
                      >
                        Noraidīt
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          </>
        )}

        {tab === 'audit' && canAdmin && (
          <section className="rounded-2xl border border-border-ui bg-surface-2 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-ink">Admin aktivitātes</h2>
              <button
                type="button"
                onClick={() => loadAudit()}
                className="rounded-lg bg-surface text-ink border border-border-ui px-3 py-1 text-sm hover:bg-border-ui"
              >
                Atsvaidzināt
              </button>
            </div>
            {loadingAudit ? (
              <p className="text-ink-muted">Ielādē...</p>
            ) : (
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-surface-2 border-b border-border-ui">
                    <tr>
                      <th className="p-2 text-ink">Laiks</th>
                      <th className="p-2 text-ink">Administrators</th>
                      <th className="p-2 text-ink">Darbība</th>
                      <th className="p-2 text-ink">Entītāte</th>
                      <th className="p-2 text-ink">Metadati</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((a) => (
                      <tr key={a.id} className="border-b border-border-ui align-top">
                        <td className="p-2 whitespace-nowrap text-ink-muted">{a.createdAt}</td>
                        <td className="p-2 text-ink">
                          @{a.actorUsername}
                          <div className="text-xs text-ink-muted">{a.actorDisplayName}</div>
                        </td>
                        <td className="p-2 font-mono text-xs text-ink">{a.action}</td>
                        <td className="p-2 text-xs text-ink">
                          {a.entityType} {a.entityId ? <span className="text-ink-muted">{a.entityId}</span> : ''}
                        </td>
                        <td className="p-2 max-w-md break-all font-mono text-[11px] text-ink">{a.metadata}</td>
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

function FeatureSuggestionAdminCard({
  suggestion,
  busy,
  onUpdate,
  onDelete,
}: {
  suggestion: FeatureSuggestion
  busy: boolean
  onUpdate: (patch: { status?: FeatureSuggestionStatus; adminNote?: string }) => void
  onDelete: () => void
}) {
  const [note, setNote] = useState(suggestion.admin_note || '')
  const [status, setStatus] = useState<FeatureSuggestionStatus>(suggestion.status)

  useEffect(() => {
    setNote(suggestion.admin_note || '')
    setStatus(suggestion.status)
  }, [suggestion.id, suggestion.admin_note, suggestion.status])

  return (
    <article className="rounded-xl border border-border-ui bg-surface p-4 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-ink break-words">{suggestion.title}</h3>
          <p className="text-xs text-ink-muted">
            @{suggestion.author?.username} · {new Date(suggestion.created_at).toLocaleString()} ·{' '}
            balsis: {suggestion.votes} ({suggestion.vote_count})
          </p>
        </div>
        <span className="rounded-lg bg-surface-2 px-2 py-1 text-xs border border-border-ui text-ink-muted">
          {FEATURE_CATEGORY_LABELS[suggestion.category] || suggestion.category}
        </span>
      </div>
      {suggestion.description && (
        <p className="text-ink text-sm whitespace-pre-wrap">{suggestion.description}</p>
      )}
      {suggestion.image_url && (
        <img
          src={suggestion.image_url}
          alt={suggestion.title}
          className="max-h-64 rounded-lg border border-border-ui"
        />
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as FeatureSuggestionStatus)}
          className="rounded-lg bg-surface-2 text-ink border border-border-ui text-sm p-1.5"
        >
          {(['pending', 'planned', 'in_progress', 'done', 'rejected'] as FeatureSuggestionStatus[]).map(
            (st) => (
              <option key={st} value={st}>
                {FEATURE_STATUS_LABELS[st]}
              </option>
            )
          )}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Admin piezīme (neobligāti)"
          className="flex-1 min-w-[180px] rounded-lg bg-surface-2 text-ink border border-border-ui p-1.5 text-sm"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => onUpdate({ status, adminNote: note })}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs text-accent-fg hover:bg-accent-hover disabled:opacity-60"
        >
          Saglabāt
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-500 disabled:opacity-60"
        >
          Dzēst
        </button>
      </div>
    </article>
  )
}

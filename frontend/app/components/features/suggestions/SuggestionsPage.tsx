'use client'

import { useState } from 'react'
import { LightBulbIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import { useUser } from '../../contexts/UserContext'
import { useToast } from '../../contexts/ToastContext'
import SuggestionCard from './SuggestionCard'
import TopicSuggestionForm from './TopicSuggestionForm'
import FeatureSuggestionForm from './FeatureSuggestionForm'
import { useFeatureSuggestions, useTopicSuggestions } from './useSuggestions'
import {
  FEATURE_CATEGORY_LABELS,
  FEATURE_STATUS_LABELS,
  TOPIC_STATUS_LABELS,
  type FeatureCategory,
  type FeatureSuggestionStatus,
  type SortOrder,
  type TopicSuggestionStatus,
} from './types'

type TabKind = 'topics' | 'features'

export default function SuggestionsPage() {
  const [tab, setTab] = useState<TabKind>('topics')

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink mb-1">Ieteikumi</h1>
        <p className="text-ink-muted text-sm">
          Dalies ar dienas tēmas idejām un ieteikumiem platformai. Balsot var katrs reģistrēts
          lietotājs.
        </p>
      </div>

      <div className="flex gap-2 mb-6 bg-surface-2 border border-border-ui rounded-xl p-1">
        <button
          onClick={() => setTab('topics')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'topics'
              ? 'bg-accent text-accent-fg'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          <CalendarDaysIcon className="w-4 h-4" />
          Dienas tēmas
        </button>
        <button
          onClick={() => setTab('features')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'features'
              ? 'bg-accent text-accent-fg'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          <LightBulbIcon className="w-4 h-4" />
          Vispārīgie
        </button>
      </div>

      {tab === 'topics' ? <TopicsTab /> : <FeaturesTab />}
    </div>
  )
}

function TopicsTab() {
  const { user } = useUser()
  const { success, error: showError } = useToast()
  const [status, setStatus] = useState<TopicSuggestionStatus | 'all'>('pending')
  const [sort, setSort] = useState<SortOrder>('top')
  const { suggestions, loading, reload, vote } = useTopicSuggestions({ status, sort })

  const canVote = !!user?.id

  const handleDelete = async (id: string) => {
    if (!window.confirm('Dzēst šo ieteikumu?')) return
    try {
      const res = await fetch(`/api/topic-suggestions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Neizdevās izdzēst')
      success('Dzēsts', 'Ieteikums izdzēsts')
      reload()
    } catch (err: any) {
      showError('Kļūda', err.message || 'Mēģini vēlreiz')
    }
  }

  return (
    <div className="space-y-6">
      <TopicSuggestionForm onSubmitted={reload} />

      <Filters
        sort={sort}
        onSortChange={setSort}
        status={status}
        onStatusChange={(s) => setStatus(s as TopicSuggestionStatus | 'all')}
        statusOptions={[
          { id: 'pending', label: TOPIC_STATUS_LABELS.pending },
          { id: 'approved', label: TOPIC_STATUS_LABELS.approved },
          { id: 'rejected', label: TOPIC_STATUS_LABELS.rejected },
          { id: 'all', label: 'Visi' },
        ]}
      />

      {loading ? (
        <SkeletonList />
      ) : suggestions.length === 0 ? (
        <EmptyState
          title="Pagaidām nav ieteikumu"
          message="Esi pirmais, kas iesniedz dienas tēmas ideju!"
        />
      ) : (
        <div className="space-y-4">
          {suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              kind="topic"
              suggestion={s}
              canVote={canVote}
              onVote={(v) => vote(s.id, v)}
              onDelete={() => handleDelete(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FeaturesTab() {
  const { user } = useUser()
  const { success, error: showError } = useToast()
  const [status, setStatus] = useState<FeatureSuggestionStatus | 'all'>('all')
  const [sort, setSort] = useState<SortOrder>('top')
  const [category, setCategory] = useState<FeatureCategory | 'all'>('all')
  const { suggestions, loading, reload, vote } = useFeatureSuggestions({
    status,
    sort,
    category,
  })

  const canVote = !!user?.id

  const handleDelete = async (id: string) => {
    if (!window.confirm('Dzēst šo ieteikumu?')) return
    try {
      const res = await fetch(`/api/feature-suggestions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Neizdevās izdzēst')
      success('Dzēsts', 'Ieteikums izdzēsts')
      reload()
    } catch (err: any) {
      showError('Kļūda', err.message || 'Mēģini vēlreiz')
    }
  }

  return (
    <div className="space-y-6">
      <FeatureSuggestionForm onSubmitted={reload} />

      <Filters
        sort={sort}
        onSortChange={setSort}
        status={status}
        onStatusChange={(s) => setStatus(s as FeatureSuggestionStatus | 'all')}
        statusOptions={[
          { id: 'all', label: 'Visi' },
          { id: 'pending', label: FEATURE_STATUS_LABELS.pending },
          { id: 'planned', label: FEATURE_STATUS_LABELS.planned },
          { id: 'in_progress', label: FEATURE_STATUS_LABELS.in_progress },
          { id: 'done', label: FEATURE_STATUS_LABELS.done },
          { id: 'rejected', label: FEATURE_STATUS_LABELS.rejected },
        ]}
        extra={
          <div className="flex flex-wrap gap-1">
            {(['all', ...Object.keys(FEATURE_CATEGORY_LABELS)] as (
              | FeatureCategory
              | 'all'
            )[]).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  category === c
                    ? 'bg-accent/15 text-accent border-accent/30'
                    : 'bg-surface text-ink-muted border-border-ui hover:text-ink'
                }`}
              >
                {c === 'all'
                  ? 'Visas kat.'
                  : FEATURE_CATEGORY_LABELS[c as FeatureCategory]}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <SkeletonList />
      ) : suggestions.length === 0 ? (
        <EmptyState
          title="Pagaidām nav ieteikumu"
          message="Iesniedz pirmo — piem., ziedošanas iespēju platformai!"
        />
      ) : (
        <div className="space-y-4">
          {suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              kind="feature"
              suggestion={s}
              canVote={canVote}
              onVote={(v) => vote(s.id, v)}
              onDelete={() => handleDelete(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Filters({
  sort,
  onSortChange,
  status,
  onStatusChange,
  statusOptions,
  extra,
}: {
  sort: SortOrder
  onSortChange: (s: SortOrder) => void
  status: string
  onStatusChange: (s: string) => void
  statusOptions: { id: string; label: string }[]
  extra?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex flex-wrap gap-1 bg-surface-2 border border-border-ui rounded-xl p-1">
        {statusOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onStatusChange(opt.id)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              status === opt.id
                ? 'bg-accent text-accent-fg'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1 bg-surface-2 border border-border-ui rounded-xl p-1">
        {([
          ['top', 'Top'],
          ['new', 'Jaunākie'],
          ['old', 'Vecākie'],
        ] as [SortOrder, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => onSortChange(id)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              sort === id
                ? 'bg-accent text-accent-fg'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {extra}
    </div>
  )
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-surface-2 border border-border-ui rounded-2xl p-5 animate-pulse"
        >
          <div className="h-5 bg-border-ui rounded w-3/4 mb-3" />
          <div className="h-4 bg-border-ui rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="text-center py-10 bg-surface-2 border border-border-ui rounded-2xl">
      <LightBulbIcon className="w-12 h-12 text-ink-muted/60 mx-auto mb-3" />
      <h4 className="text-base font-semibold text-ink mb-1">{title}</h4>
      <p className="text-ink-muted text-sm">{message}</p>
    </div>
  )
}

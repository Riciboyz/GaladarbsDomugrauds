'use client'

import { ChevronUpIcon, ChevronDownIcon, TrashIcon } from '@heroicons/react/24/outline'
import { ChevronUpIcon as ChevronUpSolid, ChevronDownIcon as ChevronDownSolid } from '@heroicons/react/24/solid'
import { useUser } from '../../contexts/UserContext'
import {
  FEATURE_CATEGORY_LABELS,
  FEATURE_STATUS_LABELS,
  TOPIC_STATUS_LABELS,
  type FeatureSuggestion,
  type FeatureSuggestionStatus,
  type TopicSuggestion,
  type TopicSuggestionStatus,
} from './types'

type Shared = {
  onVote: (value: 1 | -1 | 0) => void
  onDelete?: () => void
  canVote: boolean
}

type TopicProps = Shared & {
  kind: 'topic'
  suggestion: TopicSuggestion
}

type FeatureProps = Shared & {
  kind: 'feature'
  suggestion: FeatureSuggestion
}

export default function SuggestionCard(props: TopicProps | FeatureProps) {
  const { suggestion, onVote, onDelete, canVote, kind } = props
  const { user } = useUser()
  const isAuthor = user?.id && suggestion.author?.id === user.id
  const isAdmin = (user as any)?.role === 'admin'
  const canDelete = (isAuthor || isAdmin) && onDelete

  const handleVote = (value: 1 | -1) => {
    if (!canVote) return
    onVote(suggestion.my_vote === value ? 0 : value)
  }

  const UpIcon = suggestion.my_vote === 1 ? ChevronUpSolid : ChevronUpIcon
  const DownIcon = suggestion.my_vote === -1 ? ChevronDownSolid : ChevronDownIcon

  return (
    <div className="bg-surface-2 border border-border-ui rounded-2xl p-5 shadow-dg-sm">
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-1 pt-1">
          <button
            onClick={() => handleVote(1)}
            disabled={!canVote}
            aria-label="Balsot par"
            className={`p-1.5 rounded-lg transition-colors ${
              suggestion.my_vote === 1
                ? 'bg-accent/15 text-accent'
                : 'text-ink-muted hover:text-ink hover:bg-surface'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <UpIcon className="w-5 h-5" />
          </button>
          <span
            className={`text-sm font-semibold tabular-nums ${
              suggestion.votes > 0
                ? 'text-accent'
                : suggestion.votes < 0
                ? 'text-red-500'
                : 'text-ink-muted'
            }`}
          >
            {suggestion.votes > 0 ? '+' : ''}
            {suggestion.votes}
          </span>
          <button
            onClick={() => handleVote(-1)}
            disabled={!canVote}
            aria-label="Balsot pret"
            className={`p-1.5 rounded-lg transition-colors ${
              suggestion.my_vote === -1
                ? 'bg-red-500/15 text-red-500'
                : 'text-ink-muted hover:text-ink hover:bg-surface'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <DownIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-lg font-semibold text-ink break-words">{suggestion.title}</h3>
            <div className="flex items-center gap-2 shrink-0">
              {kind === 'feature' && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface text-ink-muted border border-border-ui">
                  {FEATURE_CATEGORY_LABELS[(suggestion as FeatureSuggestion).category] ||
                    (suggestion as FeatureSuggestion).category}
                </span>
              )}
              <StatusBadge kind={kind} status={suggestion.status as any} />
            </div>
          </div>

          {suggestion.description && (
            <p className="text-ink-muted text-sm whitespace-pre-wrap mb-3">
              {suggestion.description}
            </p>
          )}

          {suggestion.image_url && (
            <img
              src={suggestion.image_url}
              alt={suggestion.title}
              className="max-w-full max-h-80 h-auto rounded-xl border border-border-ui mb-3 object-cover"
            />
          )}

          {suggestion.admin_note && (
            <div className="mb-3 text-xs bg-surface border border-border-ui rounded-lg p-2.5 text-ink-muted">
              <span className="font-semibold text-ink">Admin piezīme:</span>{' '}
              {suggestion.admin_note}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-ink-muted">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-border-ui flex items-center justify-center overflow-hidden shrink-0">
                {suggestion.author?.avatar ? (
                  <img
                    src={suggestion.author.avatar}
                    alt={suggestion.author.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] font-medium text-ink-muted">
                    {suggestion.author?.display_name?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <span className="truncate">
                {suggestion.author?.display_name || '—'}
              </span>
              <span className="opacity-60">·</span>
              <span>{new Date(suggestion.created_at).toLocaleDateString()}</span>
              <span className="opacity-60">·</span>
              <span>{suggestion.vote_count} balsis</span>
            </div>
            {canDelete && (
              <button
                onClick={onDelete}
                className="p-1 rounded hover:bg-red-500/10 hover:text-red-500 text-ink-muted transition-colors"
                aria-label="Dzēst ieteikumu"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({
  kind,
  status,
}: {
  kind: 'topic' | 'feature'
  status: TopicSuggestionStatus | FeatureSuggestionStatus
}) {
  const label =
    kind === 'topic'
      ? TOPIC_STATUS_LABELS[status as TopicSuggestionStatus]
      : FEATURE_STATUS_LABELS[status as FeatureSuggestionStatus]

  const tone =
    status === 'approved' || status === 'done'
      ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
      : status === 'rejected'
      ? 'bg-red-500/15 text-red-500 border-red-500/30'
      : status === 'in_progress'
      ? 'bg-blue-500/15 text-blue-500 border-blue-500/30'
      : status === 'planned'
      ? 'bg-accent/15 text-accent border-accent/30'
      : 'bg-surface text-ink-muted border-border-ui'

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${tone}`}
    >
      {label || status}
    </span>
  )
}

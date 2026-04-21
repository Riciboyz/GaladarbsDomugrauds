'use client'

import { useCallback, useEffect, useState } from 'react'
import { useWebSocket } from '../../contexts/WebSocketContext'
import type {
  FeatureSuggestion,
  FeatureSuggestionStatus,
  SortOrder,
  TopicSuggestion,
  TopicSuggestionStatus,
} from './types'

type Kind = 'topic' | 'feature'

interface TopicOptions {
  status: TopicSuggestionStatus | 'all'
  sort: SortOrder
}

interface FeatureOptions {
  status: FeatureSuggestionStatus | 'all'
  sort: SortOrder
  category: string
}

function applyVoteUpdate<T extends { id: string; votes: number; vote_count: number }>(
  list: T[],
  payload: { id: string; votes: number; vote_count: number }
): T[] {
  return list.map((item) =>
    item.id === payload.id
      ? { ...item, votes: payload.votes, vote_count: payload.vote_count }
      : item
  )
}

export function useTopicSuggestions(options: TopicOptions) {
  const { status, sort } = options
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const { lastMessage } = useWebSocket()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/topic-suggestions?status=${encodeURIComponent(status)}&sort=${sort}`,
        { credentials: 'include' }
      )
      const data = await res.json()
      if (data.success) setSuggestions(data.suggestions || [])
    } catch (err) {
      console.error('Failed to load topic suggestions:', err)
    } finally {
      setLoading(false)
    }
  }, [status, sort])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!lastMessage) return
    const { type, data } = lastMessage as any
    if (type === 'topic_suggestion_created') {
      if (status === 'all' || status === 'pending') {
        setSuggestions((prev) =>
          prev.some((p) => p.id === data.id) ? prev : [data, ...prev]
        )
      }
    } else if (type === 'topic_suggestion_updated') {
      setSuggestions((prev) => {
        const idx = prev.findIndex((p) => p.id === data.id)
        if (idx === -1) {
          if (status === 'all' || status === data.status) return [data, ...prev]
          return prev
        }
        if (status !== 'all' && data.status !== status) {
          return prev.filter((p) => p.id !== data.id)
        }
        const next = [...prev]
        next[idx] = { ...next[idx], ...data }
        return next
      })
    } else if (type === 'topic_suggestion_deleted') {
      setSuggestions((prev) => prev.filter((p) => p.id !== data.id))
    } else if (type === 'topic_suggestion_vote_updated') {
      setSuggestions((prev) => applyVoteUpdate(prev, data))
    }
  }, [lastMessage, status])

  const vote = useCallback(async (id: string, value: 1 | -1 | 0) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              my_vote: value,
              votes: s.votes - s.my_vote + value,
              vote_count:
                s.my_vote === 0 && value !== 0
                  ? s.vote_count + 1
                  : s.my_vote !== 0 && value === 0
                  ? Math.max(0, s.vote_count - 1)
                  : s.vote_count,
            }
          : s
      )
    )
    try {
      const res = await fetch(`/api/topic-suggestions/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ value }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Vote failed')
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, votes: data.votes, vote_count: data.vote_count, my_vote: value }
            : s
        )
      )
      return true
    } catch (err) {
      console.error('Vote failed:', err)
      return false
    }
  }, [])

  return { suggestions, loading, reload: load, vote, setSuggestions }
}

export function useFeatureSuggestions(options: FeatureOptions) {
  const { status, sort, category } = options
  const [suggestions, setSuggestions] = useState<FeatureSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const { lastMessage } = useWebSocket()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/feature-suggestions?status=${encodeURIComponent(
          status
        )}&sort=${sort}&category=${encodeURIComponent(category)}`,
        { credentials: 'include' }
      )
      const data = await res.json()
      if (data.success) setSuggestions(data.suggestions || [])
    } catch (err) {
      console.error('Failed to load feature suggestions:', err)
    } finally {
      setLoading(false)
    }
  }, [status, sort, category])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!lastMessage) return
    const { type, data } = lastMessage as any
    if (type === 'feature_suggestion_created') {
      const matchesStatus = status === 'all' || status === 'pending'
      const matchesCategory = category === 'all' || category === data.category
      if (matchesStatus && matchesCategory) {
        setSuggestions((prev) =>
          prev.some((p) => p.id === data.id) ? prev : [data, ...prev]
        )
      }
    } else if (type === 'feature_suggestion_updated') {
      setSuggestions((prev) => {
        const idx = prev.findIndex((p) => p.id === data.id)
        const matchesStatus = status === 'all' || data.status === status
        const matchesCategory = category === 'all' || category === data.category
        if (idx === -1) {
          if (matchesStatus && matchesCategory) return [data, ...prev]
          return prev
        }
        if (!matchesStatus || !matchesCategory) {
          return prev.filter((p) => p.id !== data.id)
        }
        const next = [...prev]
        next[idx] = { ...next[idx], ...data }
        return next
      })
    } else if (type === 'feature_suggestion_deleted') {
      setSuggestions((prev) => prev.filter((p) => p.id !== data.id))
    } else if (type === 'feature_suggestion_vote_updated') {
      setSuggestions((prev) => applyVoteUpdate(prev, data))
    }
  }, [lastMessage, status, category])

  const vote = useCallback(async (id: string, value: 1 | -1 | 0) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              my_vote: value,
              votes: s.votes - s.my_vote + value,
              vote_count:
                s.my_vote === 0 && value !== 0
                  ? s.vote_count + 1
                  : s.my_vote !== 0 && value === 0
                  ? Math.max(0, s.vote_count - 1)
                  : s.vote_count,
            }
          : s
      )
    )
    try {
      const res = await fetch(`/api/feature-suggestions/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ value }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Vote failed')
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, votes: data.votes, vote_count: data.vote_count, my_vote: value }
            : s
        )
      )
      return true
    } catch (err) {
      console.error('Vote failed:', err)
      return false
    }
  }, [])

  return { suggestions, loading, reload: load, vote, setSuggestions }
}

export type SuggestionKind = Kind

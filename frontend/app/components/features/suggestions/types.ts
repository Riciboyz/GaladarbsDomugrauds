export type TopicSuggestionStatus = 'pending' | 'approved' | 'rejected'
export type FeatureSuggestionStatus =
  | 'pending'
  | 'planned'
  | 'in_progress'
  | 'done'
  | 'rejected'
export type FeatureCategory = 'donation' | 'ui' | 'feature' | 'other'

export interface SuggestionAuthor {
  id: string
  username: string
  display_name: string
  avatar?: string
}

export interface TopicSuggestion {
  id: string
  title: string
  description: string
  image_url: string
  status: TopicSuggestionStatus
  approved_topic_id: string | null
  admin_note: string
  created_at: string
  reviewed_at: string | null
  votes: number
  vote_count: number
  my_vote: 0 | 1 | -1
  author: SuggestionAuthor
}

export interface FeatureSuggestion {
  id: string
  title: string
  description: string
  image_url: string
  category: FeatureCategory
  status: FeatureSuggestionStatus
  admin_note: string
  created_at: string
  reviewed_at: string | null
  votes: number
  vote_count: number
  my_vote: 0 | 1 | -1
  author: SuggestionAuthor
}

export type SortOrder = 'top' | 'new' | 'old'

export const FEATURE_CATEGORY_LABELS: Record<FeatureCategory, string> = {
  donation: 'Ziedošana',
  ui: 'Dizains / UX',
  feature: 'Funkcija',
  other: 'Cits',
}

export const FEATURE_STATUS_LABELS: Record<FeatureSuggestionStatus, string> = {
  pending: 'Jauns',
  planned: 'Plānots',
  in_progress: 'Izstrādē',
  done: 'Pabeigts',
  rejected: 'Noraidīts',
}

export const TOPIC_STATUS_LABELS: Record<TopicSuggestionStatus, string> = {
  pending: 'Gaida',
  approved: 'Apstiprināts',
  rejected: 'Noraidīts',
}

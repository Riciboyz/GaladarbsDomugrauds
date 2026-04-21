'use client'

import { useRef, useState } from 'react'
import { PhotoIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { useUser } from '../../contexts/UserContext'
import { useToast } from '../../contexts/ToastContext'
import { FEATURE_CATEGORY_LABELS, type FeatureCategory } from './types'

interface Props {
  onSubmitted?: () => void
}

export default function FeatureSuggestionForm({ onSubmitted }: Props) {
  const { user } = useUser()
  const { success, error: showError } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [category, setCategory] = useState<FeatureCategory>('feature')
  const [submitting, setSubmitting] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      showError('Fails pārāk liels', 'Maksimālais izmērs 50MB')
      return
    }
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload/chat', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setImageUrl(data.url)
    } catch (err: any) {
      showError('Augšupielāde neizdevās', err.message || 'Mēģini vēlreiz')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = title.trim()
    if (!t) {
      showError('Trūkst virsraksta', 'Ievadi ieteikuma virsrakstu')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/feature-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: t,
          description: description.trim(),
          imageUrl,
          category,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Neizdevās iesniegt')
      success('Paldies par ieteikumu!', 'Admins to apskatīs un atzīmēs statusu')
      setTitle('')
      setDescription('')
      setImageUrl('')
      setCategory('feature')
      onSubmitted?.()
    } catch (err: any) {
      showError('Kļūda', err.message || 'Mēģini vēlreiz')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="bg-surface-2 border border-border-ui rounded-2xl p-5 text-ink-muted text-sm">
        Pieraksties, lai iesniegtu ieteikumu.
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-2 border border-border-ui rounded-2xl p-5 space-y-3"
    >
      <h3 className="text-lg font-semibold text-ink">Iesniedz ieteikumu</h3>
      <p className="text-sm text-ink-muted -mt-1">
        Dalies, ko vēlētos redzēt platformā (piem., ziedošanas iespēju, jaunu funkciju, dizaina
        uzlabojumu).
      </p>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        placeholder="Ieteikuma virsraksts"
        className="w-full px-4 py-3 bg-surface text-ink placeholder-ink-muted/70 border border-border-ui rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        maxLength={4000}
        placeholder="Pastāsti detalizēti — kas, kāpēc, kāds labums lietotājiem"
        className="w-full px-4 py-3 bg-surface text-ink placeholder-ink-muted/70 border border-border-ui rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
      />

      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(FEATURE_CATEGORY_LABELS) as FeatureCategory[]).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              category === cat
                ? 'bg-accent text-accent-fg border-accent'
                : 'bg-surface text-ink-muted border-border-ui hover:text-ink'
            }`}
          >
            {FEATURE_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {imageUrl && (
        <div className="relative inline-block">
          <img
            src={imageUrl}
            alt="Pievienotā bilde"
            className="max-h-56 rounded-xl border border-border-ui"
          />
          <button
            type="button"
            onClick={() => setImageUrl('')}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            aria-label="Noņemt bildi"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 text-ink-muted hover:text-ink hover:bg-surface rounded-lg transition-colors"
        >
          <PhotoIcon className="w-5 h-5" />
          <span className="text-sm">Pievienot bildi</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />

        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-fg rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <span className="w-4 h-4 border-2 border-accent-fg/30 border-t-accent-fg rounded-full animate-spin" />
          ) : (
            <PaperAirplaneIcon className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">Iesniegt</span>
        </button>
      </div>
    </form>
  )
}

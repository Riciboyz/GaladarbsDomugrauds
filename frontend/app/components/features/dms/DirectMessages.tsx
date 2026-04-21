'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  PaperAirplaneIcon,
  ChevronLeftIcon,
  FlagIcon,
  NoSymbolIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useUser } from '../../contexts/UserContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { useToast } from '../../contexts/ToastContext'

type LastMsg = {
  id: string
  content: string
  senderId: string
  createdAt: string
  preview?: string
  messageType?: string
  attachmentUrl?: string
}

type ConvRow = {
  id: string
  updatedAt: string
  otherUser: { id: string; username: string; displayName: string; avatar?: string }
  lastMessage: LastMsg | null
  unread: boolean
}

type MsgRow = {
  id: string
  conversationId: string
  senderId: string
  content: string
  createdAt: string
  username?: string
  displayName?: string
  avatar?: string
  messageType?: string
  attachmentUrl?: string
}

interface DirectMessagesProps {
  initialOtherUserId?: string | null
  onConsumedInitialOther?: () => void
}

function normalizeUploadUrl(url: string): string {
  let u = url || ''
  if (/^https?:\/\//i.test(u)) {
    try {
      u = new URL(u).pathname
    } catch {
      /* leave */
    }
  }
  return u
}

function listPreview(c: ConvRow): string {
  if (!c.lastMessage) return 'Nav ziņu'
  if (c.lastMessage.preview) return c.lastMessage.preview
  if (c.lastMessage.attachmentUrl && c.lastMessage.messageType === 'image') {
    return c.lastMessage.content?.trim() || '📷 Attēls'
  }
  if (c.lastMessage.attachmentUrl) return '📎 Fails'
  return c.lastMessage.content || ''
}

export default function DirectMessages({
  initialOtherUserId,
  onConsumedInitialOther,
}: DirectMessagesProps) {
  const { user } = useUser()
  const { lastMessage, isConnected, sendDmMessage } = useWebSocket()
  const { success, error: toastError } = useToast()

  const [conversations, setConversations] = useState<ConvRow[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MsgRow[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [mobileList, setMobileList] = useState(true)
  const [reportFor, setReportFor] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; messageType: 'image' } | null>(null)
  const listEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  )

  const loadConversations = useCallback(async () => {
    setLoadingList(true)
    try {
      const res = await fetch('/api/dms/conversations', { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Neizdevās ielādēt')
      setConversations(data.conversations || [])
    } catch (e) {
      toastError('Ziņas', e instanceof Error ? e.message : 'Kļūda')
    } finally {
      setLoadingList(false)
    }
  }, [toastError])

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  const openConversation = useCallback(
    async (conversationId: string) => {
      setActiveId(conversationId)
      setMobileList(false)
      setLoadingMessages(true)
      setMessages([])
      setPendingAttachment(null)
      try {
        const res = await fetch(`/api/dms/conversations/${conversationId}/messages?limit=80`, {
          credentials: 'include',
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Neizdevās ielādēt ziņas')
        setMessages(data.messages || [])
        await fetch(`/api/dms/conversations/${conversationId}/read`, {
          method: 'POST',
          credentials: 'include',
        }).catch(() => {})
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, unread: false } : c))
        )
      } catch (e) {
        toastError('Ziņas', e instanceof Error ? e.message : 'Kļūda')
      } finally {
        setLoadingMessages(false)
      }
    },
    [toastError]
  )

  useEffect(() => {
    if (!initialOtherUserId || !user?.id || initialOtherUserId === user.id) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/dms/conversations', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otherUserId: initialOtherUserId }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Neizdevās atvērt sarunu')
        const id = data.conversation?.id as string
        if (cancelled || !id) return
        await loadConversations()
        if (cancelled) return
        await openConversation(id)
      } catch (e) {
        if (!cancelled) toastError('Ziņas', e instanceof Error ? e.message : 'Kļūda')
      } finally {
        if (!cancelled) onConsumedInitialOther?.()
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once per initialOtherUserId
  }, [initialOtherUserId, user?.id])

  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'dm_message') return
    const m = lastMessage.data as MsgRow
    if (!m?.id || !m.conversationId) return
    setMessages((prev) => {
      if (prev.some((x) => x.id === m.id)) return prev
      if (activeId !== m.conversationId) return prev
      return [...prev, m]
    })
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === m.conversationId)
      if (idx < 0) {
        void loadConversations()
        return prev
      }
      const c = prev[idx]
      const preview =
        m.attachmentUrl && m.messageType === 'image'
          ? (m.content?.trim() || '📷 Attēls')
          : m.attachmentUrl
            ? '📎 Fails'
            : m.content
      const nextLast: LastMsg = {
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        createdAt: m.createdAt,
        preview,
        messageType: m.messageType,
        attachmentUrl: m.attachmentUrl,
      }
      const bumpUnread = m.senderId !== user?.id && m.conversationId !== activeId
      const merged = {
        ...c,
        updatedAt: m.createdAt,
        lastMessage: nextLast,
        unread: bumpUnread ? true : c.unread,
      }
      return [merged, ...prev.filter((x) => x.id !== m.conversationId)]
    })
  }, [lastMessage, activeId, user?.id, loadConversations])

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeId])

  const sendViaRest = async (
    conversationId: string,
    content: string,
    messageType: string = 'text',
    attachmentUrl: string = ''
  ) => {
    const res = await fetch(`/api/dms/conversations/${conversationId}/messages`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, messageType, attachmentUrl }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Neizdevās nosūtīt')
    const msg = data.message as MsgRow
    if (msg?.id) {
      setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]))
    }
  }

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    const att = pendingAttachment
    if ((!text && !att) || !activeId || sending) return
    const messageType = att ? att.messageType : 'text'
    const attachmentUrl = att?.url || ''
    setSending(true)
    setDraft('')
    setPendingAttachment(null)
    try {
      if (isConnected && sendDmMessage(activeId, text, messageType, attachmentUrl)) {
        /* socket */
      } else {
        await sendViaRest(activeId, text, messageType, attachmentUrl)
      }
    } catch (err) {
      toastError('Ziņas', err instanceof Error ? err.message : 'Kļūda')
      setDraft(text)
      if (attachmentUrl) setPendingAttachment(att)
    } finally {
      setSending(false)
    }
  }

  const handlePickImage = () => fileInputRef.current?.click()

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user || !activeId) return
    if (!file.type.startsWith('image/')) {
      toastError('Attēls', 'Izvēlies attēla failu.')
      return
    }
    if (file.size > 12 * 1024 * 1024) {
      toastError('Attēls', 'Fails ir par lielu (max 12 MB).')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Augšupielāde neizdevās')
      const url = normalizeUploadUrl(data.url || '')
      if (!url) throw new Error('Nav URL')
      setPendingAttachment({ url, messageType: 'image' })
    } catch (err) {
      toastError('Augšupielāde', err instanceof Error ? err.message : 'Kļūda')
    } finally {
      setUploading(false)
    }
  }

  const handleBlockOther = async () => {
    if (!activeConv) return
    if (!window.confirm(`Bloķēt @${activeConv.otherUser.username}? Viņš vairs nevarēs rakstīt tev privāti.`)) return
    try {
      const res = await fetch('/api/dms/blocks', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId: activeConv.otherUser.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Neizdevās')
      success('Bloķēts', 'Lietotājs bloķēts.')
      setActiveId(null)
      setMessages([])
      setPendingAttachment(null)
      setMobileList(true)
      await loadConversations()
    } catch (e) {
      toastError('Bloķēšana', e instanceof Error ? e.message : 'Kļūda')
    }
  }

  const submitReport = async () => {
    if (!reportFor) return
    try {
      const res = await fetch(`/api/dms/messages/${reportFor}/report`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reportReason }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Neizdevās')
      success('Ziņojums', 'Administrators tiks informēts.')
      setReportFor(null)
      setReportReason('')
    } catch (e) {
      toastError('Ziņot', e instanceof Error ? e.message : 'Kļūda')
    }
  }

  const avatarUrl = (u: { avatar?: string; displayName?: string; username?: string }) =>
    u.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || u.username || 'U')}&background=3b82f6&color=fff`

  const canSend = !!(draft.trim() || pendingAttachment) && !sending && !uploading && activeId

  const listPanel = (
    <div
      className="flex flex-col border-y border-border-ui bg-surface-2 lg:w-72 flex-shrink-0 lg:rounded-2xl lg:border lg:shadow-dg-sm max-lg:border-x-0"
    >
      <div className="p-3 sm:p-3 border-b border-border-ui font-semibold text-ink text-base tracking-tight">
        Sarunas
      </div>
      {loadingList ? (
        <p className="p-4 text-sm text-ink-muted">Ielādē…</p>
      ) : conversations.length === 0 ? (
        <p className="p-4 text-sm text-ink-muted leading-relaxed">
          Nav sarunu. Atver kāda lietotāja profilu un spied „Ziņa”.
        </p>
      ) : (
        <ul>
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => void openConversation(c.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 min-h-[3.25rem] text-left active:bg-surface transition-colors ${
                  activeId === c.id ? 'bg-accent/10' : 'hover:bg-surface/80'
                }`}
              >
                <img
                  src={avatarUrl(c.otherUser)}
                  alt=""
                  className="w-11 h-11 rounded-xl object-cover flex-shrink-0 ring-1 ring-border-ui/60"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink truncate text-[15px]">{c.otherUser.displayName}</span>
                    {c.unread && <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" aria-hidden />}
                  </div>
                  <p className="text-[13px] text-ink-muted truncate mt-0.5">{listPreview(c)}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  const threadPanel = (
    <div
      className="flex-1 flex flex-col border-y border-border-ui bg-surface min-w-0 min-h-0 lg:rounded-2xl lg:border lg:shadow-dg-sm max-lg:border-x-0"
    >
      {!activeConv ? (
        <div className="flex items-center justify-center p-8 text-ink-muted text-sm min-h-[12rem]">
          Izvēlies sarunu
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2.5 border-b border-border-ui bg-surface-2/90 backdrop-blur-sm shrink-0">
            <button
              type="button"
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-surface text-ink-muted shrink-0"
              aria-label="Atpakaļ uz sarakstu"
              onClick={() => setMobileList(true)}
            >
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
            <img
              src={avatarUrl(activeConv.otherUser)}
              alt=""
              className="w-10 h-10 rounded-xl object-cover ring-1 ring-border-ui/60 shrink-0"
            />
            <div className="min-w-0 flex-1 py-0.5">
              <p className="font-semibold text-ink truncate text-[15px] leading-tight">
                {activeConv.otherUser.displayName}
              </p>
              <p className="text-xs text-ink-muted truncate">@{activeConv.otherUser.username}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleBlockOther()}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-ink-muted hover:text-amber-600 hover:bg-surface shrink-0"
              title="Bloķēt"
            >
              <NoSymbolIcon className="w-5 h-5" />
            </button>
          </div>
          <div
            className="overflow-y-auto overscroll-y-contain touch-pan-y p-3 sm:p-4 space-y-3 pb-2 max-h-[min(62dvh,calc(100dvh-13rem))] sm:max-h-[min(66dvh,calc(100dvh-11.5rem))] lg:max-h-[min(72vh,calc(100dvh-10rem))]"
            aria-label="Čata ziņas"
          >
            {loadingMessages ? (
              <p className="text-sm text-ink-muted">Ielādē…</p>
            ) : (
              messages.map((m) => {
                const mine = m.senderId === user?.id
                const isImg = m.messageType === 'image' && m.attachmentUrl
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[min(92%,20rem)] rounded-2xl overflow-hidden text-sm shadow-sm ${
                        mine ? 'bg-accent text-accent-fg' : 'bg-surface-2 border border-border-ui text-ink'
                      }`}
                    >
                      {!mine && (
                        <p className="text-[10px] text-ink-muted px-3 pt-2 pb-0.5">
                          {m.displayName || m.username}
                        </p>
                      )}
                      {isImg && (
                        <a
                          href={m.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`block ${mine ? 'bg-accent-fg/10' : 'bg-black/5'}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={m.attachmentUrl}
                            alt=""
                            className="w-full max-h-64 object-cover"
                            loading="lazy"
                          />
                        </a>
                      )}
                      {m.content?.trim() ? (
                        <p
                          className={`whitespace-pre-wrap break-words px-3 py-2 ${isImg ? 'pt-1.5' : mine ? '' : ''}`}
                        >
                          {m.content}
                        </p>
                      ) : null}
                      <div className={`flex items-center justify-end gap-1 px-2 pb-1.5 ${mine ? '' : ''}`}>
                        {!mine && (
                          <button
                            type="button"
                            className="min-h-8 min-w-8 flex items-center justify-center rounded-lg text-ink-muted hover:text-amber-600"
                            title="Ziņot"
                            onClick={() => setReportFor(m.id)}
                          >
                            <FlagIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={listEndRef} />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(ev) => void handleImageSelected(ev)}
          />
          <form
            onSubmit={handleSend}
            className="shrink-0 border-t border-border-ui bg-surface-2/95 backdrop-blur-md px-2 sm:px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-2"
          >
            {pendingAttachment && (
              <div className="flex items-center gap-2 rounded-xl border border-border-ui bg-surface p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingAttachment.url}
                  alt=""
                  className="h-14 w-14 rounded-lg object-cover shrink-0"
                />
                <span className="text-xs text-ink-muted flex-1">Gatavs nosūtīšanai. Pievieno parakstu virsū vai sūti tā.</span>
                <button
                  type="button"
                  className="min-h-9 min-w-9 flex items-center justify-center rounded-lg text-ink-muted hover:bg-surface-2"
                  onClick={() => setPendingAttachment(null)}
                  aria-label="Noņemt attēlu"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handlePickImage}
                disabled={uploading || !activeConv}
                className="min-h-11 min-w-11 shrink-0 flex items-center justify-center rounded-xl border border-border-ui bg-surface text-ink-muted hover:text-accent hover:border-accent/40 disabled:opacity-40"
                aria-label="Pievienot attēlu"
              >
                {uploading ? (
                  <span className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                ) : (
                  <PhotoIcon className="w-6 h-6" />
                )}
              </button>
              <input
                className="flex-1 min-h-11 rounded-xl border border-border-ui bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-muted/70"
                placeholder="Raksti ziņu…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={5000}
              />
              <button
                type="submit"
                disabled={!canSend}
                className="min-h-11 min-w-11 shrink-0 flex items-center justify-center rounded-xl bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-40 shadow-sm"
                aria-label="Sūtīt"
              >
                <PaperAirplaneIcon className="w-5 h-5 -ml-0.5" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )

  return (
    <div className="w-full max-w-4xl mx-auto -mx-1 sm:mx-0">
      <h1 className="text-xl sm:text-2xl font-bold text-ink mb-3 sm:mb-4 px-3 sm:px-0 tracking-tight">
        Privātās ziņas
      </h1>

      <div className="flex flex-col lg:flex-row gap-0 lg:gap-4 lg:items-stretch">
        <div
          className={`w-full shrink-0 lg:w-72 ${
            activeId && !mobileList ? 'hidden lg:block' : 'block'
          }`}
        >
          {listPanel}
        </div>
        <div
          className={`flex-1 min-w-0 min-h-0 ${
            !activeId ? 'hidden lg:block' : mobileList ? 'hidden lg:block' : 'block'
          }`}
        >
          {threadPanel}
        </div>
      </div>

      {reportFor && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
          <div className="bg-surface rounded-t-2xl sm:rounded-2xl border border-border-ui p-4 max-w-md w-full shadow-xl sm:mb-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <h3 className="font-semibold text-ink mb-2">Ziņot par ziņu</h3>
            <textarea
              className="w-full rounded-xl border border-border-ui bg-surface-2 p-3 text-sm text-ink mb-3 min-h-[88px]"
              placeholder="Iemesls (neobligāti)"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="min-h-10 px-4 text-sm text-ink-muted" onClick={() => setReportFor(null)}>
                Atcelt
              </button>
              <button
                type="button"
                className="min-h-10 px-4 rounded-xl bg-amber-600 text-white text-sm font-medium"
                onClick={() => void submitReport()}
              >
                Nosūtīt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

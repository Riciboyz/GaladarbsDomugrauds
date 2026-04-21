'use client'

import { PencilSquareIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

interface MobileTopBarProps {
  onOpenDrawer: () => void
  onCompose: () => void
  title?: string
}

export default function MobileTopBar({ onOpenDrawer, onCompose, title }: MobileTopBarProps) {
  return (
    <header
      className="lg:hidden fixed top-0 inset-x-0 z-30 bg-surface-2/85 backdrop-blur-xl border-b border-border-ui/70"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex items-center justify-between h-14 px-3">
        <button
          onClick={onOpenDrawer}
          aria-label="Atvērt izvēlni"
          className="group inline-flex items-center justify-center w-10 h-10 -ml-1 rounded-xl text-ink-muted hover:bg-surface active:bg-border-ui transition-colors"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h16" />
          </svg>
        </button>

        <div className="flex-1 flex items-center justify-center gap-2 min-w-0 px-2">
          {title ? (
            <h1 className="text-[15px] font-semibold text-ink truncate tracking-tight">
              {title}
            </h1>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shadow-sm">
                <ChatBubbleLeftRightIcon className="w-4 h-4 text-accent-fg" />
              </div>
              <span className="text-[15px] font-bold text-ink tracking-tight truncate">
                DomuGrauds
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onCompose}
          aria-label="Jauns ieraksts"
          className="inline-flex items-center justify-center w-10 h-10 -mr-1 rounded-xl text-ink-muted hover:bg-surface active:bg-border-ui transition-colors"
        >
          <PencilSquareIcon className="w-[22px] h-[22px]" />
        </button>
      </div>
    </header>
  )
}

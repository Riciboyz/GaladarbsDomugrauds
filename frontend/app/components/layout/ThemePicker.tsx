'use client'

import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { useTheme } from '../contexts/ThemeContext'
import {
  PALETTES,
  PALETTE_ORDER,
  PaletteId,
  ThemeMode,
} from '../styles/themes'

const MODES: { id: ThemeMode; label: string; Icon: typeof SunIcon }[] = [
  { id: 'light', label: 'Gaisa', Icon: SunIcon },
  { id: 'dark', label: 'Tumsa', Icon: MoonIcon },
]

function Swatch({
  palette,
  active,
  onSelect,
}: {
  palette: PaletteId
  active: boolean
  onSelect: (id: PaletteId) => void
}) {
  const def = PALETTES[palette]
  const accent = `rgb(${def.light.accent})`
  const surface = `rgb(${def.light['surface-2']})`
  const surfaceDark = `rgb(${def.dark['surface-2']})`

  return (
    <button
      type="button"
      onClick={() => onSelect(palette)}
      title={`${def.label} — ${def.description}`}
      aria-label={`Pielietot tematu ${def.label}`}
      aria-pressed={active}
      className={`group relative h-10 w-full rounded-lg overflow-hidden border transition-all ${
        active
          ? 'border-accent ring-2 ring-accent ring-offset-2 ring-offset-surface-2'
          : 'border-border-ui hover:border-ink-muted/60'
      }`}
      style={{
        background: `linear-gradient(135deg, ${surface} 0%, ${surface} 45%, ${accent} 45%, ${accent} 75%, ${surfaceDark} 75%, ${surfaceDark} 100%)`,
      }}
    >
      <span
        className="absolute inset-x-0 bottom-0 px-1.5 py-0.5 text-[10px] font-medium text-center text-white bg-black/0 opacity-0 group-hover:opacity-100 group-hover:bg-black/55 transition-all"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
      >
        {def.label}
      </span>
    </button>
  )
}

export default function ThemePicker() {
  const { mode, palette, setMode, setPalette } = useTheme()

  return (
    <div className="rounded-xl border border-border-ui bg-surface-2/60 p-3 space-y-3">
      <div>
        <p className="text-[11px] uppercase tracking-wide font-semibold text-ink-muted mb-2">
          Rezims
        </p>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface p-1">
          {MODES.map(({ id, label, Icon }) => {
            const active = mode === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                aria-pressed={active}
                title={label}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                  active
                    ? 'bg-accent text-accent-fg shadow-sm'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-2'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="inline lg:hidden xl:inline">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-ink-muted">
            Tema
          </p>
          <p className="text-[11px] text-ink-muted truncate ml-2">
            {PALETTES[palette].label}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {PALETTE_ORDER.map((id) => (
            <Swatch
              key={id}
              palette={id}
              active={palette === id}
              onSelect={setPalette}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

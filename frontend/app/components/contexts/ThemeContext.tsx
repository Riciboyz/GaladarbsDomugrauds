'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react'
import {
  applyPalette,
  DEFAULT_MODE,
  DEFAULT_PALETTE,
  PALETTES,
  PaletteId,
  ResolvedMode,
  ThemeMode,
} from '../styles/themes'

const MODE_KEY = 'dg-theme-mode'
const PALETTE_KEY = 'dg-theme-palette'

interface ThemeContextValue {
  mode: ThemeMode
  palette: PaletteId
  resolvedMode: ResolvedMode
  setMode: (mode: ThemeMode) => void
  setPalette: (palette: PaletteId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readSystemMode(): ResolvedMode {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStoredPalette(): PaletteId {
  if (typeof window === 'undefined') return DEFAULT_PALETTE
  const raw = window.localStorage.getItem(PALETTE_KEY)
  if (raw && raw in PALETTES) return raw as PaletteId
  return DEFAULT_PALETTE
}

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return DEFAULT_MODE
  const raw = window.localStorage.getItem(MODE_KEY)
  if (raw === 'light' || raw === 'dark') return raw
  // Migrē veco 'system' vērtību uz reālo sistēmas izvēli un saglabā.
  if (raw === 'system') {
    const resolved = readSystemMode()
    window.localStorage.setItem(MODE_KEY, resolved)
    return resolved
  }
  return DEFAULT_MODE
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE)
  const [palette, setPaletteState] = useState<PaletteId>(DEFAULT_PALETTE)
  const [hydrated, setHydrated] = useState(false)

  // Read persisted preferences once on mount.
  useEffect(() => {
    setModeState(readStoredMode())
    setPaletteState(readStoredPalette())
    setHydrated(true)
  }, [])

  const resolvedMode: ResolvedMode = mode

  // Apply theme to <html> whenever palette/mode resolves.
  useEffect(() => {
    if (!hydrated || typeof document === 'undefined') return
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedMode)
    applyPalette(root, palette, resolvedMode)
  }, [palette, resolvedMode, hydrated])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    if (typeof window !== 'undefined') window.localStorage.setItem(MODE_KEY, next)
  }, [])

  const setPalette = useCallback((next: PaletteId) => {
    setPaletteState(next)
    if (typeof window !== 'undefined') window.localStorage.setItem(PALETTE_KEY, next)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, palette, resolvedMode, setMode, setPalette }),
    [mode, palette, resolvedMode, setMode, setPalette],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    return {
      mode: DEFAULT_MODE,
      palette: DEFAULT_PALETTE,
      resolvedMode: 'light',
      setMode: () => undefined,
      setPalette: () => undefined,
    }
  }
  return ctx
}

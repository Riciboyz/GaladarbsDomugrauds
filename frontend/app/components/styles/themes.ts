/**
 * Profesionalas krasu paletes DomuGrauds dizaina sistemai.
 *
 * Vertibas glabajas ka "R G B" tripleti (bez "rgb()") lai Tailwind 3
 * varetu tos lietot ar `rgb(var(--token) / <alpha-value>)` sintaksi.
 *
 * Katra paleti veido septini semantiski tokeni:
 *   - surface       : pamata fons (lapas)
 *   - surface-2     : pacelta virsma (kartes, panelis, sidebar)
 *   - ink           : pamata teksts
 *   - ink-muted     : sekundars teksts
 *   - border        : neitralas apmales
 *   - accent        : galvena akcenta krasa (pogas, aktivais state)
 *   - accent-hover  : akcenta hover variants
 *   - accent-fg     : teksts uz akcenta fona
 */

export type PaletteId =
  | 'forest'
  | 'slate'
  | 'indigo'
  | 'crimson'
  | 'ochre'
  | 'graphite'
  | 'teal'

export type ThemeMode = 'light' | 'dark'
export type ResolvedMode = 'light' | 'dark'

export interface PaletteTokens {
  surface: string
  'surface-2': string
  ink: string
  'ink-muted': string
  border: string
  accent: string
  'accent-hover': string
  'accent-fg': string
}

export interface PaletteDefinition {
  id: PaletteId
  label: string
  description: string
  light: PaletteTokens
  dark: PaletteTokens
}

export const PALETTES: Record<PaletteId, PaletteDefinition> = {
  forest: {
    id: 'forest',
    label: 'Forest',
    description: 'Klasiskais DomuGrauds zalais',
    light: {
      surface: '247 249 247',
      'surface-2': '255 255 255',
      ink: '26 46 26',
      'ink-muted': '82 102 82',
      border: '218 226 218',
      accent: '45 90 45',
      'accent-hover': '34 70 34',
      'accent-fg': '255 255 255',
    },
    dark: {
      surface: '15 23 18',
      'surface-2': '23 34 26',
      ink: '232 240 232',
      'ink-muted': '160 178 160',
      border: '40 56 42',
      accent: '120 180 120',
      'accent-hover': '142 196 142',
      'accent-fg': '12 24 14',
    },
  },
  slate: {
    id: 'slate',
    label: 'Midnight Slate',
    description: 'Korporativs zilsi-pelekais',
    light: {
      surface: '246 248 250',
      'surface-2': '255 255 255',
      ink: '15 23 42',
      'ink-muted': '71 85 105',
      border: '215 222 232',
      accent: '30 58 138',
      'accent-hover': '23 45 110',
      'accent-fg': '255 255 255',
    },
    dark: {
      surface: '11 16 28',
      'surface-2': '19 26 42',
      ink: '226 232 244',
      'ink-muted': '148 163 184',
      border: '37 47 68',
      accent: '96 130 224',
      'accent-hover': '120 152 235',
      'accent-fg': '8 12 22',
    },
  },
  indigo: {
    id: 'indigo',
    label: 'Royal Indigo',
    description: 'Premium violetas pieskanas',
    light: {
      surface: '248 247 252',
      'surface-2': '255 255 255',
      ink: '30 27 75',
      'ink-muted': '88 84 134',
      border: '224 220 240',
      accent: '67 56 202',
      'accent-hover': '53 44 165',
      'accent-fg': '255 255 255',
    },
    dark: {
      surface: '14 12 28',
      'surface-2': '24 21 46',
      ink: '232 230 248',
      'ink-muted': '160 156 190',
      border: '46 41 78',
      accent: '139 124 255',
      'accent-hover': '160 148 255',
      'accent-fg': '12 10 24',
    },
  },
  crimson: {
    id: 'crimson',
    label: 'Crimson Noir',
    description: 'Dzilas sarkanas un melnas',
    light: {
      surface: '250 247 247',
      'surface-2': '255 255 255',
      ink: '28 25 23',
      'ink-muted': '99 76 76',
      border: '232 220 220',
      accent: '159 18 57',
      'accent-hover': '132 14 47',
      'accent-fg': '255 255 255',
    },
    dark: {
      surface: '18 12 14',
      'surface-2': '28 20 22',
      ink: '244 232 232',
      'ink-muted': '180 156 156',
      border: '54 38 42',
      accent: '226 88 116',
      'accent-hover': '236 110 134',
      'accent-fg': '20 10 12',
    },
  },
  ochre: {
    id: 'ochre',
    label: 'Ochre Gold',
    description: 'Silti zelta toni',
    light: {
      surface: '251 249 243',
      'surface-2': '255 254 248',
      ink: '41 37 36',
      'ink-muted': '120 100 64',
      border: '236 226 200',
      accent: '180 83 9',
      'accent-hover': '150 68 7',
      'accent-fg': '255 255 255',
    },
    dark: {
      surface: '24 20 14',
      'surface-2': '36 30 22',
      ink: '244 236 220',
      'ink-muted': '184 162 124',
      border: '60 50 32',
      accent: '234 158 70',
      'accent-hover': '244 174 94',
      'accent-fg': '24 16 8',
    },
  },
  graphite: {
    id: 'graphite',
    label: 'Graphite',
    description: 'Monohromais melni-pelekais',
    light: {
      surface: '250 250 250',
      'surface-2': '255 255 255',
      ink: '10 10 10',
      'ink-muted': '82 82 91',
      border: '224 224 228',
      accent: '24 24 27',
      'accent-hover': '8 8 10',
      'accent-fg': '250 250 250',
    },
    dark: {
      surface: '10 10 10',
      'surface-2': '24 24 27',
      ink: '244 244 245',
      'ink-muted': '161 161 170',
      border: '46 46 50',
      accent: '244 244 245',
      'accent-hover': '255 255 255',
      'accent-fg': '10 10 10',
    },
  },
  teal: {
    id: 'teal',
    label: 'Teal Deep',
    description: 'Mierigi zali-zili toni',
    light: {
      surface: '245 250 249',
      'surface-2': '255 255 255',
      ink: '19 78 74',
      'ink-muted': '60 110 106',
      border: '210 228 224',
      accent: '15 118 110',
      'accent-hover': '12 96 90',
      'accent-fg': '255 255 255',
    },
    dark: {
      surface: '10 22 22',
      'surface-2': '18 32 32',
      ink: '224 244 240',
      'ink-muted': '148 184 180',
      border: '34 56 54',
      accent: '52 196 178',
      'accent-hover': '76 214 198',
      'accent-fg': '8 18 18',
    },
  },
}

export const PALETTE_ORDER: PaletteId[] = [
  'forest',
  'slate',
  'indigo',
  'crimson',
  'ochre',
  'graphite',
  'teal',
]

export const DEFAULT_PALETTE: PaletteId = 'forest'
export const DEFAULT_MODE: ThemeMode = 'light'

const TOKEN_KEYS: (keyof PaletteTokens)[] = [
  'surface',
  'surface-2',
  'ink',
  'ink-muted',
  'border',
  'accent',
  'accent-hover',
  'accent-fg',
]

/**
 * Pielieto paletes CSS mainigos uz dotajiem HTMLElement (parasti `<html>`).
 */
export function applyPalette(
  el: HTMLElement,
  palette: PaletteId,
  resolvedMode: ResolvedMode,
): void {
  const tokens = PALETTES[palette][resolvedMode]
  for (const key of TOKEN_KEYS) {
    el.style.setProperty(`--${key}`, tokens[key])
  }
  el.dataset.theme = palette
  el.dataset.themeMode = resolvedMode
}

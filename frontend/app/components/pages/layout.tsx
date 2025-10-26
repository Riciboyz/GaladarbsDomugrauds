import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import '../styles/globals.css'
import '../styles/night.scss' // Night theme
import '../styles/rainy.scss' // Rainy theme
import '../styles/snowy.scss' // Snowy theme
import '../styles/sunny.scss' // Sunny theme
import '../styles/cloudy.scss' // Cloudy theme
import { Providers } from '../lib/providers'
import ErrorBoundary from '../legacy/ErrorBoundary'
import GlobalWeatherTheme from '../legacy/GlobalWeatherTheme'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', weight: ['500','600','700','800'] })

export const metadata: Metadata = {
  title: 'DomuGrauds - Beet',
  description: 'Sociālā platforma ar domām, tēmu dienām un grupu ziņojumiem',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className={`dg-bg dg-ink`}>
        <ErrorBoundary>
          <Providers>
            <GlobalWeatherTheme>
              {children}
            </GlobalWeatherTheme>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import './night.scss' // Night theme
import './rainy.scss' // Rainy theme
import './snowy.scss' // Snowy theme
import './sunny.scss' // Sunny theme
import './cloudy.scss' // Cloudy theme
import { Providers } from './providers-new'
import ErrorBoundary from './components/ErrorBoundary'
import GlobalWeatherTheme from './components/GlobalWeatherTheme'

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

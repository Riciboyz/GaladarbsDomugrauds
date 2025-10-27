import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './components/styles/globals.css'
import './components/styles/night.scss' // Night theme
import './components/styles/rainy.scss' // Rainy theme
import './components/styles/snowy.scss' // Snowy theme
import './components/styles/sunny.scss' // Sunny theme
import './components/styles/cloudy.scss' // Cloudy theme
import { Providers } from './components/lib/providers'
import ErrorBoundary from './components/feedback/ErrorBoundary'
import GlobalWeatherTheme from './components/features/weather/GlobalWeatherTheme'

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


import React, { PropsWithChildren } from 'react'

import { cn } from '@/lib/utils'
import { ThemeProvider } from '@/lib/providers/ThemeProvider'

import '@/app/globals.scss'
import IconProvider from '@/lib/providers/IconProvider'
import ProgressProvider from '@/lib/providers/ProgressProvider'
import QueryProvider from '@/lib/providers/QueryProvider'
import TerminalGridBackground from '@/widgets/background/TerminalGridBackground'
import BootGate from '@/components/misc/BootGate'
import Logo from '@/components/misc/Logo'

export const metadata = {
  metadataBase: new URL('https://adaption.top'),
  title: {
    default: 'adaption',
    template: '%s · adaption',
  },
  description:
    'Школьный дневник НИШ: оценки, журнал, табель, расписание и калькулятор СОР/СОЧ.',
  icons: [
    { rel: 'icon', url: '/logo.svg', type: 'image/svg+xml' },
    { rel: 'icon', url: '/logo.svg' },
    { rel: 'apple-touch-icon', url: '/logo.svg' },
  ],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'adaption',
    title: 'adaption',
    description:
      'Школьный дневник НИШ: оценки, журнал, табель, расписание и калькулятор СОР/СОЧ.',
    url: 'https://adaption.top',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'adaption — школьный дневник НИШ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'adaption',
    description:
      'Школьный дневник НИШ: оценки, журнал, табель, расписание и калькулятор СОР/СОЧ.',
    images: ['/og.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'adaption',
  url: 'https://adaption.top',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  inLanguage: 'ru-RU',
  description:
    'Школьный дневник НИШ: оценки, журнал, табель, расписание и калькулятор СОР/СОЧ.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'KZT' },
}

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />

        <div id="boot-splash" aria-hidden>
          <Logo width={72} height={72} className="my-0" />
        </div>

        <TerminalGridBackground />
        <BootGate />

        <div
          vaul-drawer-wrapper=""
          className={cn(
            'relative z-10 flex min-h-screen flex-col font-sans antialiased print:hidden',
          )}
        >
          <ProgressProvider>
            <QueryProvider>
              <ThemeProvider>
                <IconProvider>{children}</IconProvider>
              </ThemeProvider>
            </QueryProvider>
          </ProgressProvider>
        </div>
      </body>
    </html>
  )
}

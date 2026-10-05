import React, { FC, PropsWithChildren } from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { ThemeProvider } from '@/lib/providers/ThemeProvider'

import '@/app/globals.scss'
import IconProvider from '@/lib/providers/IconProvider'
import ProgressProvider from '@/lib/providers/ProgressProvider'
import QueryProvider from '@/lib/providers/QueryProvider'
import TerminalGridBackground from '@/widgets/background/TerminalGridBackground'
import BootGate from '@/components/misc/BootGate'
import Logo from '@/components/misc/Logo'
import AppAppearance from '@/lib/providers/AppAppearance'

export const metadata = {
  metadataBase: new URL('https://adaption.top'),
  title: {
    default: 'adaption',
    template: '%s · adaption',
  },
  description:
    'Школьный дневник НИШ: оценки, журнал, табель, расписание и калькулятор СОР/СОЧ.',
  icons: [
    { rel: 'icon', url: '/favicon.svg', type: 'image/svg+xml' },
    { rel: 'icon', url: '/favicon.ico' },
    { rel: 'apple-touch-icon', url: '/apple-touch-icon.png' },
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

const RootLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <html lang="ru" className="bg-background" suppressHydrationWarning>
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
          className={cn(
            'relative z-10 flex min-h-screen flex-col font-sans antialiased print:hidden',
          )}
        >
          <ProgressProvider>
            <QueryProvider>
              <ThemeProvider>
                <AppAppearance />
                <IconProvider>{children}</IconProvider>
              </ThemeProvider>
            </QueryProvider>
          </ProgressProvider>
        </div>

        <footer className="relative z-10 mx-auto flex w-[92.5%] flex-row items-center justify-center gap-2 pb-3 sm:max-w-[47rem] print:hidden">
          <Link
            href="/privacy"
            className="text-xs text-muted-foreground transition-opacity hover:opacity-70"
          >
            Конфиденциальность
          </Link>
          <span className="text-xs text-muted-foreground">·</span>
          <Link
            href="/terms"
            className="text-xs text-muted-foreground transition-opacity hover:opacity-70"
          >
            Условия использования
          </Link>
        </footer>
      </body>
    </html>
  )
}

export default RootLayout

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Настройки',
  description: 'Настройки — adaption, школьный дневник НИШ.',
  alternates: { canonical: '/settings' },
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}


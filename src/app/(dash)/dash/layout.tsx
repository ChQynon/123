import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Главная',
  description: 'Главная — adaption, школьный дневник НИШ.',
  alternates: { canonical: '/dash' },
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}


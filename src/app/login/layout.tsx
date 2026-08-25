import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Вход',
  description:
    'Вход в adaption по аккаунту СУШ — школьный дневник НИШ.',
  alternates: { canonical: '/login' },
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

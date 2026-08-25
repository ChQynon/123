import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Расписание',
  description: 'Расписание — adaption, школьный дневник НИШ.',
  alternates: { canonical: '/schedule' },
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}


import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Табель',
  description: 'Табель — adaption, школьный дневник НИШ.',
  alternates: { canonical: '/reports' },
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}


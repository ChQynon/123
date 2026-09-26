import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Условия использования',
  description:
    'Условия использования adaption — школьный дневник НИШ.',
  alternates: { canonical: '/terms' },
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Калькулятор',
  description: 'Калькулятор — adaption, школьный дневник НИШ.',
  alternates: { canonical: '/calculator' },
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}


import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Политика конфиденциальности',
  description:
    'Политика конфиденциальности adaption — мы не храним ваши данные на серверах.',
  alternates: { canonical: '/privacy' },
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
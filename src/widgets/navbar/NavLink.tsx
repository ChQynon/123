'use client'

import React, { FC } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type NavLinkProps = {
  icon: React.ReactNode
  text: string
  href: string
}

const NavLink: FC<NavLinkProps> = ({ icon, text, href }) => {
  const pathname = usePathname()
  const isActive = pathname.startsWith(href)

  return (
    <Link
      href={isActive ? '#' : href}
      aria-label={text}
      title={text}
      className={cn(
        'group relative mx-1 flex h-12 w-12 grow cursor-pointer items-center justify-center rounded-lg py-1.5 text-center transition-colors',
        isActive
          ? 'bg-content/15 text-content'
          : 'text-content/50 hover:bg-content/10 hover:text-content',
      )}
    >
      {icon}

      {/* Tooltip */}
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-content/15 bg-background px-2.5 py-1 font-mono text-xs text-content opacity-0 shadow-xl transition-opacity duration-150 ease-smooth-out group-hover:opacity-100">
        {text}
      </span>
    </Link>
  )
}

export default NavLink

'use client'

import React, { useEffect, useState } from 'react'

const FRAMES = [
  '⠋',
  '⠙',
  '⠹',
  '⠸',
  '⠼',
  '⠴',
  '⠦',
  '⠧',
  '⠇',
  '⠏',
] as const

export interface TerminalSpinnerProps {
  className?: string
}

const DEFAULT_CLASS =
  'inline-block w-3.5 select-none text-center text-[11px] leading-none'

export function TerminalSpinner({ className }: TerminalSpinnerProps) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = window.setInterval(
      () => setFrame((n) => (n + 1) % FRAMES.length),
      80,
    )
    return () => window.clearInterval(id)
  }, [])

  return (
    <span aria-hidden className={className ?? DEFAULT_CLASS}>
      {FRAMES[frame]}
    </span>
  )
}

export default TerminalSpinner

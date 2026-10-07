'use client'

import { useLayoutEffect } from 'react'

export default function BootGate() {
  useLayoutEffect(() => {
    window.clearTimeout(window.__ADAPTION_BOOT_TIMER__)
    const splash = document.getElementById('boot-splash')
    if (!splash) return
    splash.classList.add('boot-splash-out')
    const timer = window.setTimeout(() => splash.remove(), 140)
    return () => window.clearTimeout(timer)
  }, [])

  return null
}

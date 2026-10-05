'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'

/** The website owns the palette; native shells only colour their window chrome. */
export default function AppAppearance() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const root = document.documentElement
    let frame = 0
    let timer = 0
    const sync = () => {
      const backgroundColor = getComputedStyle(root).backgroundColor
      const dark = root.classList.contains('dark')
      let meta = document.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]',
      )
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = 'theme-color'
        document.head.appendChild(meta)
      }
      meta.content = backgroundColor
      const appearance = { dark, backgroundColor }
      window.ReactNativeWebView?.postMessage(
        JSON.stringify({ type: 'appearance', ...appearance }),
      )
      void window.electronAPI?.appearance?.set(appearance)
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      frame = requestAnimationFrame(sync)
      // Read the final colour after the site's theme transition too.
      timer = window.setTimeout(sync, 500)
    }
    const observer = new MutationObserver(schedule)
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    })
    window.addEventListener('adaption:native-ready', schedule)
    schedule()
    return () => {
      observer.disconnect()
      window.removeEventListener('adaption:native-ready', schedule)
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [resolvedTheme])

  return null
}

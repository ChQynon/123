'use client'

import React, {
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { isApp } from '@/lib/pin/platform'

type DeviceTheme = 'light' | 'dark'

function NativeThemeSync({
  onTheme,
  onDevice,
}: {
  onTheme: (theme: string | undefined) => void
  onDevice: (theme: DeviceTheme) => void
}) {
  const { theme, setTheme } = useTheme()
  const initialized = useRef(false)
  useEffect(() => {
    onTheme(theme)
  }, [theme, onTheme])
  useEffect(() => {
    const apply = (device: DeviceTheme | undefined, reset = false) => {
      if (!isApp()) return
      if (device === 'light' || device === 'dark') onDevice(device)
      if (!initialized.current || reset) {
        initialized.current = true
        setTheme('system')
      }
    }
    const ready = () => apply(window.__ADAPTION_SYSTEM_THEME__)
    const changed = (event: Event) => {
      const detail = (
        event as CustomEvent<{ theme: DeviceTheme; reset?: boolean }>
      ).detail
      apply(detail?.theme, detail?.reset)
    }
    ready()
    let active = true
    void window.electronAPI?.appearance?.getSystemTheme?.().then((device) => {
      if (active) apply(device)
    })
    const unsubscribe = window.electronAPI?.appearance?.onSystemTheme?.(
      (device, reset) => apply(device, reset),
    )
    window.addEventListener('adaption:native-ready', ready)
    window.addEventListener('adaption:system-theme', changed)
    return () => {
      active = false
      unsubscribe?.()
      window.removeEventListener('adaption:native-ready', ready)
      window.removeEventListener('adaption:system-theme', changed)
    }
  }, [onDevice, setTheme])
  return null
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [deviceTheme, setDeviceTheme] = useState<DeviceTheme>()
  const [selectedTheme, setSelectedTheme] = useState<string>()
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(window.electronAPI||/AdaptionApp/i.test(navigator.userAgent)){localStorage.setItem('theme','system')}}catch(e){}`,
        }}
      />
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        forcedTheme={selectedTheme === 'system' ? deviceTheme : undefined}
      >
        <NativeThemeSync onTheme={setSelectedTheme} onDevice={setDeviceTheme} />
        {children}
      </NextThemesProvider>
    </>
  )
}

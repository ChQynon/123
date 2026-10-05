'use client'

import React, { useEffect, useState } from 'react'
import usePinStore from '@/lib/hooks/store/usePinStore'
import { isApp } from '@/lib/pin/platform'
import PinSetup from '@/widgets/pin/PinSetup'
import PinLock from '@/widgets/pin/PinLock'

type PinGateProps = {
  children: React.ReactNode
}

/**
 * Обёртка для app-версии:
 * - Если ПИН не установлен → показывает PinSetup
 * - Если ПИН установлен и заблокирован → показывает PinLock
 * - Иначе → показывает контент
 * В веб-версии (isApp() === false) — просто рендерит children.
 */
const PinGate: React.FC<PinGateProps> = ({ children }) => {
  const { isPinSet, isUnlocked } = usePinStore()
  const [mounted, setMounted] = useState(false)

  // Нужен mounted чтобы избежать hydration mismatch
  useEffect(() => {
    setMounted(true)
    const lock = () => {
      if (isApp()) usePinStore.getState().lock()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') lock()
    }
    const onNativeReady = () => {
      // Android may run the bootstrap at load-end instead of before scripts.
      // Restore secure PIN data before rendering the authenticated screen.
      void usePinStore.persist.rehydrate()
    }
    window.addEventListener('adaption:lock', lock)
    window.addEventListener('adaption:native-ready', onNativeReady)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('adaption:lock', lock)
      window.removeEventListener('adaption:native-ready', onNativeReady)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // В веб-версии или до монтирования — просто контент
  if (!mounted) return <div className="min-h-screen" aria-busy="true" />

  if (!isApp()) {
    return <>{children}</>
  }

  // ПИН не установлен — показываем установку
  if (!isPinSet()) {
    return <PinSetup />
  }

  // ПИН установлен, но заблокирован — показываем блокировку
  if (!isUnlocked) {
    return <PinLock>{children}</PinLock>
  }

  return <>{children}</>
}

export default PinGate

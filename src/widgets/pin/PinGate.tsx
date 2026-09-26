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
  }, [])

  // В веб-версии или до монтирования — просто контент
  if (!mounted || !isApp()) {
    return <>{children}</>
  }

  // ПИН не установлен — показываем установку
  if (!isPinSet()) {
    return <PinSetup onComplete={() => {}} />
  }

  // ПИН установлен, но заблокирован — показываем блокировку
  if (!isUnlocked) {
    return <PinLock>{children}</PinLock>
  }

  return <>{children}</>
}

export default PinGate

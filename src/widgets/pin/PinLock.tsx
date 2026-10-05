'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import PinInput from '@/widgets/pin/PinInput'
import usePinStore from '@/lib/hooks/store/usePinStore'
import { verifyPin } from '@/lib/pin/crypto'
import { isMobile, isDesktop, supportsBiometric } from '@/lib/pin/platform'
import { logout } from '@/server/actions/logout'
import { useRouter } from 'next-nprogress-bar'
import { useQueryClient } from '@tanstack/react-query'
import { resetAppSecurity } from '@/lib/pin/reset'

type PinLockProps = {
  children: React.ReactNode
}

const PinLock: React.FC<PinLockProps> = ({ children }) => {
  const {
    pinHash,
    pinSalt,
    pinLength,
    isUnlocked,
    biometricEnabled,
    unlock,
  } = usePinStore()

  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const biometricPromptedRef = useRef(false)

  const router = useRouter()
  const queryClient = useQueryClient()

  const isPinSet = pinHash !== null && pinSalt !== null

  // Проверка ПИН-кода
  const handlePin = async (pin: string) => {
    if (!pinHash || !pinSalt) return

    setLoading(true)
    setError('')

    try {
      const valid = await verifyPin(pin, pinSalt, pinHash)

      if (valid) {
        unlock()
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)

        if (newAttempts >= 5) {
          // После 5 неудачных попыток — полный выход из аккаунта
          queryClient.removeQueries()
          await logout()
          await resetAppSecurity()
          router.replace('/login')
          return
        }

        setError(`Неверный ПИН-код. Осталось попыток: ${5 - newAttempts}`)
      }
    } catch {
      setError('Ошибка проверки ПИН-кода')
    } finally {
      setLoading(false)
    }
  }

  // Биометрическая аутентификация (Face ID / Touch ID / Windows Hello)
  const handleBiometric = useCallback(async () => {
    if (!supportsBiometric()) return

    try {
      // Electron: через IPC к нативному API
      if (isDesktop() && (window as any).electronAPI?.biometric) {
        const result = await (window as any).electronAPI.biometric.authenticate()
        if (result && result.success) {
          unlock()
          return
        }
      }

      // React Native: через expo-local-authentication в нативном WebView
      if (isMobile() && (window as any).ReactNativeWebView) {
        ;(window as any).ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'biometric_auth' }),
        )
        return
      }
    } catch {
      setError('Биометрия временно недоступна')
    }
  }, [unlock])

  // Автоматический вызов Face ID при открытии экрана блокировки
  useEffect(() => {
    if (biometricEnabled && supportsBiometric() && !isUnlocked && !biometricPromptedRef.current) {
      biometricPromptedRef.current = true
      // Небольшая задержка для плавного монтирования UI
      const timer = setTimeout(() => {
        handleBiometric()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [biometricEnabled, isUnlocked, handleBiometric])

  // Слушаем ответ от биометрии и события моста (React Native)
  useEffect(() => {
    if (!isMobile()) return

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        if (data.type === 'biometric_result') {
          if (data.success) {
            unlock()
          } else {
            setError('Аутентификация Face ID / биометрии не удалась')
          }
        }
      } catch {
        // ignore malformed messages
      }
    }

    window.addEventListener('message', handleMessage)
    document.addEventListener('message', handleMessage as any)
    return () => {
      window.removeEventListener('message', handleMessage)
      document.removeEventListener('message', handleMessage as any)
    }
  }, [unlock])

  // Если ПИН не установлен или уже разблокирован — показываем контент
  if (!isPinSet || isUnlocked) {
    return <>{children}</>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">
      <div className="page-enter w-full max-w-sm">
        <PinInput
          length={pinLength ?? 4}
          title="Введите ПИН-код"
          subtitle={
            biometricEnabled
              ? 'Используйте ПИН или Face ID / биометрию'
              : 'Для доступа к аккаунту'
          }
          onComplete={handlePin}
          onBiometric={handleBiometric}
          showBiometric={biometricEnabled && supportsBiometric()}
          error={error}
          loading={loading}
        />
      </div>
    </div>
  )
}

export default PinLock

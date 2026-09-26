'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import ResponsiveModal from '@/components/ui/responsive-modal'
import usePinStore, { type PinLength } from '@/lib/hooks/store/usePinStore'
import { hashPin, generateSalt, verifyPin } from '@/lib/pin/crypto'
import PinInput from '@/widgets/pin/PinInput'
import { Fingerprint, Trash, PencilSimple, PlusCircle, ShieldCheck } from '@phosphor-icons/react'
import { isApp, supportsBiometric, isDesktop, isMobile } from '@/lib/pin/platform'
import { cn } from '@/lib/utils'

const PinSettings: React.FC = () => {
  const {
    pinHash,
    pinSalt,
    pinLength,
    biometricEnabled,
    setPin,
    setBiometric,
    changePin,
    removePin,
  } = usePinStore()

  const [mounted, setMounted] = useState(false)
  const [modalOpen, setModalOpen] = useState<'setup' | 'change' | 'remove' | null>(null)
  const [step, setStep] = useState<'verify' | 'choose-length' | 'new' | 'confirm'>('verify')
  const [targetLength, setTargetLength] = useState<PinLength>(4)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [newPin, setNewPin] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync to native if available
  const syncToNative = async (hash: string | null, salt: string | null, len: PinLength | null, bio: boolean) => {
    try {
      if (typeof window === 'undefined') return

      if (isDesktop() && (window as any).electronAPI?.pin) {
        if (hash && salt && len) {
          await (window as any).electronAPI.pin.set({ pinHash: hash, pinSalt: salt, pinLength: len })
        } else {
          await (window as any).electronAPI.pin.remove()
        }
        await (window as any).electronAPI.pin.setBiometric(bio)
      }

      if (isMobile() && (window as any).ReactNativeWebView) {
        ;(window as any).ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'pin_sync',
            pinHash: hash,
            pinSalt: salt,
            pinLength: len,
            biometricEnabled: bio,
          }),
        )
      }
    } catch {
      // ignore bridge errors
    }
  }

  // Не показывать в веб-версии или до гидратации
  if (!mounted || !isApp()) return null

  const isPinSet = pinHash !== null

  // Проверка текущего ПИН перед изменением
  const handleVerifyCurrentPin = async (pin: string) => {
    if (!pinHash || !pinSalt) return

    setLoading(true)
    setError('')

    try {
      const valid = await verifyPin(pin, pinSalt, pinHash)
      if (valid) {
        setStep('choose-length')
      } else {
        setError('Неверный текущий ПИН-код')
      }
    } catch {
      setError('Ошибка проверки ПИН-кода')
    } finally {
      setLoading(false)
    }
  }

  // Новый ПИН
  const handleNewPin = (pin: string) => {
    setNewPin(pin)
    setStep('confirm')
  }

  // Подтверждение нового ПИН (для установки или смены)
  const handleConfirmNewPin = async (pin: string) => {
    if (pin !== newPin) {
      setError('ПИН-коды не совпадают. Повторите ввод.')
      setStep('new')
      setNewPin('')
      return
    }

    setLoading(true)
    setError('')

    try {
      const salt = generateSalt()
      const hash = await hashPin(pin, salt)

      if (modalOpen === 'setup') {
        setPin(hash, salt, targetLength)
      } else {
        changePin(hash, salt, targetLength)
      }

      await syncToNative(hash, salt, targetLength, biometricEnabled)

      setModalOpen(null)
      setStep('verify')
      setNewPin('')
    } catch {
      setError('Ошибка сохранения ПИН-кода')
    } finally {
      setLoading(false)
    }
  }

  // Удаление ПИН
  const handleRemove = async (pin: string) => {
    if (!pinHash || !pinSalt) return

    setLoading(true)
    setError('')

    try {
      const valid = await verifyPin(pin, pinSalt, pinHash)
      if (valid) {
        removePin()
        await syncToNative(null, null, null, false)
        setModalOpen(null)
      } else {
        setError('Неверный ПИН-код')
      }
    } catch {
      setError('Ошибка проверки')
    } finally {
      setLoading(false)
    }
  }

  // Переключение биометрии
  const handleToggleBiometric = async () => {
    const nextVal = !biometricEnabled

    if (nextVal) {
      // Проверяем доступность биометрии
      try {
        if (isDesktop() && (window as any).electronAPI?.biometric) {
          const res = await (window as any).electronAPI.biometric.authenticate()
          if (!res?.success) {
            return
          }
        }
      } catch {
        return
      }
    }

    setBiometric(nextVal)
    await syncToNative(pinHash, pinSalt, pinLength, nextVal)
  }

  return (
    <>
      {/* ПИН-код */}
      <div className="flex flex-row items-center justify-between py-1.5">
        <div>
          <p className="text-xl lg:text-2xl">ПИН-код</p>
          <p className="text-xs text-muted-foreground">
            {isPinSet
              ? `Защита активна (${pinLength ?? 4} цифры)`
              : 'Быстрый вход в приложение'}
          </p>
        </div>
        {isPinSet ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setTargetLength(pinLength ?? 4)
                setStep('verify')
                setError('')
                setNewPin('')
                setModalOpen('change')
              }}
            >
              <PencilSimple size={18} className="mr-1.5" />
              Изменить
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setError('')
                setModalOpen('remove')
              }}
            >
              <Trash size={18} className="mr-1.5" />
              Удалить
            </Button>
          </div>
        ) : (
          <Button
            variant="default"
            onClick={() => {
              setTargetLength(4)
              setStep('choose-length')
              setError('')
              setNewPin('')
              setModalOpen('setup')
            }}
          >
            <PlusCircle size={18} className="mr-1.5" />
            Установить
          </Button>
        )}
      </div>

      {/* Биометрия (Face ID / Touch ID / Windows Hello) */}
      {isPinSet && supportsBiometric() && (
        <div className="flex flex-row items-center justify-between py-1.5">
          <div>
            <p className="text-xl lg:text-2xl">Face ID / Биометрия</p>
            <p className="text-xs text-muted-foreground">
              Вход без ввода ПИН-кода
            </p>
          </div>
          <Button
            variant={biometricEnabled ? 'default' : 'outline'}
            onClick={handleToggleBiometric}
          >
            <Fingerprint size={18} className="mr-1.5" />
            {biometricEnabled ? 'Включено' : 'Выключено'}
          </Button>
        </div>
      )}

      {/* Модалка изменения/установки ПИН */}
      <ResponsiveModal
        trigger={<span />}
        open={modalOpen === 'change' || modalOpen === 'setup'}
        onOpenChange={(open) => {
          if (!open) {
            setModalOpen(null)
            setStep('verify')
            setError('')
            setNewPin('')
          }
        }}
        title={
          <span className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
            {modalOpen === 'setup' ? 'Установить ПИН-код' : 'Изменить ПИН-код'}
          </span>
        }
      >
        <div className="py-2">
          {step === 'verify' && modalOpen === 'change' && (
            <PinInput
              length={pinLength ?? 4}
              title="Текущий ПИН-код"
              subtitle="Введите ваш действующий ПИН"
              onComplete={handleVerifyCurrentPin}
              error={error}
              loading={loading}
            />
          )}

          {step === 'choose-length' && (
            <div className="flex flex-col items-center text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                Выберите желаемую длину ПИН-кода
              </p>
              <div className="flex w-full flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTargetLength(4)
                    setStep('new')
                  }}
                  className={cn(
                    'flex items-center justify-between rounded-xl border border-content/15 p-4 transition-all hover:bg-content/5',
                    targetLength === 4 && 'border-primary bg-primary/5',
                  )}
                >
                  <div className="text-left">
                    <p className="font-medium">4 цифры</p>
                    <p className="text-xs text-muted-foreground">Быстрый ввод</p>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-2.5 w-2.5 rounded-full bg-content/30" />
                    ))}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTargetLength(6)
                    setStep('new')
                  }}
                  className={cn(
                    'flex items-center justify-between rounded-xl border border-content/15 p-4 transition-all hover:bg-content/5',
                    targetLength === 6 && 'border-primary bg-primary/5',
                  )}
                >
                  <div className="text-left">
                    <p className="font-medium">6 цифр</p>
                    <p className="text-xs text-muted-foreground">Максимальная защита</p>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-2.5 w-2.5 rounded-full bg-content/30" />
                    ))}
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 'new' && (
            <PinInput
              length={targetLength}
              title="Новый ПИН-код"
              subtitle={`Введите ${targetLength} цифр`}
              onComplete={handleNewPin}
              error={error}
              loading={loading}
            />
          )}

          {step === 'confirm' && (
            <PinInput
              length={targetLength}
              title="Повторите ПИН-код"
              subtitle="Для подтверждения"
              onComplete={handleConfirmNewPin}
              error={error}
              loading={loading}
            />
          )}
        </div>
      </ResponsiveModal>

      {/* Модалка удаления ПИН */}
      <ResponsiveModal
        trigger={<span />}
        open={modalOpen === 'remove'}
        onOpenChange={(open) => {
          if (!open) {
            setModalOpen(null)
            setError('')
          }
        }}
        title={
          <span className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
            Удалить ПИН-код
          </span>
        }
      >
        <PinInput
          length={pinLength ?? 4}
          title="Введите текущий ПИН"
          subtitle="Для подтверждения удаления защиты"
          onComplete={handleRemove}
          error={error}
          loading={loading}
        />
      </ResponsiveModal>
    </>
  )
}

export default PinSettings

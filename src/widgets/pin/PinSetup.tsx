'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import PinInput from '@/widgets/pin/PinInput'
import usePinStore, { type PinLength } from '@/lib/hooks/store/usePinStore'
import { hashPin, generateSalt } from '@/lib/pin/crypto'
import { ShieldCheck } from '@phosphor-icons/react'

type PinSetupProps = {
  onComplete?: () => void
}

type Step = 'choose-length' | 'enter-pin' | 'confirm-pin'

const PinSetup: React.FC<PinSetupProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('choose-length')
  const [pinLength, setPinLength] = useState<PinLength>(4)
  const [firstPin, setFirstPin] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const setPin = usePinStore((state) => state.setPin)

  const handleLengthChoice = (length: PinLength) => {
    setPinLength(length)
    setStep('enter-pin')
  }

  const handleFirstPin = (pin: string) => {
    setFirstPin(pin)
    setStep('confirm-pin')
  }

  const handleConfirmPin = async (pin: string) => {
    if (pin !== firstPin) {
      setError('ПИН-коды не совпадают. Попробуйте ещё раз.')
      setStep('enter-pin')
      setFirstPin('')
      return
    }

    setLoading(true)
    setError('')

    try {
      const salt = generateSalt()
      const hash = await hashPin(pin, salt)
      setPin(hash, salt, pinLength)
      if (typeof window !== 'undefined') {
        if (window.electronAPI?.pin) {
          await window.electronAPI.pin.set({
            pinHash: hash,
            pinSalt: salt,
            pinLength,
          })
        }
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'pin_sync',
              pinHash: hash,
              pinSalt: salt,
              pinLength,
              biometricEnabled: false,
            }),
          )
        }
      }
      onComplete?.()
    } catch {
      setError('Ошибка при сохранении ПИН-кода')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'choose-length') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="page-enter flex w-full max-w-sm flex-col items-center text-center">
          <div className="mb-6 rounded-full bg-content/5 p-5">
            <ShieldCheck size={40} className="text-primary" weight="duotone" />
          </div>

          <h1 className="font-mono text-2xl font-semibold uppercase tracking-[0.04em]">
            Защита приложения
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Придумайте ПИН-код для быстрого входа в приложение. Он будет
            запрашиваться при каждом открытии.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3">
            <button
              onClick={() => handleLengthChoice(4)}
              className={cn(
                'flex items-center justify-between rounded-xl border border-content/15 px-5 py-4 text-left transition-all hover:border-content/30 hover:bg-content/5 active:scale-[0.98]',
              )}
            >
              <div>
                <p className="font-medium">4 цифры</p>
                <p className="text-xs text-muted-foreground">Быстрее вводить</p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-2.5 w-2.5 rounded-full bg-content/20"
                  />
                ))}
              </div>
            </button>

            <button
              onClick={() => handleLengthChoice(6)}
              className={cn(
                'flex items-center justify-between rounded-xl border border-content/15 px-5 py-4 text-left transition-all hover:border-content/30 hover:bg-content/5 active:scale-[0.98]',
              )}
            >
              <div>
                <p className="font-medium">6 цифр</p>
                <p className="text-xs text-muted-foreground">Надёжнее защита</p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-2.5 w-2.5 rounded-full bg-content/20"
                  />
                ))}
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="page-enter">
        <PinInput
          key={step}
          length={pinLength}
          title={
            step === 'enter-pin' ? 'Придумайте ПИН-код' : 'Повторите ПИН-код'
          }
          subtitle={
            step === 'enter-pin'
              ? `${pinLength} цифры`
              : 'Введите ПИН-код ещё раз'
          }
          onComplete={step === 'enter-pin' ? handleFirstPin : handleConfirmPin}
          error={error}
          loading={loading}
        />
      </div>
    </div>
  )
}

export default PinSetup

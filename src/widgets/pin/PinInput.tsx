'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Backspace, Fingerprint, LockSimple } from '@phosphor-icons/react'
import type { PinLength } from '@/lib/hooks/store/usePinStore'

type PinInputProps = {
  length: PinLength
  title: string
  subtitle?: string
  onComplete: (pin: string) => void
  onBiometric?: () => void
  showBiometric?: boolean
  error?: string
  loading?: boolean
}

const PinInput: React.FC<PinInputProps> = ({
  length,
  title,
  subtitle,
  onComplete,
  onBiometric,
  showBiometric = false,
  error,
  loading = false,
}) => {
  const [pin, setPin] = useState<string>('')
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Автофокус на инпут
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Ошибка — тряска и сброс
  useEffect(() => {
    if (error) {
      setShake(true)
      const timer = setTimeout(() => {
        setShake(false)
        setPin('')
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleDigit = useCallback(
    (digit: string) => {
      if (loading) return

      const next = pin + digit
      if (next.length > length) return

      setPin(next)

      if (next.length === length) {
        // Небольшая задержка для UX — пользователь видит последнюю цифру
        setTimeout(() => onComplete(next), 150)
      }
    },
    [pin, length, loading, onComplete],
  )

  const handleBackspace = useCallback(() => {
    if (loading) return
    setPin((prev) => prev.slice(0, -1))
  }, [loading])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key)
      } else if (e.key === 'Backspace') {
        handleBackspace()
      }
    },
    [handleDigit, handleBackspace],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, '').slice(0, length)
      setPin(value)
      if (value.length === length) {
        setTimeout(() => onComplete(value), 150)
      }
    },
    [length, onComplete],
  )

  const digits = Array.from({ length }, (_, i) => i)

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Скрытый инпут для клавиатуры */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={length}
        value={pin}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="sr-only"
        autoFocus
        disabled={loading}
        aria-label={title}
      />

      {/* Заголовок */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 rounded-full bg-content/5 p-4">
          <LockSimple size={32} className="text-content/70" weight="duotone" />
        </div>
        <h2 className="font-mono text-xl font-semibold uppercase tracking-[0.04em]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {/* Точки ПИН */}
      <div
        className={cn(
          'mb-8 flex gap-3',
          shake && 'animate-[shake_0.4s_ease-in-out]',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {digits.map((i) => (
          <div
            key={i}
            className={cn(
              'h-4 w-4 rounded-full border-2 transition-all duration-200',
              i < pin.length
                ? 'border-primary bg-primary scale-110'
                : 'border-content/25 bg-transparent',
              shake && 'border-red-500',
            )}
          />
        ))}
      </div>

      {/* Ошибка */}
      {error && (
        <p className="mb-4 text-center text-sm text-red-600">{error}</p>
      )}

      {/* Клавиатура */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <Button
            key={digit}
            variant="ghost"
            size="lg"
            className="h-16 w-16 rounded-full text-xl font-medium transition-all hover:bg-content/10 active:scale-95"
            onClick={() => handleDigit(digit.toString())}
            disabled={loading}
          >
            {digit}
          </Button>
        ))}

        {/* Биометрия или пусто */}
        <div className="flex h-16 w-16 items-center justify-center">
          {showBiometric && onBiometric && (
            <Button
              variant="ghost"
              size="lg"
              className="h-16 w-16 rounded-full transition-all hover:bg-content/10 active:scale-95"
              onClick={onBiometric}
              disabled={loading}
            >
              <Fingerprint size={28} className="text-content/70" />
            </Button>
          )}
        </div>

        {/* 0 */}
        <Button
          variant="ghost"
          size="lg"
          className="h-16 w-16 rounded-full text-xl font-medium transition-all hover:bg-content/10 active:scale-95"
          onClick={() => handleDigit('0')}
          disabled={loading}
        >
          0
        </Button>

        {/* Backspace */}
        <Button
          variant="ghost"
          size="lg"
          className="h-16 w-16 rounded-full transition-all hover:bg-content/10 active:scale-95"
          onClick={handleBackspace}
          disabled={loading}
        >
          <Backspace size={24} className="text-content/70" />
        </Button>
      </div>
    </div>
  )
}

export default PinInput

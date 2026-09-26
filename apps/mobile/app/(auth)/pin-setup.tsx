import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { generateSalt, hashPin } from '../../lib/crypto'

type PinLength = 4 | 6
type Step = 'choose' | 'enter' | 'confirm'

export default function PinSetupScreen() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('choose')
  const [pinLength, setPinLength] = useState<PinLength>(4)
  const [firstPin, setFirstPin] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleLengthChoice(length: PinLength) {
    setPinLength(length)
    setStep('enter')
  }

  function handlePin(digit: string) {
    if (loading || pin.length >= pinLength) return

    const newPin = pin + digit
    setPin(newPin)
    setError('')

    if (newPin.length === pinLength) {
      if (step === 'enter') {
        setFirstPin(newPin)
        setPin('')
        setStep('confirm')
      } else if (step === 'confirm') {
        verifyAndSave(newPin)
      }
    }
  }

  async function verifyAndSave(confirmPin: string) {
    if (confirmPin !== firstPin) {
      Vibration.vibrate(200)
      setError('ПИН-коды не совпадают')
      setPin('')
      setFirstPin('')
      setStep('enter')
      return
    }

    setLoading(true)
    setError('')

    try {
      const salt = await generateSalt()
      const hash = await hashPin(confirmPin, salt)

      await SecureStore.setItemAsync('pin_hash', hash)
      await SecureStore.setItemAsync('pin_salt', salt)
      await SecureStore.setItemAsync('pin_length', pinLength.toString())

      // Переходим в приложение
      router.replace('/(app)')
    } catch {
      setError('Ошибка сохранения ПИН-кода')
    } finally {
      setLoading(false)
    }
  }

  function handleBackspace() {
    setPin((prev) => prev.slice(0, -1))
    setError('')
  }

  const digits = Array.from({ length: pinLength }, (_, i) => i)

  if (step === 'choose') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Защита приложения</Text>
          <Text style={styles.subtitle}>
            Придумайте ПИН-код для быстрого входа
          </Text>

          <TouchableOpacity
            style={styles.choiceCard}
            onPress={() => handleLengthChoice(4)}
          >
            <Text style={styles.choiceTitle}>4 цифры</Text>
            <Text style={styles.choiceSubtitle}>Быстрее вводить</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.choiceCard}
            onPress={() => handleLengthChoice(6)}
          >
            <Text style={styles.choiceTitle}>6 цифр</Text>
            <Text style={styles.choiceSubtitle}>Надёжнее защита</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {step === 'enter' ? 'Придумайте ПИН-код' : 'Повторите ПИН-код'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'enter' ? `${pinLength} цифры` : 'Введите ещё раз'}
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.pinContainer}>
          {digits.map((i) => (
            <View
              key={i}
              style={[styles.pinDot, i < pin.length && styles.pinDotFilled]}
            />
          ))}
        </View>

        <View style={styles.keyboard}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <TouchableOpacity
              key={digit}
              style={styles.key}
              onPress={() => handlePin(digit.toString())}
            >
              <Text style={styles.keyText}>{digit}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.key} />

          <TouchableOpacity style={styles.key} onPress={() => handlePin('0')}>
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.key} onPress={handleBackspace}>
            <Text style={styles.keyText}>⌫</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 24,
  },
  error: {
    color: '#ff4444',
    fontSize: 14,
    marginBottom: 16,
  },
  pinContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pinDotFilled: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  keyboard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    maxWidth: 300,
  },
  key: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'monospace',
  },
  choiceCard: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  choiceTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  choiceSubtitle: {
    color: '#888',
    fontSize: 14,
  },
})

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
} from 'react-native'
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import { useRouter } from 'expo-router'
import { verifyPin as checkPin } from '../lib/crypto'

export default function LockScreen() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [pinLength, setPinLength] = useState<4 | 6>(4)

  useEffect(() => {
    checkBiometric()
    loadPinLength()
  }, [])

  async function checkBiometric() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    const isEnrolled = await LocalAuthentication.isEnrolledAsync()
    const available = hasHardware && isEnrolled
    setBiometricAvailable(available)

    if (available) {
      setTimeout(() => {
        handleBiometric()
      }, 300)
    }
  }

  async function loadPinLength() {
    const length = await SecureStore.getItemAsync('pin_length')
    if (length === '6') setPinLength(6)
  }

  async function handlePin(digit: string) {
    if (pin.length >= pinLength) return

    const newPin = pin + digit
    setPin(newPin)
    setError('')

    if (newPin.length === pinLength) {
      await verifyPin(newPin)
    }
  }

  async function verifyPin(pinToVerify: string) {
    try {
      const storedHash = await SecureStore.getItemAsync('pin_hash')
      const storedSalt = await SecureStore.getItemAsync('pin_salt')

      if (!storedHash || !storedSalt) {
        setPin('')
        return
      }

      const isValid = await checkPin(pinToVerify, storedSalt, storedHash)

      if (isValid) {
        setPin('')
        // Разблокируем — переходим на главную
        router.replace('/(app)')
      } else {
        Vibration.vibrate(200)
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        setError(`Неверный ПИН. Осталось: ${5 - newAttempts}`)
        setPin('')

        if (newAttempts >= 5) {
          // Выход из аккаунта
          await SecureStore.deleteItemAsync('access_token')
          await SecureStore.deleteItemAsync('pin_hash')
          await SecureStore.deleteItemAsync('pin_salt')
          router.replace('/(auth)/login')
        }
      }
    } catch {
      setError('Ошибка проверки')
      setPin('')
    }
  }

  async function handleBiometric() {
    if (!biometricAvailable) return

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Разблокировать adaption',
        fallbackLabel: 'Ввести ПИН',
        disableDeviceFallback: true,
      })

      if (result.success) {
        router.replace('/(app)')
      }
    } catch {
      Alert.alert('Ошибка', 'Биометрическая аутентификация недоступна')
    }
  }

  function handleBackspace() {
    setPin((prev) => prev.slice(0, -1))
    setError('')
  }

  const digits = Array.from({ length: pinLength }, (_, i) => i)

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Введите ПИН-код</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.pinContainer}>
          {digits.map((i) => (
            <View
              key={i}
              style={[
                styles.pinDot,
                i < pin.length && styles.pinDotFilled,
              ]}
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

          <View style={styles.key}>
            {biometricAvailable && (
              <TouchableOpacity onPress={handleBiometric}>
                <Text style={styles.biometricIcon}>👤</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.key}
            onPress={() => handlePin('0')}
          >
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.key}
            onPress={handleBackspace}
          >
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
    marginBottom: 8,
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
  biometricIcon: {
    fontSize: 28,
  },
})

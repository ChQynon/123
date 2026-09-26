import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import axios from 'axios'

const API_URL = 'https://adaption.top/api'

export default function LoginScreen() {
  const router = useRouter()
  const [iin, setIin] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (iin.length !== 12 || password.length < 6) {
      setError('Проверьте правильность ввода')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, {
        username: iin,
        password,
      })

      // Сохраняем токен
      await SecureStore.setItemAsync('access_token', data.accessToken)
      await SecureStore.setItemAsync('refresh_token', data.refreshToken)

      // Проверяем, есть ли ПИН
      const pinHash = await SecureStore.getItemAsync('pin_hash')

      if (!pinHash) {
        // Переходим к установке ПИН
        router.replace('/(auth)/pin-setup')
      } else {
        // Переходим к разблокировке
        router.replace('/lock')
      }
    } catch (e: any) {
      setError(
        e.response?.data?.message || 'Ошибка входа. Проверьте данные.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>adaption</Text>
        <Text style={styles.subtitle}>Школьный дневник НИШ</Text>

        <TextInput
          style={styles.input}
          placeholder="ИИН"
          placeholderTextColor="#666"
          value={iin}
          onChangeText={setIin}
          keyboardType="numeric"
          maxLength={12}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Пароль"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Продолжить</Text>
          )}
        </TouchableOpacity>
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
    paddingHorizontal: 32,
  },
  logo: {
    color: '#fff',
    fontSize: 32,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  error: {
    color: '#ff4444',
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

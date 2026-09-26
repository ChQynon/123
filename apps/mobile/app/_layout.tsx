import { useEffect, useState } from 'react'
import { Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, Text, StyleSheet } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

export default function RootLayout() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [initialRoute, setInitialRoute] = useState<'login' | 'pin-setup' | 'lock'>('login')

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await SecureStore.getItemAsync('access_token')
        if (token) {
          const pinHash = await SecureStore.getItemAsync('pin_hash')
          if (!pinHash) {
            setInitialRoute('pin-setup')
          } else {
            setInitialRoute('lock')
          }
        } else {
          setInitialRoute('login')
        }
      } catch {
        setInitialRoute('login')
      } finally {
        setIsReady(true)
      }
    }

    checkAuth()
  }, [])

  useEffect(() => {
    if (!isReady) return

    if (initialRoute === 'lock') {
      router.replace('/lock')
    } else if (initialRoute === 'pin-setup') {
      router.replace('/(auth)/pin-setup')
    } else {
      router.replace('/(auth)/login')
    }
  }, [isReady, initialRoute, router])

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>adaption</Text>
      </View>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" backgroundColor="#0a0a0a" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="lock" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(app)" options={{ gestureEnabled: false }} />
      </Stack>
    </QueryClientProvider>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 2,
  },
})

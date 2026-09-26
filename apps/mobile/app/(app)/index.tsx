import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  BackHandler,
  Platform,
} from 'react-native'
import { WebView } from 'react-native-webview'
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'

const APP_URL = 'https://adaption.top'

export default function AppScreen() {
  const router = useRouter()
  const webViewRef = useRef<WebView>(null)
  const [loading, setLoading] = useState(true)
  const [canGoBack, setCanGoBack] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Android hardware back button handler
  useEffect(() => {
    if (Platform.OS !== 'android') return

    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack()
        return true
      }
      return false
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    )
    return () => subscription.remove()
  }, [canGoBack])

  // Injected JS to inform webview it runs in native mobile wrapper
  const injectedJavaScript = `
    (function() {
      window.__ADAPTION_NATIVE__ = true;
      window.__ADAPTION_PLATFORM__ = '${Platform.OS}';
      true;
    })();
  `

  // Handle messages received from the WebView
  const handleMessage = useCallback(
    async (event: any) => {
      try {
        const rawData = event.nativeEvent?.data
        if (!rawData) return
        const data = JSON.parse(rawData)

        switch (data.type) {
          case 'biometric_auth': {
            const hasHardware = await LocalAuthentication.hasHardwareAsync()
            const isEnrolled = await LocalAuthentication.isEnrolledAsync()

            if (hasHardware && isEnrolled) {
              const res = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Разблокировать adaption',
                fallbackLabel: 'Ввести ПИН',
                disableDeviceFallback: false,
              })

              webViewRef.current?.postMessage(
                JSON.stringify({
                  type: 'biometric_result',
                  success: res.success,
                }),
              )
            } else {
              webViewRef.current?.postMessage(
                JSON.stringify({
                  type: 'biometric_result',
                  success: false,
                }),
              )
            }
            break
          }

          case 'pin_sync': {
            if (data.pinHash && data.pinSalt) {
              await SecureStore.setItemAsync('pin_hash', data.pinHash)
              await SecureStore.setItemAsync('pin_salt', data.pinSalt)
              if (data.pinLength) {
                await SecureStore.setItemAsync(
                  'pin_length',
                  data.pinLength.toString(),
                )
              }
            } else {
              await SecureStore.deleteItemAsync('pin_hash')
              await SecureStore.deleteItemAsync('pin_salt')
              await SecureStore.deleteItemAsync('pin_length')
            }
            break
          }

          case 'logout': {
            await SecureStore.deleteItemAsync('access_token')
            await SecureStore.deleteItemAsync('refresh_token')
            router.replace('/(auth)/login')
            break
          }

          default:
            break
        }
      } catch {
        // ignore parsing errors
      }
    },
    [router],
  )

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="light" backgroundColor="#0a0a0a" />

      {hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Ошибка подключения</Text>
          <Text style={styles.errorSubtitle}>
            Не удалось загрузить данные. Проверьте подключение к интернету.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setHasError(false)
              webViewRef.current?.reload()
            }}
          >
            <Text style={styles.retryButtonText}>Повторить попытку</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: APP_URL }}
          style={styles.webview}
          injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
          onMessage={handleMessage}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack)
          }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false)
            setHasError(true)
          }}
          allowsBackForwardNavigationGestures
          domStorageEnabled
          javaScriptEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          pullToRefreshEnabled
          applicationNameForUserAgent="AdaptionApp/1.0"
        />
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 10, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorSubtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

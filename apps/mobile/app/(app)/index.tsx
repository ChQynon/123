import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  BackHandler,
  AppState,
  Linking,
  Platform,
  useColorScheme,
} from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import * as NavigationBar from 'expo-navigation-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'

const APP_URL = process.env.EXPO_PUBLIC_APP_URL || 'https://adaption.top'
const APP_ORIGIN = new URL(APP_URL).origin
const PIN_KEYS = ['pin_hash', 'pin_salt', 'pin_length', 'biometric_enabled']

export default function AppScreen() {
  const systemTheme = useColorScheme()
  const webViewRef = useRef<WebView>(null)
  const [bootstrap, setBootstrap] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [canGoBack, setCanGoBack] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [appearance, setAppearance] = useState<{
    dark: boolean
    backgroundColor: string
  } | null>(null)
  const dark = appearance?.dark ?? systemTheme === 'dark'
  const backgroundColor =
    appearance?.backgroundColor ?? (dark ? '#0e1115' : '#f3f5f6')
  const foregroundColor = dark ? '#ebedf1' : '#152235'
  const biometricPending = useRef(false)

  useEffect(() => {
    if (Platform.OS !== 'android') return
    void Promise.all([
      NavigationBar.setBackgroundColorAsync(backgroundColor),
      NavigationBar.setButtonStyleAsync(dark ? 'light' : 'dark'),
    ]).catch(() => {})
  }, [backgroundColor, dark])

  useEffect(() => {
    let cancelled = false
    async function prepare() {
      let pinState = null
      try {
        const [pinHash, pinSalt, pinLength, biometricEnabled] =
          await Promise.all(
            PIN_KEYS.map((key) => SecureStore.getItemAsync(key)),
          )
        if (pinHash && pinSalt && (pinLength === '4' || pinLength === '6')) {
          pinState = {
            state: {
              pinHash,
              pinSalt,
              pinLength: Number(pinLength),
              biometricEnabled: biometricEnabled === 'true',
            },
            version: 1,
          }
        }
      } catch {
        // The site's persistent session can still work if secure storage is unavailable.
      }
      if (cancelled) return
      setBootstrap(`
        (function() {
          if (window.location.origin !== ${JSON.stringify(APP_ORIGIN)}) return;
          if (window.__ADAPTION_NATIVE__) return;
          window.__ADAPTION_NATIVE__ = true;
          window.__ADAPTION_PLATFORM__ = ${JSON.stringify(Platform.OS)};
          try {
            var saved = ${JSON.stringify(pinState)};
            if (saved && !localStorage.getItem('pin-security')) {
              localStorage.setItem('pin-security', JSON.stringify(saved));
            }
          } catch (_) {}
          window.dispatchEvent(new Event('adaption:native-ready'));
        })();
        true;
      `)
    }
    void prepare()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (Platform.OS !== 'android') return
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack()
          return true
        }
        return false
      },
    )
    return () => subscription.remove()
  }, [canGoBack])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && !biometricPending.current) {
        webViewRef.current?.injectJavaScript(
          "window.dispatchEvent(new Event('adaption:lock')); true;",
        )
      }
    })
    return () => subscription.remove()
  }, [])

  const handleMessage = useCallback(async (event: WebViewMessageEvent) => {
    try {
      if (new URL(event.nativeEvent.url).origin !== APP_ORIGIN) return
      const data = JSON.parse(event.nativeEvent.data)
      switch (data.type) {
        case 'appearance':
          if (
            typeof data.dark === 'boolean' &&
            typeof data.backgroundColor === 'string' &&
            /^rgba?\([\d.,\s]+\)$/.test(data.backgroundColor)
          ) {
            setAppearance({
              dark: data.dark,
              backgroundColor: data.backgroundColor,
            })
          }
          break
        case 'biometric_auth': {
          if (biometricPending.current) return
          biometricPending.current = true
          let success = false
          try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync()
            const isEnrolled = await LocalAuthentication.isEnrolledAsync()
            if (hasHardware && isEnrolled) {
              const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Разблокировать adaption',
                fallbackLabel: 'Ввести ПИН',
                disableDeviceFallback: true,
              })
              success = result.success
            }
          } finally {
            biometricPending.current = false
            webViewRef.current?.postMessage(
              JSON.stringify({ type: 'biometric_result', success }),
            )
          }
          break
        }
        case 'pin_sync':
          if (
            typeof data.pinHash === 'string' &&
            typeof data.pinSalt === 'string' &&
            (data.pinLength === 4 || data.pinLength === 6)
          ) {
            await Promise.all([
              SecureStore.setItemAsync('pin_hash', data.pinHash),
              SecureStore.setItemAsync('pin_salt', data.pinSalt),
              SecureStore.setItemAsync('pin_length', String(data.pinLength)),
              SecureStore.setItemAsync(
                'biometric_enabled',
                String(data.biometricEnabled === true),
              ),
            ])
          } else {
            await Promise.all(
              PIN_KEYS.map((key) => SecureStore.deleteItemAsync(key)),
            )
          }
          break
        case 'logout':
          await Promise.all(
            [...PIN_KEYS, 'access_token', 'refresh_token'].map((key) =>
              SecureStore.deleteItemAsync(key),
            ),
          )
          break
      }
    } catch {
      // Ignore malformed or unavailable native bridge requests.
    }
  }, [])

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <StatusBar
        style={dark ? 'light' : 'dark'}
        backgroundColor={backgroundColor}
      />
      {bootstrap && (
        <WebView
          ref={webViewRef}
          source={{ uri: APP_URL }}
          style={[
            styles.webview,
            { backgroundColor },
            hasError && styles.hidden,
          ]}
          injectedJavaScriptBeforeContentLoaded={bootstrap}
          injectedJavaScript={bootstrap}
          injectedJavaScriptBeforeContentLoadedForMainFrameOnly
          injectedJavaScriptForMainFrameOnly
          onMessage={handleMessage}
          onShouldStartLoadWithRequest={(request) => {
            if (request.url === 'about:blank') return true
            try {
              if (new URL(request.url).origin === APP_ORIGIN) return true
              if (/^(https?:|mailto:|tel:)/.test(request.url))
                void Linking.openURL(request.url).catch(() => {})
            } catch {}
            return false
          }}
          onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
          onLoadStart={() => {
            setLoading(true)
            setHasError(false)
          }}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false)
            setHasError(true)
          }}
          onHttpError={(event) => {
            if (
              event.nativeEvent.url === APP_URL &&
              event.nativeEvent.statusCode >= 400
            ) {
              setLoading(false)
              setHasError(true)
            }
          }}
          onContentProcessDidTerminate={() => webViewRef.current?.reload()}
          onRenderProcessGone={() => webViewRef.current?.reload()}
          allowsBackForwardNavigationGestures
          domStorageEnabled
          javaScriptEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          pullToRefreshEnabled
          forceDarkOn={false}
          textZoom={100}
          applicationNameForUserAgent="AdaptionApp/1.0"
        />
      )}
      {hasError && (
        <View style={[styles.overlay, { backgroundColor }]}>
          <Text style={[styles.errorTitle, { color: foregroundColor }]}>
            Ошибка подключения
          </Text>
          <Text style={[styles.errorSubtitle, { color: foregroundColor }]}>
            Не удалось загрузить сайт. Проверьте подключение к интернету.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setHasError(false)
              setLoading(true)
              webViewRef.current?.reload()
            }}
          >
            <Text style={styles.retryButtonText}>Повторить попытку</Text>
          </TouchableOpacity>
        </View>
      )}
      {loading && !hasError && (
        <View
          pointerEvents="none"
          style={[styles.overlay, { backgroundColor }]}
        >
          <ActivityIndicator size="large" color="#4597f7" />
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  hidden: { opacity: 0 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  retryButton: {
    backgroundColor: '#4597f7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})

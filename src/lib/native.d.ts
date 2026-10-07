export {}

declare global {
  interface Window {
    __ADAPTION_SYSTEM_THEME__?: 'light' | 'dark'
    __ADAPTION_BOOT_TIMER__?: ReturnType<typeof setTimeout>
    ReactNativeWebView?: { postMessage: (message: string) => void }
    electronAPI?: {
      platform: string
      biometric: {
        available: () => Promise<boolean>
        authenticate: () => Promise<{ success: boolean }>
      }
      pin: {
        get: () => Promise<unknown>
        set: (data: unknown) => Promise<unknown>
        remove: () => Promise<unknown>
        setBiometric: (enabled: boolean) => Promise<unknown>
      }
      appearance?: {
        getSystemTheme?: () => Promise<'light' | 'dark'>
        onSystemTheme?: (
          callback: (theme: 'light' | 'dark', reset?: boolean) => void,
        ) => () => void
        set: (appearance: {
          dark: boolean
          backgroundColor: string
        }) => Promise<void>
      }
    }
  }
}

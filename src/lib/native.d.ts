export {}

declare global {
  interface Window {
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
        set: (appearance: {
          dark: boolean
          backgroundColor: string
        }) => Promise<void>
      }
    }
  }
}

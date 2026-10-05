/**
 * Определение платформы: веб или нативное приложение.
 * ПИН-код и биометрия видны только в app-версии.
 */

export type Platform = 'web' | 'android' | 'ios' | 'windows' | 'macos' | 'linux'

/** Текущая платформа */
export function getPlatform(): Platform {
  if (typeof window === 'undefined') return 'web'

  // React Native WebView
  if ((window as any).ReactNativeWebView || (window as any).__ADAPTION_NATIVE__) {
    const nativePlatform = (window as any).__ADAPTION_PLATFORM__
    if (nativePlatform === 'ios' || nativePlatform === 'android') return nativePlatform
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes('android')) return 'android'
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) return 'ios'
    return 'android'
  }

  // Electron
  if ((window as any).electronAPI) {
    const p = (window as any).electronAPI?.platform
    if (p === 'win32' || p === 'windows') return 'windows'
    if (p === 'darwin' || p === 'macos') return 'macos'
    if (p === 'linux') return 'linux'
    return 'windows'
  }

  // Fallback for user agent checks
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('electron')) {
    if (ua.includes('macintosh') || ua.includes('mac os x')) return 'macos'
    if (ua.includes('windows')) return 'windows'
    return 'linux'
  }
  if (ua.includes('adaption-mobile') || ua.includes('adaption-app') || ua.includes('adaptionapp/')) {
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) return 'ios'
    return 'android'
  }

  return 'web'
}

/** Является ли текущая среда нативным приложением */
export function isApp(): boolean {
  return getPlatform() !== 'web'
}

/** Является ли мобильной платформой */
export function isMobile(): boolean {
  const p = getPlatform()
  return p === 'android' || p === 'ios'
}

/** Является ли десктопной платформой */
export function isDesktop(): boolean {
  const p = getPlatform()
  return p === 'windows' || p === 'macos' || p === 'linux'
}

/** Поддерживает ли платформа биометрию */
export function supportsBiometric(): boolean {
  const p = getPlatform()
  // Windows/Linux currently have no native biometric verifier.
  return p === 'ios' || p === 'android' || p === 'macos'
}

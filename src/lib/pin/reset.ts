import usePinStore from '@/lib/hooks/store/usePinStore'

/** Clear device protection when its authenticated account is signed out. */
export async function resetAppSecurity() {
  usePinStore.getState().removePin()
  usePinStore.getState().lock()
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'logout' }))
  }
  try {
    await window.electronAPI?.pin.remove()
  } catch {
    // Signing out must still complete if the native bridge is unavailable.
  }
}

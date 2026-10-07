export function createBootstrap(
  origin: string,
  platform: string,
  theme: 'light' | 'dark',
  pinState: unknown,
) {
  return `
    (function() {
      if (window.location.origin !== ${JSON.stringify(origin)}) return;
      if (window.__ADAPTION_NATIVE__) return;
      window.__ADAPTION_NATIVE__ = true;
      window.__ADAPTION_PLATFORM__ = ${JSON.stringify(platform)};
      window.__ADAPTION_SYSTEM_THEME__ = ${JSON.stringify(theme)};
      try {
        localStorage.setItem('theme', 'system');
        var saved = ${JSON.stringify(pinState)};
        if (saved && !localStorage.getItem('pin-security')) {
          localStorage.setItem('pin-security', JSON.stringify(saved));
        }
      } catch (_) {}
      var root = document.documentElement;
      if (root) {
        root.classList.remove('light', 'dark');
        root.classList.add(${JSON.stringify(theme)});
        root.style.colorScheme = ${JSON.stringify(theme)};
      }
      window.dispatchEvent(new Event('adaption:native-ready'));
      var ready = function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'document_ready' }));
      };
      if (document.readyState !== 'loading') ready();
      else document.addEventListener('DOMContentLoaded', ready, { once: true });
    })();
    true;
  `
}

export function createThemeUpdate(theme: 'light' | 'dark', reset = false) {
  return `window.__ADAPTION_SYSTEM_THEME__ = ${JSON.stringify(theme)};
    window.dispatchEvent(new CustomEvent('adaption:system-theme', { detail: ${JSON.stringify({ theme, reset })} })); true;`
}

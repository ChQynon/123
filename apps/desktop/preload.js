const { contextBridge, ipcRenderer } = require('electron')

// Определяем платформу
const platform = process.platform // 'darwin', 'win32', 'linux'

// Экспортируем API в renderer
contextBridge.exposeInMainWorld('electronAPI', {
  platform,
  appearance: {
    set: (data) => ipcRenderer.invoke('appearance:set', data),
  },

  // Биометрия
  biometric: {
    available: () => ipcRenderer.invoke('biometric:available'),
    authenticate: () => ipcRenderer.invoke('biometric:authenticate'),
  },

  // ПИН-код
  pin: {
    get: () => ipcRenderer.invoke('pin:get'),
    set: (data) => ipcRenderer.invoke('pin:set', data),
    remove: () => ipcRenderer.invoke('pin:remove'),
    setBiometric: (enabled) => ipcRenderer.invoke('pin:biometric', enabled),
  },
})

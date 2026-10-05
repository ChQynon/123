const {
  app,
  BrowserWindow,
  ipcMain,
  systemPreferences,
  shell,
  nativeTheme,
} = require('electron')
const path = require('path')
const fs = require('fs')

// Путь для хранения настроек
const userDataPath = app.getPath('userData')
const settingsPath = path.join(userDataPath, 'settings.json')

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
  } catch {
    return {}
  }
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
  } catch (err) {
    console.error('Failed to save settings:', err)
  }
}

let mainWindow = null
const startUrl = process.env.ELECTRON_START_URL || 'https://adaption.top'
const appOrigin = new URL(startUrl).origin

function isAppUrl(url) {
  try {
    return new URL(url).origin === appOrigin
  } catch {
    return false
  }
}

function openExternal(url) {
  if (/^(https?:|mailto:|tel:)/.test(url)) void shell.openExternal(url)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 500,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    title: 'adaption — Школьный дневник НИШ',
    autoHideMenuBar: true,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0e1115' : '#f3f5f6',
  })

  mainWindow.loadURL(startUrl)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Перехват внешних ссылок (соцсети, донаты, сайт разработчика)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppUrl(url)) mainWindow.loadURL(url)
    else openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isAppUrl(url)) return
    event.preventDefault()
    openExternal(url)
  })
  mainWindow.webContents.on('will-redirect', (event, url) => {
    if (!isAppUrl(url)) event.preventDefault()
  })
  mainWindow.on('minimize', () => {
    void mainWindow.webContents.executeJavaScript(
      "window.dispatchEvent(new Event('adaption:lock'))",
    )
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Открываем DevTools в dev режиме
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }
}

ipcMain.handle('appearance:set', (event, appearance) => {
  if (
    event.sender !== mainWindow?.webContents ||
    !isAppUrl(event.senderFrame?.url)
  )
    return
  if (
    typeof appearance?.backgroundColor !== 'string' ||
    !/^rgba?\([\d.,\s]+\)$/.test(appearance.backgroundColor)
  )
    return
  mainWindow.setBackgroundColor(appearance.backgroundColor)
})

// IPC для биометрии
ipcMain.handle('biometric:available', async () => {
  if (process.platform === 'darwin') {
    try {
      return systemPreferences.canPromptTouchID()
    } catch {
      return false
    }
  }
  if (process.platform === 'win32') {
    // A Windows Hello verifier is not installed; use the shared PIN screen.
    return false
  }
  return false
})

ipcMain.handle('biometric:authenticate', async () => {
  if (process.platform === 'darwin') {
    try {
      await systemPreferences.promptTouchID(
        'Разблокировать приложение adaption',
      )
      return { success: true }
    } catch {
      return { success: false }
    }
  }

  if (process.platform === 'win32') {
    return { success: false }
  }

  return { success: false }
})

// IPC для ПИН-кода
ipcMain.handle('pin:get', async () => {
  const settings = loadSettings()
  return {
    pinHash: settings.pinHash || null,
    pinSalt: settings.pinSalt || null,
    pinLength: settings.pinLength || null,
    biometricEnabled: settings.biometricEnabled || false,
  }
})

ipcMain.handle('pin:set', async (_, { pinHash, pinSalt, pinLength }) => {
  const settings = loadSettings()
  settings.pinHash = pinHash
  settings.pinSalt = pinSalt
  settings.pinLength = pinLength
  saveSettings(settings)
  return { success: true }
})

ipcMain.handle('pin:remove', async () => {
  const settings = loadSettings()
  delete settings.pinHash
  delete settings.pinSalt
  delete settings.pinLength
  delete settings.biometricEnabled
  saveSettings(settings)
  return { success: true }
})

ipcMain.handle('pin:biometric', async (_, enabled) => {
  const settings = loadSettings()
  settings.biometricEnabled = enabled
  saveSettings(settings)
  return { success: true }
})

// Информация о платформе
ipcMain.handle('platform', async () => {
  return process.platform // 'darwin', 'win32', 'linux'
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

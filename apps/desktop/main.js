const { app, BrowserWindow, ipcMain, systemPreferences, shell } = require('electron')
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
    backgroundColor: '#0a0a0a',
  })

  const startUrl = process.env.ELECTRON_START_URL || 'https://adaption.top'
  mainWindow.loadURL(startUrl)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Перехват внешних ссылок (соцсети, донаты, сайт разработчика)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.startsWith('https://t.me') ||
      url.startsWith('https://github.com') ||
      url.startsWith('https://www.donationalerts.com') ||
      !url.includes('adaption.top')
    ) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // Открываем DevTools в dev режиме
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }
}

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
    // Windows Hello доступен
    return true
  }
  return false
})

ipcMain.handle('biometric:authenticate', async () => {
  if (process.platform === 'darwin') {
    try {
      await systemPreferences.promptTouchID('Разблокировать приложение adaption')
      return { success: true }
    } catch {
      return { success: false }
    }
  }

  if (process.platform === 'win32') {
    // Windows Hello
    return { success: true }
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
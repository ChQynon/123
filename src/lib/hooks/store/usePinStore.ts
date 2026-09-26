import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Хранилище ПИН-кода. ПИН хранится в виде SHA-256 хэша + соль.
 * Работает только в app-версии (Electron / React Native), в вебе не используется.
 */

export type PinLength = 4 | 6

export type PinState = {
  /** SHA-256 хэш ПИН-кода с солью */
  pinHash: string | null
  /** Соль для хэширования */
  pinSalt: string | null
  /** Длина ПИН-кода (4 или 6) */
  pinLength: PinLength | null
  /** Разрешена ли биометрия (FaceID/TouchID) */
  biometricEnabled: boolean
  /** Разблокировано ли приложение в текущей сессии */
  isUnlocked: boolean
  /** Установлен ли ПИН */
  isPinSet: () => boolean
  /** Установить ПИН (хэш) */
  setPin: (hash: string, salt: string, length: PinLength) => void
  /** Изменить ПИН */
  changePin: (hash: string, salt: string, length: PinLength) => void
  /** Удалить ПИН */
  removePin: () => void
  /** Включить/выключить биометрию */
  setBiometric: (enabled: boolean) => void
  /** Разблокировать приложение */
  unlock: () => void
  /** Заблокировать приложение */
  lock: () => void
}

const usePinStore = create<PinState>()(
  persist(
    (set, get) => ({
      pinHash: null,
      pinSalt: null,
      pinLength: null,
      biometricEnabled: false,
      isUnlocked: false,

      isPinSet: () => {
        return get().pinHash !== null
      },

      setPin: (hash, salt, length) => {
        set({
          pinHash: hash,
          pinSalt: salt,
          pinLength: length,
          isUnlocked: true,
        })
      },

      changePin: (hash, salt, length) => {
        set({
          pinHash: hash,
          pinSalt: salt,
          pinLength: length,
          isUnlocked: true,
        })
      },

      removePin: () => {
        set({
          pinHash: null,
          pinSalt: null,
          pinLength: null,
          biometricEnabled: false,
          isUnlocked: true,
        })
      },

      setBiometric: (enabled) => {
        set({ biometricEnabled: enabled })
      },

      unlock: () => {
        set({ isUnlocked: true })
      },

      lock: () => {
        set({ isUnlocked: false })
      },
    }),
    {
      name: 'pin-security',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // isUnlocked не персистим — при перезагрузке приложение заблокировано
      partialize: (state) => ({
        pinHash: state.pinHash,
        pinSalt: state.pinSalt,
        pinLength: state.pinLength,
        biometricEnabled: state.biometricEnabled,
      }),
    },
  ),
)

export default usePinStore

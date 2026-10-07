import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { type CityAbbr, type CityFullName } from '@/shared/constants/cities'
import { del, get, set } from 'idb-keyval'
import type {
  PersistedClient,
  Persister,
} from '@tanstack/react-query-persist-client'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getCityByJceUrl = (url: string): CityAbbr => {
  // Not a schedule URL means JCE API service
  // JCE API url always starts with https://sms.(city).nis.edu.kz/...
  // this method will return the city (NIS filial) abbreviation (like ura, atr, pvl, etc.)

  return url.split('.')[1]!
}

export const getCityByScheduleUrl = (url: string): CityFullName => {
  // Schedule URL always starts with https://schedule.micros.nis.edu.kz/(city)/...
  // this method will return the city (NIS filial) full name (like Uralsk, Astana_FMSH, Pavlodar, etc.)

  return url.split('/')[3]!
}

export function IDBQueryPersistor(idbValidKey: IDBValidKey = 'query:root') {
  const bounded = async <T>(
    operation: () => Promise<T>,
    fallback: T,
  ): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        operation().catch(() => fallback),
        new Promise<T>((resolve) => {
          timer = setTimeout(() => resolve(fallback), 1500)
        }),
      ])
    } catch {
      return fallback
    } finally {
      clearTimeout(timer)
    }
  }
  return {
    persistClient: async (client: PersistedClient) => {
      await bounded(() => set(idbValidKey, client), undefined)
    },
    restoreClient: async () => {
      return await bounded(() => get<PersistedClient>(idbValidKey), undefined)
    },
    removeClient: async () => {
      await bounded(() => del(idbValidKey), undefined)
    },
  } as Persister
}

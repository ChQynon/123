import axios from 'axios'
import type { LoginHttpResponse } from '@/shared/types'
import type { InternalAxiosRequestConfig } from 'axios'
import https from 'https'

const agent = new https.Agent({
  rejectUnauthorized: false,
})

const proxy = axios.create({
  httpsAgent: agent,
  timeout: 15000,
})

proxy.interceptors.request.use((config) => {
  config.headers['user-agent'] = 'Dart/3.1 (dart:io)'
  config.headers.cookie = 'Culture=ru-RU;'
  return config
})

export const http = axios.create({
  withCredentials: true,
  httpsAgent: agent,
  timeout: 20000,
})

let refreshPromise: Promise<void> | null = null

http.interceptors.response.use(
  (res) => {
    return res
  },
  async (err: unknown) => {
    if (!axios.isAxiosError(err)) return Promise.reject(err)
    const originalConfig = err.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined

    if (err.response?.status === 401 && originalConfig) {
      if (originalConfig._retry) throw new Error('UNAUTHORIZED')
      originalConfig._retry = true
      if (!refreshPromise) {
        refreshPromise = axios
          .request<LoginHttpResponse>({
            url: '/api/auth/refresh',
            method: 'post',
            withCredentials: true,
            timeout: 20000,
          })
          .then(() => undefined)
          .catch((error: unknown) => {
            if (
              axios.isAxiosError(error) &&
              [400, 401, 403].includes(error.response?.status ?? 0)
            ) {
              throw new Error('UNAUTHORIZED')
            }
            throw error
          })
          .finally(() => {
            refreshPromise = null
          })
      }
      // Every waiting request settles on both success and failure.
      await refreshPromise
      return http(originalConfig)
    }

    return Promise.reject(err)
  },
)

export default proxy

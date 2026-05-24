import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiEnvelope } from '../types/api'

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://fuel-lending-app.onrender.com/api/v1'

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

let refreshPromise: Promise<string | null> | null = null

export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken')
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken')
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
}

export function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  try {
    const res = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(
      `${API_BASE}/auth/refresh`,
      { refreshToken },
    )
    if (res.data.success) {
      setTokens(res.data.data.accessToken, res.data.data.refreshToken)
      return res.data.data.accessToken
    }
  } catch {
    clearTokens()
  }
  return null
}

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const original = error.config
    if (!original || error.response?.status !== 401) {
      throw error
    }

    if (original.url?.includes('/auth/login') || original.url?.includes('/auth/refresh')) {
      throw error
    }

    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null
      })
    }

    const newToken = await refreshPromise
    if (!newToken) {
      clearTokens()
      window.location.href = '/login'
      throw error
    }

    original.headers.Authorization = `Bearer ${newToken}`
    return client(original)
  },
)

export async function apiGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const res = await client.get<ApiEnvelope<T>>(path, { params })
  if (!res.data.success) {
    throw new ApiError(res.data.message, res.status, res.data.data)
  }
  return res.data.data
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await client.post<ApiEnvelope<T>>(path, body)
  if (!res.data.success) {
    throw new ApiError(res.data.message, res.status, res.data.data)
  }
  return res.data.data
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await client.patch<ApiEnvelope<T>>(path, body)
  if (!res.data.success) {
    throw new ApiError(res.data.message, res.status, res.data.data)
  }
  return res.data.data
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await client.delete<ApiEnvelope<T>>(path)
  if (!res.data.success) {
    throw new ApiError(res.data.message, res.status, res.data.data)
  }
  return res.data.data
}

export default client

import axios, { isAxiosError } from 'axios'
import type { ApiEnvelope, AuthTokensResponse, AuthUser } from '../types/api'

export const API_BASE =
  import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1'

export type QrDisbursementResult = {
  transactionId: string
  qrPayload: string
  amount: number
  fuelLitres: number
  pricePerLitre: number
  expiresAt: string
  status: string
}

export type QrConfirmResult = {
  transactionId: string
  status: string
  amount: number
  fuelLitres: number
  pricePerLitre: number
  fuelBalanceRemaining: number
  interestAdded: number
  totalLitresPurchased: number
  outstandingBalance: number
}

export type FuelBalanceView = {
  balance: number
  currency: string
  activeLoanId: string | null
  fuelBalanceUsedOnLoan: number
}

export type FuelPriceView = {
  fuelPricePerLitre: number
  currency: string
  updatedAt: string
}

function apiErrorMessage(error: unknown): string {
  if (isAxiosError<ApiEnvelope<unknown>>(error)) {
    return error.response?.data?.message ?? error.message
  }
  if (error instanceof Error) return error.message
  return 'Request failed'
}

async function authPost<T>(path: string, body: unknown, token: string): Promise<T> {
  try {
    const res = await axios.post<ApiEnvelope<T>>(`${API_BASE}${path}`, body, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    if (!res.data.success) {
      throw new Error(res.data.message || 'Request failed')
    }
    return res.data.data
  } catch (error) {
    throw new Error(apiErrorMessage(error))
  }
}

async function authPut<T>(path: string, body: unknown, token: string): Promise<T> {
  try {
    const res = await axios.put<ApiEnvelope<T>>(`${API_BASE}${path}`, body, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    if (!res.data.success) {
      throw new Error(res.data.message || 'Request failed')
    }
    return res.data.data
  } catch (error) {
    throw new Error(apiErrorMessage(error))
  }
}

async function authGet<T>(path: string, token: string): Promise<T> {
  try {
    const res = await axios.get<ApiEnvelope<T>>(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.data.success) {
      throw new Error(res.data.message || 'Request failed')
    }
    return res.data.data
  } catch (error) {
    throw new Error(apiErrorMessage(error))
  }
}

export function normalizeQrDisbursement(data: Record<string, unknown>): QrDisbursementResult {
  const qrPayload =
    (typeof data.qrPayload === 'string' && data.qrPayload) ||
    (typeof data.qrToken === 'string' && data.qrToken) ||
    ''

  if (!qrPayload) {
    throw new Error('Server did not return a QR payload')
  }

  return {
    transactionId: String(data.transactionId ?? ''),
    qrPayload,
    amount: Number(data.amount ?? 0),
    fuelLitres: Number(data.fuelLitres ?? 0),
    pricePerLitre: Number(data.pricePerLitre ?? 0),
    expiresAt: String(data.expiresAt ?? ''),
    status: String(data.status ?? 'pending'),
  }
}

export const qrDemoApi = {
  login: async (email: string, password: string) => {
    try {
      const res = await axios.post<ApiEnvelope<AuthTokensResponse>>(`${API_BASE}/auth/login`, {
        email,
        password,
      })
      if (!res.data.success) {
        throw new Error(res.data.message || 'Login failed')
      }
      return res.data.data
    } catch (error) {
      throw new Error(apiErrorMessage(error))
    }
  },

  getMe: (token: string) => authGet<AuthUser>('/auth/me', token),

  getFuelBalance: (token: string) => authGet<FuelBalanceView>('/fuel/balance', token),

  getMerchantFuelPrice: (token: string) =>
    authGet<FuelPriceView>('/merchant/fuel-price', token),

  setMerchantFuelPrice: (token: string, fuelPricePerLitre: number) =>
    authPut<FuelPriceView>('/merchant/fuel-price', { fuelPricePerLitre }, token),

  initiateQrDisbursement: async (token: string, amount: number) => {
    const data = await authPost<Record<string, unknown>>(
      '/merchant/disbursements/qr',
      { amount },
      token
    )
    return normalizeQrDisbursement(data)
  },

  confirmQrPayment: (token: string, qrPayload: string) =>
    authPost<QrConfirmResult>('/transactions/qr/confirm', { qrPayload }, token),
}

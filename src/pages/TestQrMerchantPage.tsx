import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  API_BASE,
  qrDemoApi,
  type FuelPriceView,
  type QrDisbursementResult,
} from '../api/qr-demo'
import type { AuthUser } from '../types/api'
import { QrCodeDisplay } from '../components/QrCodeDisplay'
import {
  Button,
  Card,
  ErrorMessage,
  FormField,
  Input,
  PageHeader,
  StatusBadge,
} from '../components/ui'
import { formatCurrency, formatDateTime } from '../lib/utils'

type Session = { token: string; user: AuthUser }

const DEFAULT_AMOUNT = '5000'
const DEFAULT_FUEL_PRICE = '1250'

export function TestQrMerchantPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [amount, setAmount] = useState(DEFAULT_AMOUNT)
  const [fuelPriceInput, setFuelPriceInput] = useState(DEFAULT_FUEL_PRICE)
  const [notice, setNotice] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [fuelPrice, setFuelPrice] = useState<FuelPriceView | null>(null)
  const [qrResult, setQrResult] = useState<QrDisbursementResult | null>(null)
  const [liveStatus, setLiveStatus] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!session || !qrResult || qrResult.status === 'completed') return

    const poll = async () => {
      try {
        const tx = await qrDemoApi.getMerchantTransaction(session.token, qrResult.transactionId)
        setLiveStatus(tx.status)
        if (tx.status === 'completed') {
          setQrResult((prev) => (prev ? { ...prev, status: 'completed' } : prev))
        }
      } catch {
        // ignore transient poll errors
      }
    }

    void poll()
    const id = window.setInterval(poll, 2500)
    return () => window.clearInterval(id)
  }, [session, qrResult])

  const login = async () => {
    setError('')
    setNotice('')
    setLoading(true)
    try {
      const data = await qrDemoApi.login(email.trim(), password)
      const role = data.user.role
      if (role !== 'merchant_admin' && role !== 'merchant_seller' && role !== 'merchant') {
        throw new Error('Use a merchant admin or seller account')
      }
      setSession({ token: data.accessToken, user: data.user })
      try {
        const price = await qrDemoApi.getMerchantFuelPrice(data.accessToken)
        setFuelPrice(price)
        setFuelPriceInput(String(price.fuelPricePerLitre))
      } catch {
        setFuelPrice(null)
        setNotice('Set fuel price before generating a QR.')
      }
    } catch (err) {
      setSession(null)
      setFuelPrice(null)
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const saveFuelPrice = async () => {
    if (!session) return
    setError('')
    setLoading(true)
    try {
      const price = Number(fuelPriceInput)
      if (!Number.isFinite(price) || price <= 0) throw new Error('Enter a valid fuel price')
      const updated = await qrDemoApi.setMerchantFuelPrice(session.token, price)
      setFuelPrice(updated)
      setNotice('Fuel price saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save fuel price')
    } finally {
      setLoading(false)
    }
  }

  const generateQr = async () => {
    if (!session) return
    setError('')
    setLoading(true)
    setQrResult(null)
    setLiveStatus(null)
    try {
      const parsedAmount = Number(amount)
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Enter a valid purchase amount')
      }
      const result = await qrDemoApi.initiateQrDisbursement(session.token, parsedAmount)
      setQrResult(result)
      setLiveStatus(result.status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-(--bg-primary) p-4 md:p-8">
      <div className="mx-auto max-w-lg">
        <PageHeader
          title="Merchant POS"
          description="Device 1 — create a QR for the customer to scan on their phone."
          actions={
            <Link to="/demo/qr" className="text-sm font-medium text-emerald-500">
              Demo hub
            </Link>
          }
        />

        <p className="mb-4 text-xs text-(--text-muted)">
          API: <code className="rounded bg-(--bg-hover) px-1">{API_BASE}</code>
        </p>

        <Card className="space-y-4 p-5">
          {!session ? (
            <>
              {error && <ErrorMessage message={error} />}
              <FormField label="Merchant email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormField>
              <FormField label="Password">
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </FormField>
              <Button type="button" className="w-full" onClick={login} disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-lg bg-(--bg-hover) p-3 text-sm">
                <p className="font-medium">{session.user.firstName} {session.user.lastName}</p>
                <p className="text-(--text-muted)">{session.user.email}</p>
                {fuelPrice && (
                  <p className="mt-2">Fuel price: {formatCurrency(fuelPrice.fuelPricePerLitre)}/L</p>
                )}
              </div>

              {notice && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-600">
                  {notice}
                </p>
              )}
              {error && <ErrorMessage message={error} />}

              {!fuelPrice && (
                <div className="space-y-3 rounded-lg border border-amber-500/30 p-3">
                  <FormField label="Price per litre (NGN)">
                    <Input
                      type="number"
                      value={fuelPriceInput}
                      onChange={(e) => setFuelPriceInput(e.target.value)}
                    />
                  </FormField>
                  <Button type="button" variant="secondary" onClick={saveFuelPrice} disabled={loading}>
                    Save fuel price
                  </Button>
                </div>
              )}

              <FormField label="Purchase amount (NGN)">
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </FormField>

              <Button type="button" className="w-full" onClick={generateQr} disabled={loading || !fuelPrice}>
                {loading ? 'Generating…' : 'Generate QR code'}
              </Button>

              {qrResult && (
                <div className="space-y-4 border-t border-(--border) pt-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-(--text-primary)">Show this QR to customer</p>
                    <StatusBadge status={liveStatus ?? qrResult.status} />
                  </div>
                  <QrCodeDisplay value={qrResult.qrPayload} size={280} />
                  <dl className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-(--text-muted)">Amount</dt>
                      <dd>{formatCurrency(qrResult.amount)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-(--text-muted)">Litres</dt>
                      <dd>{qrResult.fuelLitres} L</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-(--text-muted)">Expires</dt>
                      <dd>{formatDateTime(qrResult.expiresAt)}</dd>
                    </div>
                  </dl>
                  {(liveStatus === 'completed' || qrResult.status === 'completed') && (
                    <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500">
                      Payment received — customer scan completed.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

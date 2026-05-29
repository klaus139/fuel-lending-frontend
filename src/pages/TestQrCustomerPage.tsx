import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  API_BASE,
  qrDemoApi,
  type FuelBalanceView,
  type QrConfirmResult,
} from '../api/qr-demo'
import type { AuthUser } from '../types/api'
import { QrCameraScanner } from '../components/QrCameraScanner'
import {
  Button,
  Card,
  ErrorMessage,
  FormField,
  Input,
  PageHeader,
  StatusBadge,
} from '../components/ui'
import { formatCurrency } from '../lib/utils'

type Session = { token: string; user: AuthUser }

const DEFAULT_CUSTOMER_EMAIL = 'nickoklaus5@gmail.com'

export function TestQrCustomerPage() {
  const [email, setEmail] = useState(DEFAULT_CUSTOMER_EMAIL)
  const [password, setPassword] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [balance, setBalance] = useState<FuelBalanceView | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [confirmResult, setConfirmResult] = useState<QrConfirmResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDevPaste, setShowDevPaste] = useState(false)
  const [devPayload, setDevPayload] = useState('')

  const refreshBalance = async (token: string) => {
    const data = await qrDemoApi.getFuelBalance(token)
    setBalance(data)
  }

  const login = async () => {
    setError('')
    setLoading(true)
    try {
      const data = await qrDemoApi.login(email.trim(), password)
      if (data.user.role !== 'customer') throw new Error('Use a customer account')
      setSession({ token: data.accessToken, user: data.user })
      await refreshBalance(data.accessToken)
    } catch (err) {
      setSession(null)
      setBalance(null)
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const confirmPayload = useCallback(
    async (qrPayload: string) => {
      if (!session) return
      setCameraOpen(false)
      setError('')
      setLoading(true)
      try {
        const result = await qrDemoApi.confirmQrPayment(session.token, qrPayload)
        setConfirmResult(result)
        await refreshBalance(session.token)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Payment failed')
        setCameraOpen(true)
      } finally {
        setLoading(false)
      }
    },
    [session],
  )

  const handleScan = useCallback(
    (payload: string) => {
      void confirmPayload(payload)
    },
    [confirmPayload],
  )

  return (
    <div className="min-h-screen bg-(--bg-primary) p-4 md:p-8">
      <div className="mx-auto max-w-lg">
        <PageHeader
          title="Customer app"
          description="Device 2 — open the camera and scan the merchant QR."
          actions={
            <Link to="/demo/qr" className="text-sm font-medium text-emerald-500">
              Demo hub
            </Link>
          }
        />

        <p className="mb-4 text-xs text-(--text-muted)">
          Camera requires HTTPS on mobile. Open{' '}
          <code className="rounded bg-(--bg-hover) px-1">/demo/qr/customer</code> on the customer
          phone (same network, use your machine IP if needed).
        </p>

        <Card className="space-y-4 p-5">
          {!session ? (
            <>
              {error && <ErrorMessage message={error} />}
              <FormField label="Customer email">
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
                <p className="font-medium">
                  {session.user.firstName} {session.user.lastName}
                </p>
                <p className="text-(--text-muted)">{session.user.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={session.user.isKycVerified ? 'approved' : 'pending'} />
                  {balance && (
                    <span>Fuel credit: {formatCurrency(balance.balance)}</span>
                  )}
                </div>
              </div>

              {error && <ErrorMessage message={error} />}

              {!confirmResult && (
                <>
                  {!cameraOpen ? (
                    <Button
                      type="button"
                      className="w-full py-3 text-base"
                      onClick={() => {
                        setError('')
                        setCameraOpen(true)
                      }}
                      disabled={loading}
                    >
                      Open camera & scan QR
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <QrCameraScanner
                        active={cameraOpen && !loading}
                        onScan={handleScan}
                        onError={(msg) => {
                          setError(msg)
                          setCameraOpen(false)
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        onClick={() => setCameraOpen(false)}
                        disabled={loading}
                      >
                        Cancel scan
                      </Button>
                      {loading && (
                        <p className="text-center text-sm text-(--text-muted)">Confirming payment…</p>
                      )}
                    </div>
                  )}
                </>
              )}

              {confirmResult && (
                <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
                  <p className="text-lg font-semibold text-emerald-500">Payment successful</p>
                  <dl className="grid gap-2">
                    <div className="flex justify-between">
                      <dt className="text-(--text-muted)">Paid</dt>
                      <dd>{formatCurrency(confirmResult.amount)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-(--text-muted)">Litres</dt>
                      <dd>{confirmResult.fuelLitres} L</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-(--text-muted)">Balance left</dt>
                      <dd>{formatCurrency(confirmResult.fuelBalanceRemaining)}</dd>
                    </div>
                  </dl>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      setConfirmResult(null)
                      setCameraOpen(false)
                      setError('')
                    }}
                  >
                    Scan another QR
                  </Button>
                </div>
              )}

              <button
                type="button"
                className="text-sm text-(--text-muted) underline"
                onClick={() => setShowDevPaste((v) => !v)}
              >
                {showDevPaste ? 'Hide dev paste fallback' : 'Dev fallback: paste payload'}
              </button>
              {showDevPaste && (
                <div className="space-y-2">
                  <textarea
                    className="min-h-20 w-full rounded-lg border border-(--border) bg-(--bg-primary) px-3 py-2 font-mono text-xs"
                    value={devPayload}
                    onChange={(e) => setDevPayload(e.target.value)}
                    placeholder="Paste qrPayload (desktop testing without camera)"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={!devPayload.trim() || loading}
                    onClick={() => void confirmPayload(devPayload.trim())}
                  >
                    Confirm pasted QR
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>

        <p className="mt-4 text-center text-xs text-(--text-muted)">
          API: {API_BASE}
        </p>
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  API_BASE,
  qrDemoApi,
  type FuelBalanceView,
  type FuelPriceView,
  type QrConfirmResult,
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
import { cn, formatCurrency, formatDateTime } from '../lib/utils'

type Session = {
  token: string
  user: AuthUser
}

const DEFAULT_MERCHANT_EMAIL = ''
const DEFAULT_CUSTOMER_EMAIL = 'nickoklaus5@gmail.com'
const DEFAULT_AMOUNT = '5000'
const DEFAULT_FUEL_PRICE = '1250'

export function TestQrCodePage() {
  const [merchantEmail, setMerchantEmail] = useState(DEFAULT_MERCHANT_EMAIL)
  const [merchantPassword, setMerchantPassword] = useState('')
  const [customerEmail, setCustomerEmail] = useState(DEFAULT_CUSTOMER_EMAIL)
  const [customerPassword, setCustomerPassword] = useState('')
  const [amount, setAmount] = useState(DEFAULT_AMOUNT)
  const [fuelPriceInput, setFuelPriceInput] = useState(DEFAULT_FUEL_PRICE)
  const [merchantNotice, setMerchantNotice] = useState('')

  const [merchantSession, setMerchantSession] = useState<Session | null>(null)
  const [customerSession, setCustomerSession] = useState<Session | null>(null)
  const [fuelPrice, setFuelPrice] = useState<FuelPriceView | null>(null)
  const [customerBalance, setCustomerBalance] = useState<FuelBalanceView | null>(null)

  const [qrResult, setQrResult] = useState<QrDisbursementResult | null>(null)
  const [confirmResult, setConfirmResult] = useState<QrConfirmResult | null>(null)
  const [manualPayload, setManualPayload] = useState('')

  const [merchantError, setMerchantError] = useState('')
  const [customerError, setCustomerError] = useState('')
  const [merchantLoading, setMerchantLoading] = useState(false)
  const [customerLoading, setCustomerLoading] = useState(false)

  const activePayload = manualPayload.trim() || qrResult?.qrPayload || ''

  const flowStep = useMemo(() => {
    if (confirmResult?.status === 'completed') return 4
    if (qrResult) return 3
    if (merchantSession && customerSession) return 2
    if (merchantSession || customerSession) return 1
    return 0
  }, [confirmResult, customerSession, merchantSession, qrResult])

  const refreshCustomerBalance = async (token: string) => {
    const balance = await qrDemoApi.getFuelBalance(token)
    setCustomerBalance(balance)
  }

  const loginMerchant = async () => {
    setMerchantError('')
    setMerchantNotice('')
    setMerchantLoading(true)
    try {
      const data = await qrDemoApi.login(merchantEmail.trim(), merchantPassword)
      const role = data.user.role
      if (role !== 'merchant_admin' && role !== 'merchant_seller' && role !== 'merchant') {
        throw new Error('Use a merchant admin or seller account')
      }
      setMerchantSession({ token: data.accessToken, user: data.user })
      try {
        const price = await qrDemoApi.getMerchantFuelPrice(data.accessToken)
        setFuelPrice(price)
        setFuelPriceInput(String(price.fuelPricePerLitre))
      } catch {
        setFuelPrice(null)
        setMerchantNotice('Fuel price is not set yet. Set it below before generating a QR.')
      }
    } catch (error) {
      setMerchantSession(null)
      setFuelPrice(null)
      setMerchantError(error instanceof Error ? error.message : 'Merchant login failed')
    } finally {
      setMerchantLoading(false)
    }
  }

  const saveFuelPrice = async () => {
    if (!merchantSession) return
    setMerchantError('')
    setMerchantLoading(true)
    try {
      const price = Number(fuelPriceInput)
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error('Enter a valid fuel price per litre')
      }
      const updated = await qrDemoApi.setMerchantFuelPrice(merchantSession.token, price)
      setFuelPrice(updated)
      setMerchantNotice('Fuel price saved. You can generate a QR now.')
    } catch (error) {
      setMerchantError(error instanceof Error ? error.message : 'Failed to set fuel price')
    } finally {
      setMerchantLoading(false)
    }
  }

  const loginCustomer = async () => {
    setCustomerError('')
    setCustomerLoading(true)
    try {
      const data = await qrDemoApi.login(customerEmail.trim(), customerPassword)
      if (data.user.role !== 'customer') {
        throw new Error('Use a customer account')
      }
      setCustomerSession({ token: data.accessToken, user: data.user })
      await refreshCustomerBalance(data.accessToken)
    } catch (error) {
      setCustomerSession(null)
      setCustomerBalance(null)
      setCustomerError(error instanceof Error ? error.message : 'Customer login failed')
    } finally {
      setCustomerLoading(false)
    }
  }

  const generateQr = async () => {
    if (!merchantSession) return
    setMerchantError('')
    setMerchantLoading(true)
    setQrResult(null)
    setConfirmResult(null)
    try {
      const parsedAmount = Number(amount)
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Enter a valid purchase amount')
      }
      const result = await qrDemoApi.initiateQrDisbursement(merchantSession.token, parsedAmount)
      setQrResult(result)
      setManualPayload(result.qrPayload)
    } catch (error) {
      setMerchantError(error instanceof Error ? error.message : 'Failed to generate QR')
    } finally {
      setMerchantLoading(false)
    }
  }

  const confirmPayment = async () => {
    if (!customerSession || !activePayload) return
    setCustomerError('')
    setCustomerLoading(true)
    try {
      const result = await qrDemoApi.confirmQrPayment(customerSession.token, activePayload)
      setConfirmResult(result)
      await refreshCustomerBalance(customerSession.token)
    } catch (error) {
      setCustomerError(error instanceof Error ? error.message : 'Payment failed')
    } finally {
      setCustomerLoading(false)
    }
  }

  const resetFlow = () => {
    setQrResult(null)
    setConfirmResult(null)
    setManualPayload('')
    setMerchantError('')
    setCustomerError('')
  }

  return (
    <div className="min-h-screen bg-(--bg-primary) p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="QR Disbursement Demo"
          description="Simulate the merchant POS QR flow and customer scan-to-pay in one screen."
          actions={
            <Link
              to="/"
              className="text-sm font-medium text-emerald-500 hover:text-emerald-400"
            >
              ← Back to admin
            </Link>
          }
        />

        <Card className="mb-6 p-4">
          <div className="space-y-3">
            <p className="text-sm font-medium text-(--text-primary)">Flow progress</p>
            <div className="grid gap-2 sm:grid-cols-4">
              {[
                'Sign in merchant & customer',
                'Generate QR at station',
                'Customer scans / pays',
                'Purchase completed',
              ].map((label, index) => (
                <div
                  key={label}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-xs',
                    flowStep >= index
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
                      : 'border-(--border) text-(--text-muted)',
                  )}
                >
                  <span className="font-semibold">{index + 1}. </span>
                  {label}
                </div>
              ))}
            </div>
            <p className="text-xs text-(--text-muted)">
              API: <code className="rounded bg-(--bg-hover) px-1">{API_BASE}</code> — Merchant must
              have fuel price set. Customer needs KYC + active loan + fuel balance (
              <code className="rounded bg-(--bg-hover) px-1">npm run seed:test-user</code>).
            </p>
          </div>
        </Card>

        {activePayload && (
          <Card className="mb-6 border-emerald-500/40 bg-emerald-500/5 p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div>
                <p className="text-lg font-semibold text-(--text-primary)">Live QR code</p>
                <p className="text-sm text-(--text-muted)">
                  Customer scans this or clicks Scan &amp; pay on the right
                </p>
              </div>
              <QrCodeDisplay value={activePayload} size={280} />
              {qrResult && (
                <div className="grid w-full max-w-md gap-2 text-sm sm:grid-cols-2">
                  <p>
                    <span className="text-(--text-muted)">Amount: </span>
                    <strong>{formatCurrency(qrResult.amount)}</strong>
                  </p>
                  <p>
                    <span className="text-(--text-muted)">Litres: </span>
                    <strong>{qrResult.fuelLitres} L</strong>
                  </p>
                  <p className="sm:col-span-2">
                    <span className="text-(--text-muted)">Expires: </span>
                    {formatDateTime(qrResult.expiresAt)}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="flex items-start justify-between border-b border-(--border) px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-(--text-primary)">🏪 Merchant (POS)</h2>
                <p className="text-sm text-(--text-muted)">Generates the QR for the customer to scan</p>
              </div>
              {merchantSession && <StatusBadge status="active" />}
            </div>
            <div className="space-y-4 p-5">
              {!merchantSession ? (
                <>
                  {merchantError && <ErrorMessage message={merchantError} />}
                  <FormField label="Merchant email">
                    <Input
                      type="email"
                      value={merchantEmail}
                      onChange={(e) => setMerchantEmail(e.target.value)}
                      placeholder="merchant@station.com"
                    />
                  </FormField>
                  <FormField label="Password">
                    <Input
                      type="password"
                      value={merchantPassword}
                      onChange={(e) => setMerchantPassword(e.target.value)}
                    />
                  </FormField>
                  <Button className="w-full" onClick={loginMerchant} disabled={merchantLoading}>
                    {merchantLoading ? 'Signing in…' : 'Sign in as merchant'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="rounded-lg bg-(--bg-hover) p-3 text-sm">
                    <p className="font-medium text-(--text-primary)">
                      {merchantSession.user.firstName} {merchantSession.user.lastName}
                    </p>
                    <p className="text-(--text-muted)">{merchantSession.user.email}</p>
                    <p className="mt-1 text-xs capitalize text-(--text-secondary)">
                      Role: {merchantSession.user.role.replace(/_/g, ' ')}
                    </p>
                    {fuelPrice && (
                      <p className="mt-2 text-(--text-secondary)">
                        Fuel price: {formatCurrency(fuelPrice.fuelPricePerLitre)}/L
                      </p>
                    )}
                  </div>

                  {merchantNotice && (
                    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-600">
                      {merchantNotice}
                    </p>
                  )}

                  {merchantError && <ErrorMessage message={merchantError} />}

                  {!fuelPrice && (
                    <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                      <p className="text-sm font-medium text-(--text-primary)">Set fuel price (required)</p>
                      <FormField label="Price per litre (NGN)">
                        <Input
                          type="number"
                          min={1}
                          value={fuelPriceInput}
                          onChange={(e) => setFuelPriceInput(e.target.value)}
                        />
                      </FormField>
                      <Button type="button" variant="secondary" onClick={saveFuelPrice} disabled={merchantLoading}>
                        Save fuel price
                      </Button>
                    </div>
                  )}

                  <FormField label="Purchase amount (NGN)">
                    <Input
                      type="number"
                      min={1}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </FormField>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={generateQr} disabled={merchantLoading || !fuelPrice}>
                      {merchantLoading ? 'Generating…' : 'Generate QR code'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={resetFlow}>
                      Reset QR
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setMerchantSession(null)
                        setFuelPrice(null)
                        resetFlow()
                      }}
                    >
                      Log out
                    </Button>
                  </div>

                  {qrResult && (
                    <div className="space-y-3 rounded-xl border border-(--border) p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-(--text-primary)">Transaction created</p>
                        <StatusBadge status={qrResult.status} />
                      </div>
                      <dl className="grid gap-2 text-sm">
                        <div className="flex justify-between gap-4">
                          <dt className="text-(--text-muted)">Transaction</dt>
                          <dd className="font-mono text-xs text-(--text-primary)">
                            {qrResult.transactionId}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-(--text-muted)">Amount</dt>
                          <dd className="text-(--text-primary)">{formatCurrency(qrResult.amount)}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-(--text-muted)">Litres</dt>
                          <dd className="text-(--text-primary)">{qrResult.fuelLitres} L</dd>
                        </div>
                      </dl>
                      <p className="break-all rounded bg-(--bg-hover) p-2 font-mono text-[10px] text-(--text-secondary)">
                        {qrResult.qrPayload}
                      </p>
                    </div>
                  )}

                  {confirmResult && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500">
                      Customer paid {formatCurrency(confirmResult.amount)} — transaction{' '}
                      {confirmResult.transactionId} is {confirmResult.status}.
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between border-b border-(--border) px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-(--text-primary)">📱 Customer (app)</h2>
                <p className="text-sm text-(--text-muted)">Simulates scanning the QR and confirming payment</p>
              </div>
              {customerSession && <StatusBadge status="active" />}
            </div>
            <div className="space-y-4 p-5">
              {!customerSession ? (
                <>
                  {customerError && <ErrorMessage message={customerError} />}
                  <FormField label="Customer email">
                    <Input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@example.com"
                    />
                  </FormField>
                  <FormField label="Password">
                    <Input
                      type="password"
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                    />
                  </FormField>
                  <Button className="w-full" onClick={loginCustomer} disabled={customerLoading}>
                    {customerLoading ? 'Signing in…' : 'Sign in as customer'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="rounded-lg bg-(--bg-hover) p-3 text-sm">
                    <p className="font-medium text-(--text-primary)">
                      {customerSession.user.firstName} {customerSession.user.lastName}
                    </p>
                    <p className="text-(--text-muted)">{customerSession.user.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge status={customerSession.user.isKycVerified ? 'approved' : 'pending'} />
                      {customerBalance && (
                        <span className="text-(--text-secondary)">
                          Fuel credit: {formatCurrency(customerBalance.balance)}
                        </span>
                      )}
                    </div>
                  </div>

                  {customerError && <ErrorMessage message={customerError} />}

                  <FormField label="QR payload (auto-filled when merchant generates)">
                    <textarea
                      className="min-h-24 w-full rounded-lg border border-(--border) bg-(--bg-primary) px-3 py-2 font-mono text-xs text-(--text-primary) outline-none focus:border-emerald-500"
                      value={manualPayload}
                      onChange={(e) => setManualPayload(e.target.value)}
                      placeholder="Paste qrPayload here or generate from merchant panel"
                    />
                  </FormField>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={confirmPayment}
                      disabled={customerLoading || !activePayload}
                    >
                      {customerLoading ? 'Processing…' : 'Scan & pay (confirm QR)'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => refreshCustomerBalance(customerSession.token)}
                      disabled={customerLoading}
                    >
                      Refresh balance
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setCustomerSession(null)
                        setCustomerBalance(null)
                        setConfirmResult(null)
                        setCustomerError('')
                      }}
                    >
                      Log out
                    </Button>
                  </div>

                  {!qrResult && (
                    <p className="text-sm text-(--text-muted)">
                      Generate a QR on the merchant side first, then click{' '}
                      <strong>Scan & pay</strong> here.
                    </p>
                  )}

                  {confirmResult && (
                    <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
                      <p className="font-semibold text-emerald-500">Payment successful</p>
                      <dl className="grid gap-2">
                        <div className="flex justify-between gap-4">
                          <dt className="text-(--text-muted)">Paid</dt>
                          <dd>{formatCurrency(confirmResult.amount)}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-(--text-muted)">Litres</dt>
                          <dd>{confirmResult.fuelLitres} L</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-(--text-muted)">Fuel balance left</dt>
                          <dd>{formatCurrency(confirmResult.fuelBalanceRemaining)}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-(--text-muted)">Interest added</dt>
                          <dd>{formatCurrency(confirmResult.interestAdded)}</dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

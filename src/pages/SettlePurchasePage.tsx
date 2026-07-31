import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { adminApi } from '../api/admin'
import { getApiErrorMessage } from '../api/client'
import {
  Button,
  Card,
  ErrorMessage,
  FormField,
  Input,
  KpiCard,
  PageHeader,
  Spinner,
  Textarea,
} from '../components/ui'
import { useToast } from '../components/ui/Toast'
import { formatCurrency, formatDate } from '../lib/utils'
import type { AdminUserOutstanding, AdminUserSummary } from '../types/api'

const SETTLE_CODE = '1319'
const SETTLE_UNLOCK_KEY = 'fuelcredit_settle_unlock'

function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(SETTLE_UNLOCK_KEY) === '1'
  } catch {
    return false
  }
}

type SettlementPreview = {
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  walletBalance: number
  outstanding: AdminUserOutstanding
}

export function SettlePurchasePage() {
  const toast = useToast()
  const [unlocked, setUnlocked] = useState(isUnlocked)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [note, setNote] = useState('')

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', 'settle-search', search],
    queryFn: () => adminApi.users({ page: 1, limit: 8, search: search || undefined, role: 'customer' }),
    enabled: unlocked && search.trim().length >= 2,
  })

  const previewQuery = useQuery({
    queryKey: ['admin', 'users', selectedUserId, 'settlement'],
    queryFn: () => adminApi.getUserSettlement(selectedUserId),
    enabled: unlocked && !!selectedUserId,
  })

  const preview = previewQuery.data as SettlementPreview | undefined
  const outstanding = preview?.outstanding
  const owed =
    outstanding && outstanding.hasActiveLoan ? outstanding.outstandingBalance : 0

  const settleMutation = useMutation({
    mutationFn: () => {
      const currentOwed =
        previewQuery.data?.outstanding?.hasActiveLoan
          ? previewQuery.data.outstanding.outstandingBalance
          : 0
      if (!currentOwed || currentOwed <= 0) {
        return Promise.reject(new Error('Nothing outstanding to settle'))
      }
      return adminApi.settleUserPurchase(selectedUserId, {
        amount: currentOwed,
        note: note.trim() || undefined,
      })
    },
    onSuccess: (result) => {
      toast.success(result.message)
      setNote('')
      void previewQuery.refetch()
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Settlement failed')),
  })

  const canSettle = !!selectedUserId && owed > 0 && !settleMutation.isPending

  const unlock = () => {
    if (code.trim() !== SETTLE_CODE) {
      setCodeError('Incorrect access code')
      return
    }
    try {
      sessionStorage.setItem(SETTLE_UNLOCK_KEY, '1')
    } catch {
      /* ignore */
    }
    setCodeError('')
    setUnlocked(true)
  }

  const lock = () => {
    try {
      sessionStorage.removeItem(SETTLE_UNLOCK_KEY)
    } catch {
      /* ignore */
    }
    setUnlocked(false)
    setCode('')
    setSelectedUserId('')
    setSearch('')
  }

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-md pt-10">
        <PageHeader
          title="Settle purchase"
          description="Restricted tools — enter the access code to continue."
        />
        <Card className="p-6">
          {codeError && <ErrorMessage message={codeError} />}
          <FormField label="Access code">
            <Input
              type="password"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') unlock()
              }}
              placeholder="Enter code"
              autoFocus
            />
          </FormField>
          <Button className="mt-2 w-full" onClick={unlock}>
            Unlock
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Settle purchase"
        description="Credit a customer wallet and apply it to their outstanding fuel purchase so they can buy again."
        actions={
          <Button variant="secondary" size="sm" onClick={lock}>
            Lock
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-(--text-primary)">Find customer</h2>
          <FormField label="Search by name, email, or phone">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type at least 2 characters…"
            />
          </FormField>
          {usersQuery.isFetching && <Spinner />}
          <div className="mt-2 space-y-2">
            {(usersQuery.data?.items ?? []).map((user: AdminUserSummary) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  setSelectedUserId(user.id)
                }}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition ${
                  selectedUserId === user.id
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-(--border) hover:bg-(--bg-hover)'
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-(--text-primary)">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-(--text-muted)">{user.email}</p>
                </div>
                <Link
                  to={`/users/${user.id}`}
                  className="text-xs text-emerald-500 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Profile
                </Link>
              </button>
            ))}
            {search.trim().length >= 2 &&
              !usersQuery.isFetching &&
              (usersQuery.data?.items.length ?? 0) === 0 && (
                <p className="text-sm text-(--text-muted)">No customers found.</p>
              )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-(--text-primary)">Outstanding</h2>
          {!selectedUserId && (
            <p className="text-sm text-(--text-muted)">Select a customer to see what they owe.</p>
          )}
          {selectedUserId && previewQuery.isLoading && <Spinner />}
          {preview && (
            <>
              <p className="mb-4 text-sm text-(--text-secondary)">
                {preview.user.firstName} {preview.user.lastName} · {preview.user.email}
              </p>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <KpiCard
                  label="Amount owed"
                  value={owed > 0 ? formatCurrency(owed) : '—'}
                  sub={
                    outstanding?.hasActiveLoan
                      ? `Due ${formatDate(outstanding.dueDate)}`
                      : 'Nothing outstanding'
                  }
                  accent={owed > 0 ? 'amber' : 'green'}
                />
                <KpiCard
                  label="Wallet balance"
                  value={formatCurrency(preview.walletBalance)}
                  sub="Before this settlement"
                  accent="blue"
                />
              </div>
              {outstanding?.hasActiveLoan && (
                <dl className="mb-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-(--text-muted)">Fuel / principal</dt>
                    <dd>{formatCurrency(outstanding.principalAmount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-(--text-muted)">Service charge</dt>
                    <dd>{formatCurrency(outstanding.interestAmount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-(--text-muted)">Already repaid</dt>
                    <dd>{formatCurrency(outstanding.amountRepaid)}</dd>
                  </div>
                </dl>
              )}
              {owed > 0 ? (
                <>
                  <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-(--text-secondary)">
                    Full settlement only — this will clear the entire ₦{owed.toLocaleString()} owed.
                  </p>
                  <FormField label="Note (optional)">
                    <Textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Customer paid via transfer reference…"
                    />
                  </FormField>
                  <Button
                    className="mt-2 w-full"
                    disabled={!canSettle}
                    onClick={() => settleMutation.mutate()}
                  >
                    {settleMutation.isPending
                      ? 'Settling…'
                      : `Settle full amount (${formatCurrency(owed)})`}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-emerald-500">No outstanding purchase for this customer.</p>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

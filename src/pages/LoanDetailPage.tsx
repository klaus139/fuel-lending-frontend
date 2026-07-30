import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api/admin'
import {
  Button,
  Card,
  FormField,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatusBadge,
  ErrorMessage,
} from '../components/ui'
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '../lib/utils'

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-(--border) py-2.5 last:border-0">
      <span className="text-sm text-(--text-muted)">{label}</span>
      <span className="text-right text-sm font-medium text-(--text-primary)">{value}</span>
    </div>
  )
}

export function LoanDetailPage() {
  const { loanId = '' } = useParams()
  const qc = useQueryClient()
  const [closeOpen, setCloseOpen] = useState(false)
  const [closeNote, setCloseNote] = useState('')
  const [closeResolution, setCloseResolution] = useState<'repaid' | 'defaulted'>('repaid')
  const [banner, setBanner] = useState<string | null>(null)

  const { data: loan, isLoading, error } = useQuery({
    queryKey: ['admin', 'loan', loanId],
    queryFn: () => adminApi.getLoan(loanId),
    enabled: !!loanId,
  })

  const { data: repayments } = useQuery({
    queryKey: ['admin', 'repayments', loanId],
    queryFn: () => adminApi.repayments({ loanId, page: 1, limit: 50 }),
    enabled: !!loanId,
  })

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'loan', loanId] })
    void qc.invalidateQueries({ queryKey: ['admin', 'loans'] })
    void qc.invalidateQueries({ queryKey: ['admin', 'repayments', loanId] })
    void qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
  }

  const closeMutation = useMutation({
    mutationFn: () => adminApi.closeLoan(loanId, closeResolution, closeNote),
    onSuccess: () => {
      invalidate()
      setCloseOpen(false)
      setBanner('Purchase closed')
    },
  })

  const repayMutation = useMutation({
    mutationFn: () => adminApi.triggerLoanRepayment(loanId),
    onSuccess: (result) => {
      invalidate()
      setBanner(result.message)
    },
  })

  const reminderMutation = useMutation({
    mutationFn: () => adminApi.sendLoanReminder(loanId),
    onSuccess: (result) => {
      setBanner(`Reminder sent to ${result.email}`)
    },
  })

  if (isLoading) return <Spinner />
  if (error || !loan) {
    return <ErrorMessage message="Unable to load purchase" />
  }

  const { breakdown, customer } = loan
  const history = [...(loan.statusHistory ?? [])].reverse()
  const canOperate = ['active', 'partially_repaid', 'defaulted'].includes(loan.status)

  return (
    <div>
      <PageHeader
        title={`${customer.firstName} ${customer.lastName}`}
        description={`Purchase ${loan.id} · ${formatCurrency(breakdown.amountToPay)} to repay`}
        actions={
          <>
            <Link to="/loans/manage">
              <Button variant="ghost" size="sm">
                Back to manage
              </Button>
            </Link>
            <Link to={`/users/${customer.id}`}>
              <Button variant="secondary" size="sm">
                Customer profile
              </Button>
            </Link>
          </>
        }
      />

      {banner && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          {banner}
          <button type="button" className="ml-3 underline" onClick={() => setBanner(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {canOperate && (
          <>
            <Button
              onClick={() => repayMutation.mutate()}
              disabled={repayMutation.isPending || loan.outstandingBalance <= 0}
            >
              {repayMutation.isPending ? 'Repaying…' : 'Trigger wallet repayment'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => reminderMutation.mutate()}
              disabled={reminderMutation.isPending}
            >
              {reminderMutation.isPending ? 'Sending…' : 'Send reminder'}
            </Button>
            <Button variant="danger" onClick={() => setCloseOpen(true)}>
              Close purchase
            </Button>
          </>
        )}
      </div>

      {(closeMutation.error || repayMutation.error || reminderMutation.error) && (
        <div className="mb-4">
          <ErrorMessage
            message={
              (closeMutation.error as Error)?.message ||
              (repayMutation.error as Error)?.message ||
              (reminderMutation.error as Error)?.message ||
              'Action failed'
            }
          />
        </div>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
            Lifecycle
          </h3>
          <div className="rounded-lg border border-(--border) px-4">
            <DetailRow label="API status" value={<StatusBadge status={loan.status} />} />
            <DetailRow
              label="Canonical FSM"
              value={
                <StatusBadge status={String(loan.canonicalStatus ?? '—').replace(/_/g, ' ')} />
              }
            />
            <DetailRow
              label="DPD bucket"
              value={loan.dpdBucket ? <StatusBadge status={String(loan.dpdBucket)} /> : '—'}
            />
            <DetailRow label="Version" value={String(loan.version ?? 0)} />
            <DetailRow label="Due date" value={formatDate(loan.dueDate)} />
            <DetailRow
              label="Disbursed"
              value={loan.disbursedAt ? formatDateTime(loan.disbursedAt) : '—'}
            />
            <DetailRow label="Created" value={formatDateTime(loan.createdAt)} />
          </div>
          {loan.rejectReason && (
            <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400">
              {loan.rejectReason}
            </p>
          )}
        </Card>

        <Card className="p-5 lg:col-span-1">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
            Customer
          </h3>
          <div className="rounded-lg border border-(--border) px-4">
            <DetailRow label="Name" value={`${customer.firstName} ${customer.lastName}`} />
            <DetailRow label="Email" value={customer.email} />
            <DetailRow label="Phone" value={customer.phone} />
          </div>
        </Card>

        <Card className="p-5 lg:col-span-1">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
            Balances
          </h3>
          <div className="rounded-lg border border-(--border) px-4">
            <DetailRow label="Outstanding" value={formatCurrency(loan.outstandingBalance)} />
            <DetailRow label="Total owed" value={formatCurrency(breakdown.totalOwed)} />
            <DetailRow label="Repaid" value={formatCurrency(loan.amountRepaid)} />
            <DetailRow
              label="Service charge"
              value={formatCurrency(loan.serviceChargeAmount ?? loan.interestAmount)}
            />
            <DetailRow
              label="Overdue interest"
              value={formatCurrency(loan.overdueInterestAmount ?? breakdown.overdueInterest ?? 0)}
            />
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
            Fuel credit
          </h3>
          <div className="rounded-lg border border-(--border) px-4">
            <DetailRow label="Credit limit" value={formatCurrency(breakdown.creditLimit)} />
            <DetailRow label="Disbursed" value={formatCurrency(breakdown.amountDisbursed)} />
            <DetailRow label="Spent" value={formatCurrency(breakdown.amountSpent)} />
            <DetailRow label="Unspent" value={formatCurrency(breakdown.amountUnspent)} />
            <DetailRow
              label="Litres"
              value={`${formatNumber(breakdown.litresConsumed, 2)} L`}
            />
            <DetailRow
              label="Service charge / L"
              value={formatCurrency(loan.serviceChargePerLitre ?? loan.interestPerLitre)}
            />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
            State history
          </h3>
          {history.length === 0 ? (
            <p className="text-sm text-(--text-muted)">No FSM history recorded yet.</p>
          ) : (
            <ol className="space-y-3">
              {history.map((entry, index) => (
                <li
                  key={`${entry.at}-${index}`}
                  className="rounded-lg border border-(--border) px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-(--text-primary)">
                      {entry.from.replace(/_/g, ' ')} → {entry.to.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-(--text-muted)">{formatDateTime(entry.at)}</p>
                  </div>
                  {(entry.reason || entry.actorId) && (
                    <p className="mt-1 text-xs text-(--text-secondary)">
                      {entry.reason ?? '—'}
                      {entry.actorId ? ` · actor ${entry.actorId}` : ''}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
          Repayment history
        </h3>
        {(repayments?.items ?? []).length === 0 ? (
          <p className="text-sm text-(--text-muted)">No repayments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-(--text-muted)">
                <tr>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Overdue</th>
                  <th className="pb-2 pr-4">Service</th>
                  <th className="pb-2 pr-4">Principal</th>
                  <th className="pb-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {(repayments?.items ?? []).map((row) => (
                  <tr key={row.id} className="border-t border-(--border)">
                    <td className="py-2.5 pr-4">{formatDateTime(row.createdAt)}</td>
                    <td className="py-2.5 pr-4">{formatCurrency(row.amount)}</td>
                    <td className="py-2.5 pr-4">
                      {formatCurrency(row.overdueInterestPortion ?? 0)}
                    </td>
                    <td className="py-2.5 pr-4">
                      {formatCurrency(row.serviceChargePortion ?? 0)}
                    </td>
                    <td className="py-2.5 pr-4">{formatCurrency(row.principalPortion)}</td>
                    <td className="py-2.5">{row.source.replace(/_/g, ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={closeOpen} onClose={() => setCloseOpen(false)} title="Close purchase">
        <FormField label="Resolution">
          <Select
            value={closeResolution}
            onChange={(e) => setCloseResolution(e.target.value as 'repaid' | 'defaulted')}
          >
            <option value="repaid">Mark repaid</option>
            <option value="defaulted">Mark defaulted / write-off</option>
          </Select>
        </FormField>
        <FormField label="Note">
          <Input value={closeNote} onChange={(e) => setCloseNote(e.target.value)} />
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCloseOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => closeMutation.mutate()}
            disabled={closeMutation.isPending}
          >
            Confirm close
          </Button>
        </div>
      </Modal>
    </div>
  )
}

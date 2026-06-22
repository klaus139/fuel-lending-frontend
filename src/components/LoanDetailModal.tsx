import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Modal, StatusBadge } from './ui'
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '../lib/utils'
import type { AdminLoanListItem, AdminOverdueLoanItem } from '../types/api'

type LoanDetail = AdminLoanListItem | AdminOverdueLoanItem

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-(--border) py-2.5 last:border-0">
      <span className="text-sm text-(--text-muted)">{label}</span>
      <span className="text-right text-sm font-medium text-(--text-primary)">{value}</span>
    </div>
  )
}

export function LoanDetailModal({
  loan,
  onClose,
}: {
  loan: LoanDetail | null
  onClose: () => void
}) {
  if (!loan) return null

  const { breakdown, customer } = loan
  const daysOverdue = 'daysOverdue' in loan ? loan.daysOverdue : 0

  return (
    <Modal open={!!loan} onClose={onClose} title="Loan details" wide>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
            Customer
          </h3>
          <div className="rounded-lg border border-(--border) px-4">
            <DetailRow
              label="Name"
              value={`${customer.firstName} ${customer.lastName}`}
            />
            <DetailRow label="Email" value={customer.email} />
            <DetailRow label="Phone" value={customer.phone} />
            <DetailRow
              label="Profile"
              value={
                <Link to={`/users/${customer.id}`} className="text-emerald-500 hover:underline">
                  View user
                </Link>
              }
            />
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
            Loan status
          </h3>
          <div className="rounded-lg border border-(--border) px-4">
            <DetailRow label="Status" value={<StatusBadge status={loan.status} />} />
            <DetailRow label="Due date" value={formatDate(loan.dueDate)} />
            {daysOverdue > 0 && (
              <DetailRow label="Days overdue" value={`${daysOverdue} days`} />
            )}
            <DetailRow
              label="Disbursed at"
              value={loan.disbursedAt ? formatDateTime(loan.disbursedAt) : '—'}
            />
            <DetailRow label="Tenure" value={`${loan.tenureDays} days`} />
            <DetailRow label="Created" value={formatDateTime(loan.createdAt)} />
          </div>
        </section>

        <section className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
            Fuel credit breakdown
          </h3>
          <div className="rounded-lg border border-(--border) px-4">
            <DetailRow label="Credit limit" value={formatCurrency(breakdown.creditLimit)} />
            <DetailRow label="Disbursed" value={formatCurrency(breakdown.amountDisbursed)} />
            <DetailRow label="Spent" value={formatCurrency(breakdown.amountSpent)} />
            <DetailRow label="Unspent" value={formatCurrency(breakdown.amountUnspent)} />
            <DetailRow
              label="Litres consumed"
              value={`${formatNumber(breakdown.litresConsumed, 2)} L`}
            />
            <DetailRow
              label="Interest per litre"
              value={formatCurrency(loan.interestPerLitre)}
            />
            <DetailRow
              label="Interest accrued"
              value={formatCurrency(breakdown.interestAccrued)}
            />
          </div>
        </section>

        <section className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
            Repayment
          </h3>
          <div className="rounded-lg border border-(--border) px-4">
            <DetailRow label="Total owed" value={formatCurrency(breakdown.totalOwed)} />
            <DetailRow label="Amount repaid" value={formatCurrency(loan.amountRepaid)} />
            <DetailRow
              label="Amount to pay"
              value={
                <span className="text-amber-500">{formatCurrency(breakdown.amountToPay)}</span>
              }
            />
          </div>
        </section>

        {loan.rejectReason && (
          <section className="lg:col-span-2">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
              Rejection
            </h3>
            <p className="rounded-lg border border-(--border) px-4 py-3 text-sm text-(--text-secondary)">
              {loan.rejectReason}
            </p>
          </section>
        )}
      </div>
    </Modal>
  )
}

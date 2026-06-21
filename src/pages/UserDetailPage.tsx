import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api/admin'
import {
  Button,
  Card,
  ErrorMessage,
  FormField,
  Input,
  KpiCard,
  PageHeader,
  Select,
  Spinner,
  StatusBadge,
  Textarea,
} from '../components/ui'
import { cn, formatCurrency, formatDate, formatDateTime, formatNumber } from '../lib/utils'
import type { SupportTopic } from '../types/api'

const MESSAGE_TOPICS: { value: SupportTopic; label: string }[] = [
  { value: 'credit_issue', label: 'Credit issue' },
  { value: 'loan_issue', label: 'Loan issue' },
  { value: 'fuel_disbursement', label: 'Fuel disbursement' },
  { value: 'repayment', label: 'Repayment' },
  { value: 'other', label: 'Other' },
]

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-(--border) py-2 last:border-0">
      <span className="text-sm text-(--text-muted)">{label}</span>
      <span className="text-right text-sm font-medium text-(--text-primary)">{value}</span>
    </div>
  )
}

export function UserDetailPage() {
  const { userId = '' } = useParams()
  const qc = useQueryClient()
  const [loansPage, setLoansPage] = useState(1)
  const [txPage, setTxPage] = useState(1)
  const [repayPage, setRepayPage] = useState(1)
  const [messageTopic, setMessageTopic] = useState<SupportTopic>('other')
  const [messageSubject, setMessageSubject] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [messageError, setMessageError] = useState('')
  const [messageSuccess, setMessageSuccess] = useState('')

  const { data: overview, isLoading, error } = useQuery({
    queryKey: ['admin', 'users', userId, 'overview'],
    queryFn: () => adminApi.getUserOverview(userId),
    enabled: !!userId,
  })

  const { data: loans } = useQuery({
    queryKey: ['admin', 'users', userId, 'loans', loansPage],
    queryFn: () => adminApi.getUserLoans(userId, loansPage, 5),
    enabled: !!userId,
  })

  const { data: transactions } = useQuery({
    queryKey: ['admin', 'users', userId, 'transactions', txPage],
    queryFn: () => adminApi.getUserTransactions(userId, txPage, 5),
    enabled: !!userId,
  })

  const { data: repayments } = useQuery({
    queryKey: ['admin', 'users', userId, 'repayments', repayPage],
    queryFn: () => adminApi.repayments({ userId, page: repayPage, limit: 5 }),
    enabled: !!userId,
  })

  const messageMutation = useMutation({
    mutationFn: () =>
      adminApi.sendUserMessage(userId, {
        message: messageBody,
        topic: messageTopic,
        subject: messageSubject || undefined,
      }),
    onSuccess: (ticket) => {
      setMessageError('')
      setMessageSuccess(`Message sent — ticket #${ticket.id.slice(-6)}`)
      setMessageBody('')
      setMessageSubject('')
      qc.invalidateQueries({ queryKey: ['admin', 'support'] })
    },
    onError: (err: Error) => {
      setMessageSuccess('')
      setMessageError(err.message)
    },
  })

  if (isLoading) return <Spinner />
  if (error || !overview) {
    return (
      <div>
        <Link to="/users" className="mb-4 inline-block text-sm text-emerald-500 hover:underline">
          ← Back to users
        </Link>
        <ErrorMessage message={error instanceof Error ? error.message : 'User not found'} />
      </div>
    )
  }

  const { profile, kyc, tier, fuelBalance, wallet, outstanding, activeLoan, nextPayment, creditRating, stats } =
    overview

  return (
    <div>
      <Link to="/users" className="mb-4 inline-block text-sm text-emerald-500 hover:underline">
        ← Back to users
      </Link>

      <PageHeader
        title={`${profile.firstName} ${profile.lastName}`}
        description={profile.email}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={profile.role} />
            <StatusBadge status={profile.accountStatus} />
            {profile.isKycVerified && (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-500">
                KYC verified
              </span>
            )}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Credit limit"
          value={formatCurrency(tier?.creditLimit ?? creditRating?.creditLimit ?? 0)}
          sub={tier ? `${tier.currentTier.name} (${tier.currentTier.code})` : 'No tier assigned'}
          accent="blue"
        />
        <KpiCard
          label="Fuel balance"
          value={formatCurrency(fuelBalance.balance)}
          sub={`${formatNumber(fuelBalance.totalLitresPurchased, 1)} L purchased`}
          accent="green"
        />
        <KpiCard
          label="Outstanding"
          value={
            outstanding.hasActiveLoan
              ? formatCurrency(outstanding.outstandingBalance)
              : '—'
          }
          sub={
            outstanding.hasActiveLoan
              ? `Due ${formatDate(outstanding.dueDate)}`
              : 'No active loan'
          }
          accent={outstanding.hasActiveLoan ? 'amber' : undefined}
        />
        <KpiCard
          label="Next payment"
          value={nextPayment ? formatCurrency(nextPayment.amount) : '—'}
          sub={nextPayment ? `Due ${formatDate(nextPayment.dueDate)}` : 'No payment due'}
          accent="amber"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-(--text-primary)">Profile</h2>
          <DetailRow label="Phone" value={profile.phone} />
          <DetailRow label="Email verified" value={profile.isEmailVerified ? 'Yes' : 'No'} />
          <DetailRow label="Joined" value={formatDate(profile.createdAt)} />
          <DetailRow
            label="Loans"
            value={`${stats.repaidLoans} repaid / ${stats.totalLoans} total`}
          />
          <DetailRow label="Fuel purchases" value={String(stats.completedFuelPurchases)} />
          {tier && (
            <DetailRow
              label="Payment card"
              value={tier.hasPaymentCard ? 'On file' : 'Not added'}
            />
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-(--text-primary)">Credit rating</h2>
          {creditRating ? (
            <>
              <DetailRow
                label="Decision"
                value={<StatusBadge status={creditRating.decision} />}
              />
              <DetailRow
                label="Approved principal"
                value={formatCurrency(creditRating.approvedPrincipal)}
              />
              <DetailRow
                label="Evaluated"
                value={formatDate(creditRating.evaluatedAt)}
              />
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-(--text-muted)">
                  Checks
                </p>
                {creditRating.checks.map((check) => (
                  <div
                    key={check.code}
                    className={cn(
                      'rounded-lg px-3 py-2 text-xs',
                      check.passed
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-red-500/10 text-red-400',
                    )}
                  >
                    <span className="font-medium">{check.code}</span>
                    <span className="ml-2 text-(--text-secondary)">{check.message}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-(--text-muted)">No credit evaluation on record.</p>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-(--text-primary)">KYC</h2>
          {!kyc ? (
            <p className="text-sm text-(--text-muted)">KYC not submitted.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <DetailRow label="Status" value={<StatusBadge status={kyc.status} />} />
                {kyc.rejectReason && (
                  <DetailRow label="Reject reason" value={kyc.rejectReason} />
                )}
                <DetailRow label="Date of birth" value={kyc.dateOfBirth ?? '—'} />
                <DetailRow
                  label="Address"
                  value={[kyc.address, kyc.city, kyc.lga, kyc.state].filter(Boolean).join(', ') || '—'}
                />
                <DetailRow label="Motor type" value={kyc.motorType ?? '—'} />
                <DetailRow label="Registration" value={kyc.motorRegistrationNumber ?? '—'} />
                {kyc.verification && (
                  <DetailRow
                    label="Identity"
                    value={`NIN ${kyc.verification.ninVerified ? '✓' : '✗'} · BVN ${kyc.verification.bvnVerified ? '✓' : '✗'}`}
                  />
                )}
                <DetailRow label="Submitted" value={formatDate(kyc.submittedAt)} />
              </div>
              <div className="flex gap-4">
                {kyc.photoUrl && (
                  <div>
                    <p className="mb-2 text-xs text-(--text-muted)">Selfie</p>
                    <img
                      src={kyc.photoUrl}
                      alt="KYC selfie"
                      className="h-36 w-36 rounded-lg border border-(--border) object-cover"
                    />
                  </div>
                )}
                {kyc.motorPhotoUrl && (
                  <div>
                    <p className="mb-2 text-xs text-(--text-muted)">Vehicle</p>
                    <img
                      src={kyc.motorPhotoUrl}
                      alt="Vehicle"
                      className="h-36 w-36 rounded-lg border border-(--border) object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-(--text-primary)">Repayment account</h2>
          {!wallet ? (
            <p className="text-sm text-(--text-muted)">No virtual account provisioned.</p>
          ) : (
            <>
              <DetailRow label="Bank" value={wallet.virtualAccount.bankName} />
              <DetailRow label="Account number" value={wallet.virtualAccount.accountNumber} />
              <DetailRow label="Account name" value={wallet.virtualAccount.accountName} />
              <DetailRow label="Provider" value={wallet.virtualAccount.provider} />
              <DetailRow label="Wallet balance" value={formatCurrency(wallet.balance)} />
              {wallet.recentTransactions.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-(--text-muted)">
                    Recent wallet activity
                  </p>
                  <div className="space-y-2">
                    {wallet.recentTransactions.slice(0, 3).map((tx) => (
                      <div
                        key={tx.id}
                        className="flex justify-between rounded-lg bg-(--bg-hover) px-3 py-2 text-xs"
                      >
                        <span className="text-(--text-secondary)">{tx.description ?? tx.type}</span>
                        <span className="font-medium text-(--text-primary)">
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-(--text-primary)">Send message</h2>
          <p className="mb-4 text-sm text-(--text-secondary)">
            Creates a support ticket and notifies the customer in-app.
          </p>
          {messageSuccess && (
            <p className="mb-3 text-sm text-emerald-500">{messageSuccess}</p>
          )}
          {messageError && <ErrorMessage message={messageError} />}
          <FormField label="Topic">
            <Select
              value={messageTopic}
              onChange={(e) => setMessageTopic(e.target.value as SupportTopic)}
            >
              {MESSAGE_TOPICS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Subject (optional)">
            <Input
              value={messageSubject}
              onChange={(e) => setMessageSubject(e.target.value)}
              placeholder="Custom subject line"
            />
          </FormField>
          <FormField label="Message">
            <Textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              rows={4}
              placeholder="Write your message to the user (min 10 characters)..."
            />
          </FormField>
          <Button
            className="mt-2"
            disabled={messageMutation.isPending || messageBody.trim().length < 10}
            onClick={() => messageMutation.mutate()}
          >
            {messageMutation.isPending ? 'Sending...' : 'Send message'}
          </Button>
        </Card>
      </div>

      {activeLoan && (
        <Card className="mb-6 p-5">
          <h2 className="mb-4 text-lg font-semibold text-(--text-primary)">Active loan</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-(--text-muted)">Principal</p>
              <p className="font-medium">{formatCurrency(activeLoan.principalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-(--text-muted)">Outstanding</p>
              <p className="font-medium">{formatCurrency(activeLoan.outstandingBalance)}</p>
            </div>
            <div>
              <p className="text-xs text-(--text-muted)">Repaid</p>
              <p className="font-medium">{formatCurrency(activeLoan.amountRepaid)}</p>
            </div>
            <div>
              <p className="text-xs text-(--text-muted)">Due date</p>
              <p className="font-medium">{formatDate(activeLoan.dueDate)}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-6">
        <SectionTable
          title="Loan history"
          empty="No loans"
          headers={['Amount', 'Status', 'Outstanding', 'Due', 'Created']}
          rows={(loans?.items ?? []).map((loan) => [
            formatCurrency(loan.principalAmount),
            <StatusBadge key={loan.id} status={loan.status} />,
            formatCurrency(loan.outstandingBalance),
            formatDate(loan.dueDate),
            formatDate(loan.createdAt),
          ])}
          page={loansPage}
          totalPages={loans?.pagination.totalPages ?? 1}
          onPageChange={setLoansPage}
        />

        <SectionTable
          title="Fuel purchase history"
          empty="No fuel purchases"
          headers={['Litres', 'Amount', 'Merchant', 'Status', 'Date']}
          rows={(transactions?.items ?? []).map((tx) => [
            `${formatNumber(tx.fuelLitres, 1)} L`,
            formatCurrency(tx.amount),
            tx.merchantSnapshot?.businessName ?? tx.merchantSnapshot?.stationCode ?? '—',
            <StatusBadge key={tx.id} status={tx.status} />,
            formatDateTime(tx.completedAt ?? tx.createdAt),
          ])}
          page={txPage}
          totalPages={transactions?.pagination.totalPages ?? 1}
          onPageChange={setTxPage}
        />

        <SectionTable
          title="Repayment breakdown"
          empty="No repayments"
          headers={['Amount', 'Principal', 'Interest', 'Source', 'Date']}
          rows={(repayments?.items ?? []).map((r) => [
            formatCurrency(r.amount),
            formatCurrency(r.principalPortion),
            formatCurrency(r.interestPortion),
            r.source.replace(/_/g, ' '),
            formatDateTime(r.createdAt),
          ])}
          page={repayPage}
          totalPages={repayments?.pagination.totalPages ?? 1}
          onPageChange={setRepayPage}
        />
      </div>
    </div>
  )
}

function SectionTable({
  title,
  empty,
  headers,
  rows,
  page,
  totalPages,
  onPageChange,
}: {
  title: string
  empty: string
  headers: string[]
  rows: React.ReactNode[][]
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-(--border) px-5 py-4">
        <h2 className="text-lg font-semibold text-(--text-primary)">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-(--text-muted)">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--border) bg-(--bg-hover)">
                {headers.map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-(--text-muted)"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-(--border) last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-5 py-3 text-(--text-primary)">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-(--border) px-5 py-3">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-(--text-muted)">
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </Card>
  )
}

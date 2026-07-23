import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../api/admin'
import { Button, Card, KpiCard, PageHeader, Spinner, StatusBadge } from '../components/ui'
import { formatCurrency, formatDate } from '../lib/utils'

const FSM_STEPS = [
  { id: 'UNDER_REVIEW', label: 'Under review', hint: 'Pending approval' },
  { id: 'ACTIVE', label: 'Active', hint: 'Fuel credit live' },
  { id: 'DELINQUENT', label: 'Delinquent', hint: 'DPD buckets' },
  { id: 'DEFAULTED', label: 'Defaulted', hint: 'Hard default' },
  { id: 'CLOSED_PAID_OFF', label: 'Closed', hint: 'Paid / written off' },
]

const DPD_BUCKETS = [
  { key: 'CURRENT', label: 'Current', accent: 'green' as const },
  { key: 'DPD_1_30', label: '1–30 DPD', accent: 'amber' as const },
  { key: 'DPD_31_60', label: '31–60 DPD', accent: 'amber' as const },
  { key: 'DPD_61_90', label: '61–90 DPD', accent: 'red' as const },
  { key: 'DPD_90_PLUS', label: '90+ DPD', accent: 'red' as const },
]

export function LoanDashboardPage() {
  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.dashboard,
  })

  const { data: finance } = useQuery({
    queryKey: ['admin', 'finance'],
    queryFn: adminApi.financeOverview,
  })

  const { data: pending } = useQuery({
    queryKey: ['admin', 'loans', 'pending-preview'],
    queryFn: () => adminApi.loans({ page: 1, limit: 8, status: 'pending' }),
  })

  const { data: collections } = useQuery({
    queryKey: ['admin', 'loans-collections-preview'],
    queryFn: () => adminApi.collectionsByDpd(1, 100),
  })

  const { data: recon } = useQuery({
    queryKey: ['admin', 'loan-recon-mismatches'],
    queryFn: adminApi.loanReconMismatches,
  })

  const dpdCounts = DPD_BUCKETS.map((bucket) => ({
    ...bucket,
    count: (collections?.items ?? []).filter((l) => (l.dpdBucket ?? 'CURRENT') === bucket.key)
      .length,
  }))

  if (dashLoading || !dashboard) return <Spinner />

  return (
    <div>
      <PageHeader
        title="Loan dashboard"
        description="Fuel credit lifecycle — state machine, delinquency, and ops queues"
        actions={
          <>
            <Link to="/loans/manage">
              <Button variant="secondary">Manage loans</Button>
            </Link>
            <Link to="/loans/manage?status=pending">
              <Button>Review queue</Button>
            </Link>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Pending review"
          value={String(dashboard.loans.pending)}
          sub="Awaiting approve / reject"
          accent="amber"
        />
        <KpiCard
          label="Active facilities"
          value={String(dashboard.loans.active + dashboard.loans.partiallyRepaid)}
          sub={`${dashboard.loans.partiallyRepaid} partially repaid`}
          accent="green"
        />
        <KpiCard
          label="Outstanding"
          value={formatCurrency(dashboard.loans.totalOutstanding)}
          sub={`${dashboard.loans.overdue} past due`}
          accent="amber"
        />
        <KpiCard
          label="Ledger mismatches"
          value={String(recon?.items.length ?? 0)}
          sub="Projected vs GL outstanding"
          accent={(recon?.items.length ?? 0) > 0 ? 'red' : 'blue'}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-1 text-sm font-semibold text-(--text-primary)">Loan state machine</h3>
          <p className="mb-4 text-xs text-(--text-muted)">
            Canonical spine (docs/lms) — nested DPD while ACTIVE
          </p>
          <div className="flex flex-wrap gap-2">
            {FSM_STEPS.map((step, index) => (
              <div
                key={step.id}
                className="flex min-w-30 flex-1 flex-col rounded-lg border border-(--border) bg-(--bg-hover)/40 px-3 py-3"
              >
                <p className="text-[10px] uppercase tracking-wide text-(--text-muted)">
                  {index + 1}. {step.id.replace(/_/g, ' ')}
                </p>
                <p className="mt-1 text-sm font-medium text-(--text-primary)">{step.label}</p>
                <p className="text-xs text-(--text-secondary)">{step.hint}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-(--text-muted)">Pending</p>
              <p className="font-semibold text-amber-500">{dashboard.loans.pending}</p>
            </div>
            <div>
              <p className="text-(--text-muted)">Active</p>
              <p className="font-semibold text-emerald-500">{dashboard.loans.active}</p>
            </div>
            <div>
              <p className="text-(--text-muted)">Partial</p>
              <p className="font-semibold text-blue-400">{dashboard.loans.partiallyRepaid}</p>
            </div>
            <div>
              <p className="text-(--text-muted)">Overdue</p>
              <p className="font-semibold text-red-400">{dashboard.loans.overdue}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-(--text-primary)">Delinquency buckets</h3>
              <p className="text-xs text-(--text-muted)">Collections queue by DPD</p>
            </div>
            <Link to="/loans/manage?tab=collections" className="text-sm text-emerald-500 hover:underline">
              Open collections
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {dpdCounts.map((bucket) => (
              <KpiCard
                key={bucket.key}
                label={bucket.label}
                value={String(bucket.count)}
                accent={bucket.accent}
              />
            ))}
          </div>
          {finance && (
            <p className="mt-4 text-xs text-(--text-secondary)">
              Portfolio: {formatCurrency(finance.loans.totalDisbursed)} disbursed ·{' '}
              {formatCurrency(finance.loans.totalRepaid)} repaid ·{' '}
              {finance.loans.overdueCount} overdue facilities
            </p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-(--text-primary)">Pending approval queue</h3>
            <Link to="/loans/manage?status=pending" className="text-sm text-emerald-500 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {(pending?.items ?? []).length === 0 && (
              <p className="text-sm text-(--text-muted)">No loans awaiting review.</p>
            )}
            {(pending?.items ?? []).map((loan) => (
              <Link
                key={loan.id}
                to={`/loans/${loan.id}`}
                className="flex items-center justify-between rounded-lg border border-(--border) px-3 py-2.5 hover:bg-(--bg-hover)"
              >
                <div>
                  <p className="text-sm font-medium text-(--text-primary)">
                    {loan.customer.firstName} {loan.customer.lastName}
                  </p>
                  <p className="text-xs text-(--text-muted)">
                    {formatCurrency(loan.principalAmount)} · due {formatDate(loan.dueDate)}
                  </p>
                </div>
                <StatusBadge status={loan.canonicalStatus ?? loan.status} />
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-(--text-primary)">Ledger recon alerts</h3>
            <span className="text-xs text-(--text-muted)">{recon?.items.length ?? 0} open</span>
          </div>
          <div className="space-y-2">
            {(recon?.items ?? []).length === 0 && (
              <p className="text-sm text-(--text-muted)">No outstanding mismatches.</p>
            )}
            {(recon?.items ?? []).slice(0, 8).map((row) => (
              <Link
                key={row._id}
                to={`/loans/${row.loanId}`}
                className="flex items-center justify-between rounded-lg border border-red-500/20 px-3 py-2.5 hover:bg-(--bg-hover)"
              >
                <div>
                  <p className="text-sm font-medium text-(--text-primary)">Loan {row.loanId.slice(-8)}</p>
                  <p className="text-xs text-(--text-muted)">
                    Projected {formatCurrency(row.projectedOutstanding)} · Ledger{' '}
                    {formatCurrency(row.ledgerOutstanding)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-red-400">
                  Δ {formatCurrency(row.diff)}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

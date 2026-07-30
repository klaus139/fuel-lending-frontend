import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../api/admin'
import { Button, Card, KpiCard, PageHeader, Spinner } from '../components/ui'
import { formatCurrency, formatDate } from '../lib/utils'

const DPD_BUCKETS = [
  { key: 'CURRENT', label: 'Not yet due', accent: 'green' as const },
  { key: 'DPD_1_30', label: '1–30 days past', accent: 'amber' as const },
  { key: 'DPD_31_60', label: '31–60 days past', accent: 'amber' as const },
  { key: 'DPD_61_90', label: '61–90 days past', accent: 'red' as const },
  { key: 'DPD_90_PLUS', label: '90+ days past', accent: 'red' as const },
]

function dpdBucketLabel(bucket?: string): string {
  return DPD_BUCKETS.find((b) => b.key === bucket)?.label ?? bucket ?? '—'
}

export function LoanDashboardPage() {
  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.dashboard,
  })

  const { data: overdue } = useQuery({
    queryKey: ['admin', 'defaulters-overdue-preview'],
    queryFn: () => adminApi.overdueLoans(1, 10),
  })

  const { data: collections } = useQuery({
    queryKey: ['admin', 'defaulters-collections-preview'],
    queryFn: () => adminApi.collectionsByDpd(1, 200),
  })

  const collectionItems = collections?.items ?? []

  const dpdCounts = DPD_BUCKETS.map((bucket) => ({
    ...bucket,
    count: collectionItems.filter((row) => (row.dpdBucket ?? 'CURRENT') === bucket.key).length,
  }))

  const hardDefaulters = dpdCounts.find((b) => b.key === 'DPD_90_PLUS')?.count ?? 0
  const pastDueUsers = dpdCounts
    .filter((b) => b.key !== 'CURRENT')
    .reduce((sum, b) => sum + b.count, 0)

  if (dashLoading || !dashboard) return <Spinner />

  const defaultingUsers =
    dashboard.purchases.unpaid + dashboard.purchases.partiallyRepaid

  return (
    <div>
      <PageHeader
        title="Defaulters"
        description="Customers who bought fuel and still owe. Track how many are past due and by how many days."
        actions={
          <Link to="/loans/manage?tab=collections">
            <Button variant="secondary">Manage defaulters</Button>
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Defaulting users"
          value={String(defaultingUsers)}
          sub={`${dashboard.purchases.partiallyRepaid} partially repaid · ${dashboard.purchases.unpaid} unpaid`}
          accent="amber"
        />
        <KpiCard
          label="Amount owed"
          value={formatCurrency(dashboard.purchases.totalOutstanding)}
          sub="Total unpaid fuel + service charges"
          accent="amber"
        />
        <KpiCard
          label="Past due"
          value={String(dashboard.purchases.overdue)}
          sub={`${pastDueUsers} in delinquency buckets`}
          accent="red"
        />
        <KpiCard
          label="Hard defaulters"
          value={String(hardDefaulters)}
          sub="90+ days past due"
          accent="red"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-(--text-primary)">Days past due</h3>
              <p className="text-xs text-(--text-muted)">
                Defaulting users grouped by how long payment is overdue
              </p>
            </div>
            <Link
              to="/loans/manage?tab=collections"
              className="text-sm text-emerald-500 hover:underline"
            >
              View all
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
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-(--text-primary)">Overdue users</h3>
              <p className="text-xs text-(--text-muted)">Bought fuel · payment past due date</p>
            </div>
            <Link to="/loans/manage?tab=overdue" className="text-sm text-emerald-500 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {(overdue?.items ?? []).length === 0 && (
              <p className="text-sm text-(--text-muted)">No overdue users right now.</p>
            )}
            {(overdue?.items ?? []).map((item) => (
              <Link
                key={item.id}
                to={`/loans/${item.id}`}
                className="flex items-center justify-between rounded-lg border border-(--border) px-3 py-2.5 hover:bg-(--bg-hover)"
              >
                <div>
                  <p className="text-sm font-medium text-(--text-primary)">
                    {item.customer.firstName} {item.customer.lastName}
                  </p>
                  <p className="text-xs text-(--text-muted)">
                    Due {formatDate(item.dueDate)}
                    {item.daysOverdue > 0 ? ` · ${item.daysOverdue} days past due` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-amber-500">
                    {formatCurrency(item.outstandingBalance)}
                  </p>
                  <p className="mt-1 text-[11px] text-(--text-muted)">
                    {item.dpdBucket ? dpdBucketLabel(String(item.dpdBucket)) : 'Past due'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { adminApi } from '../api/admin'
import { KpiCard, PageHeader, Card, Spinner } from '../components/ui'
import { formatCurrency } from '../lib/utils'

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6']

export function DashboardPage() {
  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.dashboard,
  })

  const { data: finance } = useQuery({
    queryKey: ['admin', 'finance'],
    queryFn: adminApi.financeOverview,
  })

  const { data: repayment } = useQuery({
    queryKey: ['admin', 'repayment-rate'],
    queryFn: adminApi.repaymentRate,
  })

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: volume } = useQuery({
    queryKey: ['admin', 'transaction-volume'],
    queryFn: () => adminApi.transactionVolume(thirtyDaysAgo.toISOString(), new Date().toISOString()),
  })

  if (dashLoading || !dashboard) return <Spinner />

  const loanPie = [
    { name: 'Active', value: dashboard.loans.active },
    { name: 'Partial', value: dashboard.loans.partiallyRepaid },
    { name: 'Pending', value: dashboard.loans.pending },
    { name: 'Overdue', value: dashboard.loans.overdue },
  ].filter((d) => d.value > 0)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Last updated ${new Date(dashboard.generatedAt).toLocaleString()}`}
      />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
        Users
      </h2>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/users" className="block transition hover:opacity-90">
          <KpiCard
            label="Total users"
            value={String(dashboard.users.total)}
            sub={`${dashboard.users.customers} customers · ${dashboard.users.blocked} blocked`}
            accent="green"
          />
        </Link>
        <Link to="/users" className="block transition hover:opacity-90">
          <KpiCard
            label="New customers (7d)"
            value={String(dashboard.users.newCustomers7d)}
            sub={`${dashboard.users.newCustomers30d} in last 30 days`}
            accent="blue"
          />
        </Link>
        <Link to="/merchants" className="block transition hover:opacity-90">
          <KpiCard
            label="Merchant profiles"
            value={String(dashboard.merchantProfiles.total)}
            sub={`${dashboard.merchantProfiles.approved} approved · ${dashboard.merchantProfiles.pending} pending`}
            accent="amber"
          />
        </Link>
        <Link to="/merchants" className="block transition hover:opacity-90">
          <KpiCard
            label="New merchants (7d)"
            value={String(dashboard.merchantProfiles.new7d)}
            sub={`${dashboard.merchantProfiles.new30d} in last 30 days`}
            accent="red"
          />
        </Link>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
        Transactions & sales
      </h2>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/transactions" className="block transition hover:opacity-90">
          <KpiCard
            label="All transactions"
            value={String(dashboard.transactions.total)}
            sub={`${dashboard.transactions.completed} completed · ${dashboard.transactions.pending} open`}
            accent="blue"
          />
        </Link>
        <Link to="/transactions" className="block transition hover:opacity-90">
          <KpiCard
            label="Today's sales"
            value={formatCurrency(dashboard.sales.todayVolume)}
            sub={`${dashboard.sales.todayCount} purchases`}
            accent="green"
          />
        </Link>
        <Link to="/transactions" className="block transition hover:opacity-90">
          <KpiCard
            label="Last 30 days"
            value={formatCurrency(dashboard.sales.last30DaysVolume)}
            sub={`${dashboard.sales.last30DaysCount} purchases`}
            accent="amber"
          />
        </Link>
        <Link to="/transactions" className="block transition hover:opacity-90">
          <KpiCard
            label="All-time sales"
            value={formatCurrency(dashboard.sales.allTimeVolume)}
            sub={`${dashboard.sales.allTimeCount} completed`}
            accent="red"
          />
        </Link>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
        Loans & settlements
      </h2>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/loans" className="block transition hover:opacity-90">
          <KpiCard
            label="Outstanding loans"
            value={formatCurrency(dashboard.loans.totalOutstanding)}
            sub={`${dashboard.loans.overdue} overdue · ${dashboard.loans.active} active`}
            accent="amber"
          />
        </Link>
        <Link to="/settlements" className="block transition hover:opacity-90">
          <KpiCard
            label="Pending settlements"
            value={formatCurrency(dashboard.settlements.pendingAmount)}
            sub={`${dashboard.settlements.pendingCount} batches · ${dashboard.settlements.paidThisMonth} paid this month`}
            accent="red"
          />
        </Link>
        <KpiCard
          label="Merchant pending"
          value={String(dashboard.merchantProfiles.pending)}
          sub={`${dashboard.merchantProfiles.suspended} suspended · ${dashboard.merchantProfiles.rejected} rejected`}
          accent="blue"
        />
        <KpiCard
          label="Failed / declined tx"
          value={String(dashboard.transactions.failed)}
          sub="Cancelled, declined, expired, failed"
          accent="green"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-(--text-secondary)">
              Transaction Volume (30 days)
            </h3>
            <Link to="/transactions" className="text-xs text-emerald-500 hover:underline">
              View all →
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={volume?.byDay ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                formatter={(v) => [formatCurrency(Number(v)), 'Volume']}
              />
              <Bar dataKey="volume" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-sm font-medium text-(--text-secondary)">Loan Status</h3>
          {loanPie.length === 0 ? (
            <p className="py-8 text-center text-sm text-(--text-muted)">No loan data</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={loanPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {loanPie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-medium text-(--text-secondary)">Finance Overview</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-(--text-muted)">Total Disbursed</dt>
              <dd className="font-medium">{formatCurrency(finance?.loans.totalDisbursed ?? 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-(--text-muted)">Total Repaid</dt>
              <dd className="font-medium text-emerald-500">{formatCurrency(finance?.loans.totalRepaid ?? 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-(--text-muted)">Outstanding</dt>
              <dd className="font-medium text-amber-500">{formatCurrency(finance?.loans.totalOutstanding ?? 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-(--text-muted)">Active Loans</dt>
              <dd className="font-medium">{finance?.loans.activeCount ?? 0}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-medium text-(--text-secondary)">Repayment Rate</h3>
          <p className="text-4xl font-bold text-emerald-500">{repayment?.repaymentRatePercent ?? 0}%</p>
          <p className="mt-2 text-sm text-(--text-muted)">
            {repayment?.repaymentTransactionCount ?? 0} repayment transactions
          </p>
          <p className="mt-1 text-xs text-(--text-muted)">
            {formatCurrency(repayment?.totalRepaid ?? 0)} repaid of{' '}
            {formatCurrency(repayment?.totalDisbursed ?? 0)}
          </p>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-medium text-(--text-secondary)">Settlements</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-(--text-muted)">Pending</dt>
              <dd className="font-medium text-amber-500">
                {formatCurrency(finance?.settlements.pendingAmount ?? 0)} (
                {finance?.settlements.pendingCount ?? 0})
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-(--text-muted)">Paid Total</dt>
              <dd className="font-medium text-emerald-500">
                {formatCurrency(finance?.settlements.paidAmount ?? 0)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-(--text-muted)">Paid Batches</dt>
              <dd className="font-medium">{finance?.settlements.paidCount ?? 0}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  )
}

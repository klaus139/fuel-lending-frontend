import { useMemo, useState } from 'react'
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
import { Button, Card, Input, KpiCard, PageHeader, Spinner } from '../components/ui'
import { formatCurrency, formatLitres } from '../lib/utils'

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6']

function toIsoStart(date: string): string | undefined {
  if (!date) return undefined
  return new Date(`${date}T00:00:00.000`).toISOString()
}

function toIsoEnd(date: string): string | undefined {
  if (!date) return undefined
  return new Date(`${date}T23:59:59.999`).toISOString()
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type RevenuePreset = 'today' | '7d' | '30d' | 'all' | 'custom'

function rangeForPreset(preset: RevenuePreset): { from: string; to: string } {
  const today = new Date()
  const to = toDateInputValue(today)
  if (preset === 'today') return { from: to, to }
  if (preset === '7d') {
    const from = new Date(today)
    from.setDate(from.getDate() - 6)
    return { from: toDateInputValue(from), to }
  }
  if (preset === '30d') {
    const from = new Date(today)
    from.setDate(from.getDate() - 29)
    return { from: toDateInputValue(from), to }
  }
  if (preset === 'all') return { from: '', to: '' }
  return { from: '', to: '' }
}

export function DashboardPage() {
  const [revenuePreset, setRevenuePreset] = useState<RevenuePreset>('30d')
  const initialRange = rangeForPreset('30d')
  const [fromDate, setFromDate] = useState(initialRange.from)
  const [toDate, setToDate] = useState(initialRange.to)

  const fromIso = toIsoStart(fromDate)
  const toIso = toIsoEnd(toDate)

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

  const thirtyDaysAgo = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d
  }, [])

  const { data: volume } = useQuery({
    queryKey: ['admin', 'transaction-volume'],
    queryFn: () =>
      adminApi.transactionVolume(thirtyDaysAgo.toISOString(), new Date().toISOString()),
  })

  const { data: revenue, isFetching: revenueLoading } = useQuery({
    queryKey: ['admin', 'revenue', fromIso, toIso],
    queryFn: () => adminApi.revenue({ fromDate: fromIso, toDate: toIso }),
  })

  const applyPreset = (preset: RevenuePreset) => {
    setRevenuePreset(preset)
    if (preset === 'custom') return
    const range = rangeForPreset(preset)
    setFromDate(range.from)
    setToDate(range.to)
  }

  if (dashLoading || !dashboard) return <Spinner />

  const purchasePie = [
    { name: 'Unpaid', value: dashboard.purchases.unpaid },
    { name: 'Partial', value: dashboard.purchases.partiallyRepaid },
    { name: 'Overdue', value: dashboard.purchases.overdue },
  ].filter((d) => d.value > 0)

  const rangeLabel =
    fromDate || toDate
      ? `${fromDate || '…'} → ${toDate || '…'}`
      : 'All time'

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Last updated ${new Date(dashboard.generatedAt).toLocaleString()}`}
      />

      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
            Company revenue
          </h2>
          <Link to="/revenue" className="text-xs text-emerald-500 hover:underline">
            Open revenue →
          </Link>
        </div>

        <Card className="mb-4 p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-(--text-muted)">
                Filtered total
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-500">
                {revenueLoading && !revenue ? '…' : formatCurrency(revenue?.totalRevenue ?? 0)}
              </p>
              <p className="mt-1 text-sm text-(--text-muted)">
                {rangeLabel} · {revenue?.salesCount ?? 0} completed sales · avg{' '}
                {formatCurrency(revenue?.averageRevenuePerSale ?? 0)} / sale
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ['today', 'Today'],
                  ['7d', '7 days'],
                  ['30d', '30 days'],
                  ['all', 'All time'],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={revenuePreset === key ? 'primary' : 'secondary'}
                  onClick={() => applyPreset(key)}
                >
                  {label}
                </Button>
              ))}
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setRevenuePreset('custom')
                  setFromDate(e.target.value)
                }}
                className="w-40"
              />
              <Input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setRevenuePreset('custom')
                  setToDate(e.target.value)
                }}
                className="w-40"
              />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link to="/revenue" className="block transition hover:opacity-90">
            <KpiCard
              label="Revenue today"
              value={formatCurrency(dashboard.revenue.today)}
              sub="Service charges earned today"
              accent="green"
            />
          </Link>
          <Link to="/revenue" className="block transition hover:opacity-90">
            <KpiCard
              label="Revenue (7 days)"
              value={formatCurrency(dashboard.revenue.last7Days)}
              sub="Rolling 7-day platform take"
              accent="blue"
            />
          </Link>
          <Link to="/revenue" className="block transition hover:opacity-90">
            <KpiCard
              label="Revenue (30 days)"
              value={formatCurrency(dashboard.revenue.last30Days)}
              sub="Rolling 30-day platform take"
              accent="amber"
            />
          </Link>
          <Link to="/revenue" className="block transition hover:opacity-90">
            <KpiCard
              label="Revenue all time"
              value={formatCurrency(dashboard.revenue.allTime)}
              sub="Lifetime company revenue"
              accent="red"
            />
          </Link>
        </div>
      </section>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
        Fuel litres
      </h2>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/transactions" className="block transition hover:opacity-90">
          <KpiCard
            label="Litres sold today"
            value={formatLitres(dashboard.sales.todayLitres)}
            sub={`${dashboard.sales.todayCount} sales · ${formatCurrency(dashboard.sales.todayVolume)}`}
            accent="green"
          />
        </Link>
        <Link to="/transactions" className="block transition hover:opacity-90">
          <KpiCard
            label="Litres (7 days)"
            value={formatLitres(dashboard.sales.last7DaysLitres)}
            sub={`${dashboard.sales.last7DaysCount} sales · ${formatCurrency(dashboard.sales.last7DaysVolume)}`}
            accent="blue"
          />
        </Link>
        <Link to="/transactions" className="block transition hover:opacity-90">
          <KpiCard
            label="Litres (30 days)"
            value={formatLitres(dashboard.sales.last30DaysLitres)}
            sub={`${dashboard.sales.last30DaysCount} sales · ${formatCurrency(dashboard.sales.last30DaysVolume)}`}
            accent="amber"
          />
        </Link>
        <Link to="/transactions" className="block transition hover:opacity-90">
          <KpiCard
            label="Total litres sold"
            value={formatLitres(dashboard.sales.allTimeLitres)}
            sub={`${dashboard.sales.allTimeCount} completed · ${formatCurrency(dashboard.sales.allTimeVolume)}`}
            accent="red"
          />
        </Link>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
        Users
      </h2>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/users" className="block transition hover:opacity-90">
          <KpiCard
            label="Total users"
            value={String(dashboard.users.total)}
            sub={`${dashboard.users.blocked} blocked`}
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
            label="Total merchants"
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
        Sales & repayments
      </h2>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/transactions" className="block transition hover:opacity-90">
          <KpiCard
            label="Today's sales amount"
            value={formatCurrency(dashboard.sales.todayVolume)}
            sub={`${formatLitres(dashboard.sales.todayLitres)} · ${dashboard.sales.todayCount} sales`}
            accent="green"
          />
        </Link>
        <Link to="/loans" className="block transition hover:opacity-90">
          <KpiCard
            label="Outstanding to repay"
            value={formatCurrency(dashboard.purchases.totalOutstanding)}
            sub={`${dashboard.purchases.overdue} overdue purchases`}
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
        <Link to="/transactions" className="block transition hover:opacity-90">
          <KpiCard
            label="Failed / declined sales"
            value={String(dashboard.transactions.failed)}
            accent="blue"
          />
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-(--text-secondary)">Litres sold (30 days)</h3>
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
                tickFormatter={(v) => `${Number(v).toFixed(0)}L`}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                formatter={(v, name) =>
                  name === 'litres'
                    ? [formatLitres(Number(v)), 'Litres']
                    : [formatCurrency(Number(v)), 'Amount']
                }
              />
              <Bar dataKey="litres" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-sm font-medium text-(--text-secondary)">Unpaid purchases</h3>
          {purchasePie.length === 0 ? (
            <p className="py-8 text-center text-sm text-(--text-muted)">No unpaid purchases</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={purchasePie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {purchasePie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-medium text-(--text-secondary)">Fuel sales overview</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-(--text-muted)">Total sold</dt>
              <dd className="font-medium">
                {formatCurrency(finance?.loans.totalDisbursed ?? dashboard.sales.allTimeVolume)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-(--text-muted)">Total repaid</dt>
              <dd className="font-medium text-emerald-500">
                {formatCurrency(finance?.loans.totalRepaid ?? 0)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-(--text-muted)">Outstanding</dt>
              <dd className="font-medium text-amber-500">
                {formatCurrency(
                  finance?.loans.totalOutstanding ?? dashboard.purchases.totalOutstanding,
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-(--text-muted)">Company revenue</dt>
              <dd className="font-medium text-emerald-500">
                {formatCurrency(dashboard.revenue.allTime)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-medium text-(--text-secondary)">Repayment rate</h3>
          <p className="text-4xl font-bold text-emerald-500">
            {repayment?.repaymentRatePercent ?? 0}%
          </p>
          <p className="mt-2 text-sm text-(--text-muted)">
            {repayment?.repaymentTransactionCount ?? 0} repayment transactions
          </p>
          <p className="mt-1 text-xs text-(--text-muted)">
            {formatCurrency(repayment?.totalRepaid ?? 0)} repaid of{' '}
            {formatCurrency(repayment?.totalDisbursed ?? 0)} sold
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
              <dt className="text-(--text-muted)">Paid total</dt>
              <dd className="font-medium text-emerald-500">
                {formatCurrency(finance?.settlements.paidAmount ?? 0)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-(--text-muted)">Paid batches</dt>
              <dd className="font-medium">{finance?.settlements.paidCount ?? 0}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  )
}

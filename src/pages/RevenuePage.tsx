import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { adminApi } from '../api/admin'
import { Button, Card, Input, KpiCard, PageHeader, Spinner } from '../components/ui'
import { formatCurrency, formatLitres } from '../lib/utils'

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

export function RevenuePage() {
  const today = toDateInputValue(new Date())
  const monthStart = (() => {
    const d = new Date()
    d.setDate(1)
    return toDateInputValue(d)
  })()

  const [fromDate, setFromDate] = useState(monthStart)
  const [toDate, setToDate] = useState(today)
  const [merchantCode, setMerchantCode] = useState('')

  const fromIso = toIsoStart(fromDate)
  const toIso = toIsoEnd(toDate)

  const { data: dashboard } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.dashboard,
  })

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'revenue', fromIso, toIso, merchantCode],
    queryFn: () =>
      adminApi.revenue({
        fromDate: fromIso,
        toDate: toIso,
        merchantCode: merchantCode || undefined,
      }),
  })

  if (isLoading && !data) return <Spinner />

  return (
    <div>
      <PageHeader
        title="Company revenue"
        description="Platform take from service charges on completed fuel sales. Filter by date or station."
        actions={
          <>
            <Button variant="secondary" onClick={() => refetch()}>
              Refresh
            </Button>
            <Link
              to="/"
              className="inline-flex items-center rounded-lg border border-(--border) px-3 py-2 text-xs text-(--text-muted) hover:text-(--text-primary)"
            >
              Dashboard
            </Link>
          </>
        }
      />

      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-(--text-muted)">From</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-(--text-muted)">To</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-(--text-muted)">Station code</label>
            <Input
              placeholder="MCH…"
              value={merchantCode}
              onChange={(e) => setMerchantCode(e.target.value)}
              className="w-48"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setFromDate('')
              setToDate('')
              setMerchantCode('')
            }}
          >
            Clear filters
          </Button>
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total revenue"
          value={formatCurrency(data?.totalRevenue ?? 0)}
          sub={isFetching ? 'Updating…' : 'Service charges in range'}
          accent="green"
        />
        <KpiCard
          label="Completed sales"
          value={String(data?.salesCount ?? 0)}
          sub={`${formatLitres(data?.totalLitres ?? 0)} sold`}
          accent="blue"
        />
        <KpiCard
          label="Fuel amount"
          value={formatCurrency(data?.totalFuelAmount ?? 0)}
          sub="Customer fuel cost (not revenue)"
          accent="amber"
        />
        <KpiCard
          label="Avg revenue / sale"
          value={formatCurrency(data?.averageRevenuePerSale ?? 0)}
          sub="Platform take per completed sale"
          accent="red"
        />
      </div>

      {dashboard && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Today (snapshot)"
            value={formatCurrency(dashboard.revenue.today)}
            accent="green"
          />
          <KpiCard
            label="7 days (snapshot)"
            value={formatCurrency(dashboard.revenue.last7Days)}
            accent="blue"
          />
          <KpiCard
            label="30 days (snapshot)"
            value={formatCurrency(dashboard.revenue.last30Days)}
            accent="amber"
          />
          <KpiCard
            label="All time (snapshot)"
            value={formatCurrency(dashboard.revenue.allTime)}
            accent="red"
          />
        </div>
      )}

      <Card className="p-5">
        <h3 className="mb-4 text-sm font-medium text-(--text-secondary)">Revenue by day</h3>
        {(data?.byDay.length ?? 0) === 0 ? (
          <p className="py-10 text-center text-sm text-(--text-muted)">
            No completed sales with revenue in this range
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data?.byDay ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickFormatter={(v) => `₦${Number(v).toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                formatter={(v, name) => {
                  if (name === 'revenue') return [formatCurrency(Number(v)), 'Revenue']
                  if (name === 'salesCount') return [String(v), 'Sales']
                  return [String(v), String(name)]
                }}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}

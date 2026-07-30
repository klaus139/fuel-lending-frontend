import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { adminApi } from '../api/admin'
import { DataTable } from '../components/data-table/DataTable'
import { Button, Input, KpiCard, PageHeader, Select, StatusBadge } from '../components/ui'
import { downloadCsv, formatCurrency, formatDateTime, formatLitres, formatNumber } from '../lib/utils'
import type { AdminSaleRow, SalesQuery } from '../types/api'

function toIsoStart(date: string): string | undefined {
  if (!date) return undefined
  return new Date(`${date}T00:00:00.000`).toISOString()
}

function toIsoEnd(date: string): string | undefined {
  if (!date) return undefined
  return new Date(`${date}T23:59:59.999`).toISOString()
}

function purchaseTypeLabel(type: string): string {
  if (type === 'qr') return 'QR'
  if (type === 'purchase_id') return 'Purchase ID'
  return type || '—'
}

type SalesSortBy = NonNullable<SalesQuery['sortBy']>

export function TransactionsPage() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [merchantCode, setMerchantCode] = useState('')
  const [status, setStatus] = useState<string>('completed')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sortBy, setSortBy] = useState<SalesSortBy>('completedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const fromIso = toIsoStart(fromDate)
  const toIso = toIsoEnd(toDate)

  const { data: dashboard } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.dashboard,
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      'admin',
      'sales',
      page,
      limit,
      merchantCode,
      status,
      fromIso,
      toIso,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      adminApi.sales({
        page,
        limit,
        merchantCode: merchantCode || undefined,
        status: (status || undefined) as AdminSaleRow['status'],
        fromDate: fromIso,
        toDate: toIso,
        sortBy,
        sortOrder,
      }),
  })

  const summary = data?.summary

  const columns = useMemo<ColumnDef<AdminSaleRow>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: ({ row }) => formatDateTime(row.original.completedAt ?? row.original.createdAt),
      },
      {
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) => {
          const customer = row.original.customerSnapshot
          if (!customer) return <span className="text-(--text-muted)">Walk-in / pending</span>
          return (
            <div>
              <p className="font-medium">
                {customer.firstName} {customer.lastName}
              </p>
              <p className="text-xs text-(--text-muted)">{customer.email}</p>
            </div>
          )
        },
      },
      {
        id: 'merchant',
        header: 'Station',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.businessName ?? '—'}</p>
            <p className="text-xs text-(--text-muted)">{row.original.merchantCode}</p>
          </div>
        ),
      },
      {
        accessorKey: 'fuelLitres',
        header: 'Litres',
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums">{formatLitres(row.original.fuelLitres)}</span>
        ),
      },
      {
        accessorKey: 'pricePerLitre',
        header: '₦/L',
        cell: ({ getValue }) => formatCurrency(getValue<number>()),
      },
      {
        accessorKey: 'amount',
        header: 'Fuel ₦',
        cell: ({ row }) => formatCurrency(row.original.amount),
      },
      {
        accessorKey: 'serviceCharge',
        header: 'Service ₦',
        cell: ({ row }) => formatCurrency(row.original.serviceCharge),
      },
      {
        accessorKey: 'purchaseTotal',
        header: 'Total ₦',
        cell: ({ row }) => (
          <span className="font-medium">{formatCurrency(row.original.purchaseTotal)}</span>
        ),
      },
      {
        accessorKey: 'purchaseType',
        header: 'Type',
        cell: ({ row }) => purchaseTypeLabel(row.original.purchaseType),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const label = row.original.status === 'completed' ? 'success' : row.original.status
          return (
            <div>
              <StatusBadge status={label} />
              {row.original.declineReason && (
                <p
                  className="mt-1 max-w-40 truncate text-[10px] text-(--text-muted)"
                  title={row.original.declineReason}
                >
                  {row.original.declineReason}
                </p>
              )}
            </div>
          )
        },
      },
    ],
    [],
  )

  const handleExport = () => {
    if (!data?.items.length) return
    downloadCsv(
      'merchant-fuel-sales.csv',
      [
        'Date',
        'Customer',
        'Station',
        'Merchant code',
        'Litres',
        'Price per litre',
        'Fuel amount',
        'Service charge',
        'Purchase total',
        'Type',
        'Status',
      ],
      data.items.map((r) => [
        formatDateTime(r.completedAt ?? r.createdAt),
        r.customerSnapshot ? `${r.customerSnapshot.firstName} ${r.customerSnapshot.lastName}` : '',
        r.businessName ?? '',
        r.merchantCode ?? '',
        formatNumber(r.fuelLitres, 2),
        String(r.pricePerLitre),
        String(r.amount),
        String(r.serviceCharge),
        String(r.purchaseTotal),
        purchaseTypeLabel(r.purchaseType),
        r.status === 'completed' ? 'success' : r.status,
      ]),
    )
  }

  return (
    <div>
      <PageHeader
        title="Merchant fuel sales"
        description="Filter by station, status, and sale date. KPIs match the same filters — service revenue is your platform take."
        actions={
          <>
            <Button variant="secondary" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button variant="secondary" onClick={handleExport}>
              Export CSV
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Litres sold"
          value={formatLitres(summary?.totalLitres ?? 0)}
          sub={`${summary?.salesCount ?? 0} sales in current filters`}
          accent="green"
        />
        <KpiCard
          label="Fuel amount"
          value={formatCurrency(summary?.totalFuelAmount ?? 0)}
          sub="Sum of fuel cost (filters)"
          accent="amber"
        />
        <KpiCard
          label="Service revenue"
          value={formatCurrency(summary?.totalServiceCharge ?? 0)}
          sub="Platform take — same filters"
          accent="red"
        />
        <KpiCard
          label="Today (all stations)"
          value={formatLitres(dashboard?.sales.todayLitres ?? 0)}
          sub={`${formatCurrency(dashboard?.sales.todayVolume ?? 0)} · ${dashboard?.sales.todayCount ?? 0} sales`}
          accent="blue"
        />
      </div>

      <DataTable
        data={data?.items ?? []}
        columns={columns}
        pagination={data?.pagination}
        onPageChange={setPage}
        onLimitChange={(l) => {
          setLimit(l)
          setPage(1)
        }}
        loading={isLoading}
        toolbar={
          <>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setPage(1)
              }}
              className="w-40"
              title="From date (completed sales use completion date)"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value)
                setPage(1)
              }}
              className="w-40"
              title="To date (completed sales use completion date)"
            />
            <Input
              placeholder="Station code (MCH...)"
              value={merchantCode}
              onChange={(e) => {
                setMerchantCode(e.target.value)
                setPage(1)
              }}
              className="w-48"
            />
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All statuses</option>
              <option value="completed">Success</option>
              <option value="failed">Failed</option>
              <option value="declined">Declined</option>
            </Select>
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as SalesSortBy)}>
              <option value="completedAt">Sort: Completed</option>
              <option value="createdAt">Sort: Created</option>
              <option value="serviceCharge">Sort: Service revenue</option>
              <option value="amount">Sort: Fuel amount</option>
              <option value="fuelLitres">Sort: Litres</option>
            </Select>
            <Select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </Select>
            <Link
              to="/"
              className="inline-flex items-center rounded-lg border border-(--border) px-3 py-2 text-xs text-(--text-muted) hover:text-(--text-primary)"
            >
              Dashboard
            </Link>
          </>
        }
      />
    </div>
  )
}

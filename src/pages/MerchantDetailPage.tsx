import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { adminApi } from '../api/admin'
import { DataTable } from '../components/data-table/DataTable'
import { Button, Card, Input, KpiCard, PageHeader, Spinner, StatusBadge } from '../components/ui'
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '../lib/utils'
import type {
  AdminMerchantSellerSummary,
  AdminSaleRow,
  AdminMerchantBranchSummary,
} from '../types/api'

type Tab = 'sales' | 'branches' | 'staff'

export function MerchantDetailPage() {
  const { merchantId = '' } = useParams()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('sales')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const merchantQuery = useQuery({
    queryKey: ['admin', 'merchant', merchantId],
    queryFn: () => adminApi.getMerchant(merchantId),
    enabled: !!merchantId,
  })

  const summaryQuery = useQuery({
    queryKey: ['admin', 'merchant', merchantId, 'sales-summary', fromDate, toDate],
    queryFn: () =>
      adminApi.merchantSalesSummary(merchantId, {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
    enabled: !!merchantId,
  })

  const salesQuery = useQuery({
    queryKey: ['admin', 'merchant', merchantId, 'sales', page, limit, fromDate, toDate],
    queryFn: () =>
      adminApi.merchantSales(merchantId, {
        page,
        limit,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
    enabled: !!merchantId && tab === 'sales',
  })

  const branchesQuery = useQuery({
    queryKey: ['admin', 'merchant', merchantId, 'branches'],
    queryFn: () => adminApi.merchantBranches(merchantId),
    enabled: !!merchantId && tab === 'branches',
  })

  const sellersQuery = useQuery({
    queryKey: ['admin', 'merchant', merchantId, 'sellers'],
    queryFn: () => adminApi.merchantSellers(merchantId),
    enabled: !!merchantId && tab === 'staff',
  })

  const approveMutation = useMutation({
    mutationFn: () => adminApi.approveMerchant(merchantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'merchant', merchantId] })
      qc.invalidateQueries({ queryKey: ['admin', 'merchants'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })

  const suspendMutation = useMutation({
    mutationFn: () => adminApi.suspendMerchant(merchantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'merchant', merchantId] })
      qc.invalidateQueries({ queryKey: ['admin', 'merchants'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })

  const salesColumns = useMemo<ColumnDef<AdminSaleRow>[]>(
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
          const c = row.original.customerSnapshot
          return c ? `${c.firstName} ${c.lastName}` : '—'
        },
      },
      {
        accessorKey: 'fuelLitres',
        header: 'Litres',
        cell: ({ getValue }) => `${formatNumber(getValue<number>(), 2)} L`,
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ getValue }) => formatCurrency(getValue<number>()),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
    ],
    [],
  )

  const branchColumns = useMemo<ColumnDef<AdminMerchantBranchSummary>[]>(
    () => [
      { accessorKey: 'name', header: 'Branch' },
      {
        id: 'location',
        header: 'Location',
        cell: ({ row }) => `${row.original.city}, ${row.original.state}`,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: 'isPrimary',
        header: 'Primary',
        cell: ({ getValue }) => (getValue<boolean>() ? 'Yes' : '—'),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ getValue }) => formatDate(getValue<string>()),
      },
    ],
    [],
  )

  const staffColumns = useMemo<ColumnDef<AdminMerchantSellerSummary>[]>(
    () => [
      {
        id: 'name',
        header: 'Staff',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">
              {row.original.firstName} {row.original.lastName}
            </p>
            <p className="text-xs text-(--text-muted)">{row.original.email}</p>
          </div>
        ),
      },
      { accessorKey: 'phone', header: 'Phone' },
      {
        id: 'branch',
        header: 'Branch',
        cell: ({ row }) => row.original.branchName ?? '—',
      },
      {
        accessorKey: 'accountStatus',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: 'createdAt',
        header: 'Joined',
        cell: ({ getValue }) => formatDate(getValue<string>()),
      },
    ],
    [],
  )

  if (merchantQuery.isLoading || !merchantQuery.data) {
    return <Spinner />
  }

  const m = merchantQuery.data
  const summary = summaryQuery.data

  return (
    <div>
      <PageHeader
        title={m.businessName || m.merchantName}
        description={`${m.merchantId} · ${m.city} · ${m.stationBranch}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/merchants"
              className="inline-flex items-center rounded-lg border border-(--border) bg-(--bg-hover) px-3 py-2 text-sm font-medium text-(--text-primary) hover:bg-(--border)"
            >
              Back
            </Link>
            {m.status === 'pending' && (
              <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
                Approve
              </Button>
            )}
            {m.status === 'approved' && (
              <Button
                variant="danger"
                onClick={() => suspendMutation.mutate()}
                disabled={suspendMutation.isPending}
              >
                Suspend
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge status={m.status} />
        <span className="text-(--text-muted)">
          {m.email} · {m.phone}
        </span>
        {m.fuelPricePerLitre != null && (
          <span className="text-(--text-muted)">Price/L {formatCurrency(m.fuelPricePerLitre)}</span>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Sales count"
          value={String(summary?.salesCount ?? '—')}
          sub="In selected range (or all time)"
          accent="blue"
        />
        <KpiCard
          label="Gross sales"
          value={formatCurrency(summary?.grossAmount ?? 0)}
          sub="Completed fuel purchases"
          accent="green"
        />
        <KpiCard label="Status" value={m.status} sub={`Created ${formatDate(m.createdAt)}`} accent="amber" />
        <KpiCard
          label="Contact"
          value={m.merchantName}
          sub={`${m.lga}, ${m.state}`}
          accent="red"
        />
      </div>

      <Card className="mb-4 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1 block text-xs text-(--text-muted)">From</label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-(--text-muted)">To</label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setFromDate('')
            setToDate('')
            setPage(1)
          }}
        >
          Clear dates
        </Button>
      </Card>

      <div className="mb-4 flex gap-2">
        {(
          [
            ['sales', 'Sales'],
            ['branches', 'Branches'],
            ['staff', 'Staff'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={tab === key ? 'primary' : 'secondary'}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === 'sales' && (
        <DataTable
          data={salesQuery.data?.items ?? []}
          columns={salesColumns}
          pagination={salesQuery.data?.pagination}
          onPageChange={setPage}
          onLimitChange={(l) => {
            setLimit(l)
            setPage(1)
          }}
          loading={salesQuery.isLoading}
          emptyMessage="No sales for this merchant"
        />
      )}

      {tab === 'branches' && (
        <DataTable
          data={branchesQuery.data ?? []}
          columns={branchColumns}
          loading={branchesQuery.isLoading}
          emptyMessage="No branches found"
        />
      )}

      {tab === 'staff' && (
        <DataTable
          data={sellersQuery.data ?? []}
          columns={staffColumns}
          loading={sellersQuery.isLoading}
          emptyMessage="No staff / sellers found"
        />
      )}
    </div>
  )
}

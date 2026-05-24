import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { adminApi } from '../api/admin'
import { DataTable } from '../components/data-table/DataTable'
import { Button, Input, PageHeader, Select, StatusBadge } from '../components/ui'
import { downloadCsv, formatCurrency, formatDateTime, formatNumber } from '../lib/utils'
import type { AdminSaleRow } from '../types/api'

export function TransactionsPage() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [merchantCode, setMerchantCode] = useState('')
  const [status, setStatus] = useState('')
  const [settlementStatus, setSettlementStatus] = useState('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'amount' | 'completedAt'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'sales', page, limit, merchantCode, status, settlementStatus, sortBy, sortOrder],
    queryFn: () =>
      adminApi.sales({
        page,
        limit,
        merchantCode: merchantCode || undefined,
        status: (status || undefined) as AdminSaleRow['status'],
        settlementStatus: (settlementStatus || undefined) as 'unsettled' | 'settled',
        sortBy,
        sortOrder,
      }),
  })

  const columns = useMemo<ColumnDef<AdminSaleRow>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: ({ row }) => formatDateTime(row.original.completedAt ?? row.original.createdAt),
      },
      {
        accessorKey: 'merchantCode',
        header: 'Merchant',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.merchantCode ?? '—'}</p>
            <p className="text-xs text-(--text-muted)">{row.original.businessName}</p>
          </div>
        ),
      },
      {
        accessorKey: 'fuelLitres',
        header: 'Litres',
        cell: ({ getValue }) => `${formatNumber(getValue<number>(), 2)} L`,
      },
      {
        accessorKey: 'pricePerLitre',
        header: 'Price/L',
        cell: ({ getValue }) => formatCurrency(getValue<number>()),
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

  const handleExport = () => {
    if (!data?.items.length) return
    downloadCsv(
      'fuel-sales.csv',
      ['Date', 'Merchant', 'Business', 'Litres', 'Price/L', 'Amount', 'Status'],
      data.items.map((r) => [
        formatDateTime(r.completedAt ?? r.createdAt),
        r.merchantCode ?? '',
        r.businessName ?? '',
        String(r.fuelLitres),
        String(r.pricePerLitre),
        String(r.amount),
        r.status,
      ]),
    )
  }

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="All fuel sales across merchants"
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
              placeholder="Merchant code (MCH...)"
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
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="declined">Declined</option>
            </Select>
            <Select
              value={settlementStatus}
              onChange={(e) => {
                setSettlementStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All settlements</option>
              <option value="unsettled">Unsettled</option>
              <option value="settled">Settled</option>
            </Select>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="createdAt">Sort: Date</option>
              <option value="amount">Sort: Amount</option>
              <option value="completedAt">Sort: Completed</option>
            </Select>
            <Select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </Select>
          </>
        }
      />
    </div>
  )
}

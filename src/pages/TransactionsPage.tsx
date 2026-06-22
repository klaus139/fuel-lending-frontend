import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { adminApi } from '../api/admin'
import { LoanBreakdownCell } from '../components/LoanBreakdownCell'
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
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) => {
          const customer = row.original.customerSnapshot
          if (!customer) return <span className="text-(--text-muted)">—</span>
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
        id: 'purchase',
        header: 'This purchase',
        cell: ({ row }) => {
          const purchase = row.original.transactionBreakdown
          return (
            <div className="min-w-36 space-y-0.5 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-(--text-muted)">Litres</span>
                <span>{formatNumber(purchase.litresConsumed, 2)} L</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-(--text-muted)">Fuel cost</span>
                <span>{formatCurrency(purchase.fuelCost)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-(--text-muted)">Interest</span>
                <span>{formatCurrency(purchase.interestAdded)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-(--text-muted)">Total</span>
                <span className="font-medium">{formatCurrency(purchase.purchaseTotal)}</span>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'pricePerLitre',
        header: 'Price/L',
        cell: ({ getValue }) => formatCurrency(getValue<number>()),
      },
      {
        id: 'loan',
        header: 'Loan snapshot',
        cell: ({ row }) =>
          row.original.loanBreakdown ? (
            <LoanBreakdownCell breakdown={row.original.loanBreakdown} />
          ) : (
            <span className="text-xs text-(--text-muted)">No linked loan</span>
          ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  )

  const handleExport = () => {
    if (!data?.items.length) return
    downloadCsv(
      'fuel-sales.csv',
      [
        'Date',
        'Customer',
        'Merchant',
        'Litres',
        'Fuel Cost',
        'Interest',
        'Purchase Total',
        'Credit Limit',
        'Disbursed',
        'Spent',
        'Unspent',
        'Loan To Pay',
        'Loan Litres',
        'Status',
      ],
      data.items.map((r) => [
        formatDateTime(r.completedAt ?? r.createdAt),
        r.customerSnapshot ? `${r.customerSnapshot.firstName} ${r.customerSnapshot.lastName}` : '',
        r.merchantCode ?? '',
        String(r.transactionBreakdown.litresConsumed),
        String(r.transactionBreakdown.fuelCost),
        String(r.transactionBreakdown.interestAdded),
        String(r.transactionBreakdown.purchaseTotal),
        r.loanBreakdown ? String(r.loanBreakdown.creditLimit) : '',
        r.loanBreakdown ? String(r.loanBreakdown.amountDisbursed) : '',
        r.loanBreakdown ? String(r.loanBreakdown.amountSpent) : '',
        r.loanBreakdown ? String(r.loanBreakdown.amountUnspent) : '',
        r.loanBreakdown ? String(r.loanBreakdown.amountToPay) : '',
        r.loanBreakdown ? String(r.loanBreakdown.litresConsumed) : '',
        r.status ?? 'unknown',
      ]),
    )
  }

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Fuel purchases with per-sale and linked loan breakdowns"
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

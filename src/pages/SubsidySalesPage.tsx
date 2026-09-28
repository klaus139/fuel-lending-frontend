import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { adminApi } from '../api/admin'
import { DataTable } from '../components/data-table/DataTable'
import { Button, Input, PageHeader, Select, StatusBadge } from '../components/ui'
import { downloadCsv, formatCurrency, formatDateTime, formatNumber } from '../lib/utils'
import type { SubsidySaleRow } from '../types/api'

export function SubsidySalesPage() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [merchantCode, setMerchantCode] = useState('')
  const [settlementStatus, setSettlementStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: [
      'admin',
      'subsidy-sales',
      page,
      limit,
      fromDate,
      toDate,
      merchantCode,
      settlementStatus,
    ],
    queryFn: () =>
      adminApi.listSubsidySales({
        page,
        limit,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        merchantCode: merchantCode || undefined,
        settlementStatus: (settlementStatus || undefined) as 'settled' | 'unsettled',
      }),
  })

  const columns = useMemo<ColumnDef<SubsidySaleRow>[]>(
    () => [
      {
        id: 'customer',
        header: 'Beneficiary',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.customerName}</p>
            <p className="text-xs text-(--text-muted)">{row.original.customerPhone}</p>
          </div>
        ),
      },
      {
        id: 'station',
        header: 'Station',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.businessName}</p>
            <p className="text-xs text-(--text-muted)">{row.original.merchantCode || '—'}</p>
          </div>
        ),
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
        accessorKey: 'completedAt',
        header: 'Completed',
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
      {
        id: 'settled',
        header: 'Settlement',
        cell: ({ row }) => (
          <StatusBadge status={row.original.settled ? 'paid' : 'pending'} />
        ),
      },
    ],
    [],
  )

  const handleExport = () => {
    if (!data?.items.length) return
    downloadCsv(
      'subsidy-sales.csv',
      ['Beneficiary', 'Phone', 'Station', 'Merchant', 'Litres', 'Amount', 'Date', 'Settled'],
      data.items.map((row) => [
        row.customerName,
        row.customerPhone,
        row.businessName,
        row.merchantCode,
        String(row.fuelLitres),
        String(row.amount),
        row.salesDate,
        row.settled ? 'yes' : 'no',
      ]),
    )
  }

  return (
    <div>
      <PageHeader
        title="Subsidy sales"
        description="Fuel fills covered by the government subsidy programme"
        actions={
          <Button variant="secondary" onClick={handleExport}>
            Export CSV
          </Button>
        }
      />

      <DataTable
        data={data?.items ?? []}
        columns={columns}
        pagination={data?.pagination}
        onPageChange={setPage}
        onLimitChange={(next) => {
          setLimit(next)
          setPage(1)
        }}
        loading={isLoading}
        emptyMessage="No subsidy sales yet"
        toolbar={
          <>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setPage(1)
              }}
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value)
                setPage(1)
              }}
            />
            <Input
              placeholder="Merchant code"
              value={merchantCode}
              onChange={(e) => {
                setMerchantCode(e.target.value)
                setPage(1)
              }}
              className="w-40"
            />
            <Select
              value={settlementStatus}
              onChange={(e) => {
                setSettlementStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All sales</option>
              <option value="unsettled">Unsettled</option>
              <option value="settled">Settled</option>
            </Select>
          </>
        }
      />
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { adminApi } from '../api/admin'
import { DataTable } from '../components/data-table/DataTable'
import {
  Button,
  FormField,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
} from '../components/ui'
import { downloadCsv, formatCurrency, formatDate } from '../lib/utils'
import type { Settlement } from '../types/api'

export function SettlementsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [status, setStatus] = useState('')
  const [markPaid, setMarkPaid] = useState<Settlement | null>(null)
  const [paymentRef, setPaymentRef] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settlements', page, limit, status],
    queryFn: () =>
      adminApi.financeSettlements({
        page,
        limit,
        status: (status || undefined) as Settlement['status'],
      }),
  })

  const generateMutation = useMutation({
    mutationFn: () => adminApi.generateSettlements(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'settlements'] }),
  })

  const markPaidMutation = useMutation({
    mutationFn: () =>
      adminApi.markSettlementPaid(String(markPaid!._id ?? markPaid!.id), paymentRef || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settlements'] })
      setMarkPaid(null)
      setPaymentRef('')
    },
  })

  const columns = useMemo<ColumnDef<Settlement & { merchantName?: string; businessName?: string }>[]>(
    () => [
      {
        accessorKey: 'merchantCode',
        header: 'Merchant',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.merchantCode}</p>
            <p className="text-xs text-(--text-muted)">
              {(row.original as { businessName?: string }).businessName ?? row.original.merchantCode}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'settlementDate',
        header: 'Date',
        cell: ({ getValue }) => formatDate(getValue<string>()),
      },
      {
        accessorKey: 'transactionCount',
        header: 'Sales',
      },
      {
        accessorKey: 'grossAmount',
        header: 'Amount',
        cell: ({ getValue }) => formatCurrency(getValue<number>()),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: 'paymentReference',
        header: 'Payment Ref',
        cell: ({ getValue }) => getValue<string>() ?? '—',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) =>
          row.original.status === 'pending' ? (
            <Button size="sm" onClick={() => setMarkPaid(row.original)}>
              Mark Paid
            </Button>
          ) : (
            <span className="text-xs text-(--text-muted)">
              {row.original.paidAt ? formatDate(row.original.paidAt) : '—'}
            </span>
          ),
      },
    ],
    [],
  )

  const handleExport = () => {
    if (!data?.items.length) return
    downloadCsv(
      'settlements.csv',
      ['Merchant', 'Date', 'Sales', 'Amount', 'Status', 'Payment Ref'],
      data.items.map((s) => [
        s.merchantCode,
        s.settlementDate,
        String(s.transactionCount),
        String(s.grossAmount),
        s.status,
        s.paymentReference ?? '',
      ]),
    )
  }

  return (
    <div>
      <PageHeader
        title="Settlements"
        description="Merchant payout batches — mark paid after bank transfer"
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              Export CSV
            </Button>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? 'Generating...' : 'Generate Today'}
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
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </Select>
        }
      />

      <Modal open={!!markPaid} onClose={() => setMarkPaid(null)} title="Mark Settlement Paid">
        <p className="mb-4 text-sm text-(--text-secondary)">
          {markPaid?.merchantCode} · {formatDate(markPaid?.settlementDate)} ·{' '}
          {formatCurrency(markPaid?.grossAmount ?? 0)}
        </p>
        <FormField label="Payment reference">
          <Input
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
            placeholder="Bank transfer reference"
          />
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setMarkPaid(null)}>Cancel</Button>
          <Button onClick={() => markPaidMutation.mutate()} disabled={markPaidMutation.isPending}>
            {markPaidMutation.isPending ? 'Saving...' : 'Confirm Paid'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

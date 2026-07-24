import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { adminApi } from '../api/admin'
import { getApiErrorMessage } from '../api/client'
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
import { useToast } from '../components/ui/Toast'
import { downloadCsv, formatCurrency, formatDate, formatNumber } from '../lib/utils'
import type { Settlement } from '../types/api'

function settlementId(s: Settlement) {
  return String(s._id ?? s.id)
}

export function SettlementsPage() {
  const qc = useQueryClient()
  const toast = useToast()
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

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'settlements'] })
  }

  const markPaidMutation = useMutation({
    mutationFn: () =>
      adminApi.markSettlementPaid(settlementId(markPaid!), paymentRef || undefined),
    onSuccess: () => {
      invalidate()
      setMarkPaid(null)
      setPaymentRef('')
      toast.success('Settlement marked paid — awaiting merchant confirmation')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Failed to mark settlement paid'))
    },
  })

  const requestApprovalMutation = useMutation({
    mutationFn: (id: string) => adminApi.requestSettlementApproval(id),
    onSuccess: () => {
      invalidate()
      toast.success('Submitted for checker approval')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Failed to submit for approval'))
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveSettlement(id),
    onSuccess: () => {
      invalidate()
      toast.success('Settlement approved — you can mark paid after transfer')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Failed to approve settlement'))
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
        accessorKey: 'totalLitres',
        header: 'Litres',
        cell: ({ row }) =>
          row.original.totalLitres != null
            ? `${formatNumber(row.original.totalLitres, 2)} L`
            : '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        id: 'approval',
        header: 'Approval',
        cell: ({ row }) => {
          const approval = row.original.approvalStatus ?? 'none'
          if (approval === 'none') return <span className="text-xs text-(--text-muted)">—</span>
          return <StatusBadge status={approval} />
        },
      },
      {
        accessorKey: 'paymentReference',
        header: 'Payment Ref',
        cell: ({ getValue }) => getValue<string>() ?? '—',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const s = row.original
          const id = settlementId(s)
          const approval = s.approvalStatus ?? 'none'

          if (s.status === 'paid') {
            return <span className="text-xs text-amber-500">Awaiting merchant</span>
          }
          if (s.status === 'confirmed') {
            return (
              <span className="text-xs text-emerald-500">
                {s.confirmedAt ? formatDate(s.confirmedAt) : 'Confirmed'}
              </span>
            )
          }

          // pending payout lifecycle
          return (
            <div className="flex flex-wrap gap-2">
              {approval === 'none' || approval === 'rejected' ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={requestApprovalMutation.isPending}
                  onClick={() => requestApprovalMutation.mutate(id)}
                >
                  Submit approval
                </Button>
              ) : null}
              {approval === 'pending_approval' ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(id)}
                >
                  Approve
                </Button>
              ) : null}
              <Button size="sm" onClick={() => setMarkPaid(s)}>
                Mark Paid
              </Button>
            </div>
          )
        },
      },
    ],
    [approveMutation.isPending, requestApprovalMutation.isPending],
  )

  const handleExport = () => {
    if (!data?.items.length) return
    downloadCsv(
      'settlements.csv',
      ['Merchant', 'Date', 'Sales', 'Amount', 'Status', 'Approval', 'Payment Ref'],
      data.items.map((s) => [
        s.merchantCode,
        s.settlementDate,
        String(s.transactionCount),
        String(s.grossAmount),
        s.status,
        s.approvalStatus ?? 'none',
        s.paymentReference ?? '',
      ]),
    )
  }

  return (
    <div>
      <PageHeader
        title="Settlements"
        description="1) Submit approval → 2) Approve → 3) Transfer & Mark Paid → 4) Merchant confirms receipt"
        actions={
          <Button variant="secondary" onClick={handleExport}>
            Export CSV
          </Button>
        }
      />

      <div className="mb-4 rounded-xl border border-(--border) bg-(--surface-elevated) px-4 py-3 text-sm text-(--text-secondary)">
        Maker-checker is on: <strong className="text-(--text-primary)">Submit approval</strong>, then a
        different admin <strong className="text-(--text-primary)">Approves</strong>, then{' '}
        <strong className="text-(--text-primary)">Mark Paid</strong> after the bank transfer. The merchant
        confirms receipt in their app.
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
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid (awaiting merchant)</option>
            <option value="confirmed">Confirmed</option>
          </Select>
        }
      />

      <Modal open={!!markPaid} onClose={() => setMarkPaid(null)} title="Mark Settlement Paid">
        <p className="mb-4 text-sm text-(--text-secondary)">
          {markPaid?.merchantCode} · {formatDate(markPaid?.settlementDate)} ·{' '}
          {formatCurrency(markPaid?.grossAmount ?? 0)}
        </p>
        <p className="mb-4 text-sm text-(--text-secondary)">
          Only mark paid after the bank transfer is done. The merchant will then confirm
          receipt in the merchant app.
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

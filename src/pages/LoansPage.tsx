import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { adminApi } from '../api/admin'
import { LoanDetailModal } from '../components/LoanDetailModal'
import { DataTable } from '../components/data-table/DataTable'
import {
  Button,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  FormField,
} from '../components/ui'
import { downloadCsv, formatCurrency, formatDate } from '../lib/utils'
import type { AdminLoanListItem, AdminOverdueLoanItem } from '../types/api'

type Tab = 'all' | 'overdue' | 'unpaid'
type LoanRow = AdminLoanListItem | AdminOverdueLoanItem

export function LoansPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [status, setStatus] = useState('')
  const [detailLoan, setDetailLoan] = useState<LoanRow | null>(null)
  const [closeLoan, setCloseLoan] = useState<AdminLoanListItem | null>(null)
  const [closeNote, setCloseNote] = useState('')
  const [closeResolution, setCloseResolution] = useState<'repaid' | 'defaulted'>('repaid')

  const { data: allData, isLoading: allLoading } = useQuery({
    queryKey: ['admin', 'loans', page, limit, status],
    queryFn: () =>
      adminApi.loans({
        page,
        limit,
        status: (status || undefined) as AdminLoanListItem['status'],
      }),
    enabled: tab === 'all' || tab === 'unpaid',
  })

  const { data: overdueData, isLoading: overdueLoading } = useQuery({
    queryKey: ['admin', 'loans-overdue', page, limit],
    queryFn: () => adminApi.overdueLoans(page, limit),
    enabled: tab === 'overdue',
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveLoan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'loans'] }),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminApi.rejectLoan(id, 'Rejected by admin'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'loans'] }),
  })

  const closeMutation = useMutation({
    mutationFn: () => adminApi.closeLoan(closeLoan!.id, closeResolution, closeNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'loans'] })
      qc.invalidateQueries({ queryKey: ['admin', 'loans-overdue'] })
      setCloseLoan(null)
      setCloseNote('')
    },
  })

  const items: LoanRow[] =
    tab === 'overdue'
      ? (overdueData?.items ?? [])
      : tab === 'unpaid'
        ? (allData?.items ?? []).filter(
            (l) => l.outstandingBalance > 0 && ['active', 'partially_repaid', 'defaulted'].includes(l.status),
          )
        : (allData?.items ?? [])

  const pagination = tab === 'overdue' ? overdueData?.pagination : allData?.pagination
  const isLoading = tab === 'overdue' ? overdueLoading : allLoading

  const columns = useMemo<ColumnDef<LoanRow>[]>(
    () => [
      {
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setDetailLoan(row.original)}
            className="text-left hover:opacity-80"
          >
            <p className="font-medium text-emerald-500">
              {row.original.customer.firstName} {row.original.customer.lastName}
            </p>
            <p className="text-xs text-(--text-muted)">{row.original.customer.email}</p>
          </button>
        ),
      },
      {
        id: 'disbursed',
        header: 'Disbursed',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setDetailLoan(row.original)}
            className="hover:text-emerald-500"
          >
            {formatCurrency(row.original.breakdown.amountDisbursed)}
          </button>
        ),
      },
      {
        id: 'spent',
        header: 'Spent',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setDetailLoan(row.original)}
            className="hover:text-emerald-500"
          >
            {formatCurrency(row.original.breakdown.amountSpent)}
          </button>
        ),
      },
      {
        id: 'unspent',
        header: 'Unspent',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setDetailLoan(row.original)}
            className="hover:text-emerald-500"
          >
            {formatCurrency(row.original.breakdown.amountUnspent)}
          </button>
        ),
      },
      {
        accessorKey: 'dueDate',
        header: 'Due',
        cell: ({ row }) => (
          <div>
            <p>{formatDate(row.original.dueDate)}</p>
            {'daysOverdue' in row.original && row.original.daysOverdue > 0 && (
              <p className="text-xs text-red-400">{row.original.daysOverdue}d overdue</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="secondary" onClick={() => setDetailLoan(row.original)}>
              View
            </Button>
            {row.original.status === 'pending' && (
              <>
                <Button size="sm" onClick={() => approveMutation.mutate(row.original.id)}>
                  Approve
                </Button>
                <Button size="sm" variant="danger" onClick={() => rejectMutation.mutate(row.original.id)}>
                  Reject
                </Button>
              </>
            )}
            {['active', 'partially_repaid'].includes(row.original.status) && (
              <Button size="sm" variant="danger" onClick={() => setCloseLoan(row.original)}>
                Close
              </Button>
            )}
          </div>
        ),
      },
    ],
    [approveMutation, rejectMutation],
  )

  const handleExport = () => {
    if (!items.length) return
    downloadCsv(
      `loans-${tab}.csv`,
      [
        'Customer',
        'Email',
        'Credit Limit',
        'Disbursed',
        'Spent',
        'Unspent',
        'To Pay',
        'Litres',
        'Due',
        'Status',
      ],
      items.map((l) => [
        `${l.customer.firstName} ${l.customer.lastName}`,
        l.customer.email,
        String(l.breakdown.creditLimit),
        String(l.breakdown.amountDisbursed),
        String(l.breakdown.amountSpent),
        String(l.breakdown.amountUnspent),
        String(l.breakdown.amountToPay),
        String(l.breakdown.litresConsumed),
        formatDate(l.dueDate),
        l.status,
      ]),
    )
  }

  return (
    <div>
      <PageHeader
        title="Loans"
        description="Fuel credit disbursements — click a row to view full loan details"
        actions={
          <Button variant="secondary" onClick={handleExport}>
            Export CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(['all', 'overdue', 'unpaid'] as Tab[]).map((t) => (
          <Button
            key={t}
            variant={tab === t ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setTab(t)
              setPage(1)
            }}
          >
            {t === 'all' ? 'All Loans' : t === 'overdue' ? 'Overdue' : 'Unpaid'}
          </Button>
        ))}
      </div>

      <DataTable
        data={items}
        columns={columns}
        pagination={pagination}
        onPageChange={setPage}
        onLimitChange={(l) => {
          setLimit(l)
          setPage(1)
        }}
        loading={isLoading}
        toolbar={
          tab === 'all' ? (
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="partially_repaid">Partially repaid</option>
              <option value="repaid">Repaid</option>
              <option value="defaulted">Defaulted</option>
              <option value="rejected">Rejected</option>
            </Select>
          ) : null
        }
      />

      <LoanDetailModal loan={detailLoan} onClose={() => setDetailLoan(null)} />

      <Modal open={!!closeLoan} onClose={() => setCloseLoan(null)} title="Close Loan">
        <p className="mb-4 text-sm text-(--text-secondary)">
          Close loan for {closeLoan?.customer.firstName} {closeLoan?.customer.lastName} — outstanding{' '}
          {formatCurrency(closeLoan?.breakdown.amountToPay ?? 0)}
        </p>
        <FormField label="Resolution">
          <Select
            value={closeResolution}
            onChange={(e) => setCloseResolution(e.target.value as 'repaid' | 'defaulted')}
          >
            <option value="repaid">Repaid</option>
            <option value="defaulted">Defaulted</option>
          </Select>
        </FormField>
        <FormField label="Note (optional)">
          <Input value={closeNote} onChange={(e) => setCloseNote(e.target.value)} placeholder="Admin note" />
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCloseLoan(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending}>
            {closeMutation.isPending ? 'Closing...' : 'Close Loan'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

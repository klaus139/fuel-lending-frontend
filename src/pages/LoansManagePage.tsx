import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
  Textarea,
} from '../components/ui'
import { downloadCsv, formatCurrency, formatDate } from '../lib/utils'
import type { AdminLoanListItem, AdminOverdueLoanItem } from '../types/api'

type Tab = 'all' | 'overdue' | 'unpaid' | 'collections'
type LoanRow = AdminLoanListItem | AdminOverdueLoanItem

export function LoansManagePage() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialStatus = searchParams.get('status') ?? ''
  const initialTab = (searchParams.get('tab') as Tab | null) ?? 'all'

  const [tab, setTab] = useState<Tab>(
    initialTab === 'collections' || initialTab === 'overdue' || initialTab === 'unpaid'
      ? initialTab
      : 'all',
  )
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [status, setStatus] = useState(initialStatus)
  const [dpdBucket, setDpdBucket] = useState('')
  const [rejectLoan, setRejectLoan] = useState<AdminLoanListItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [closeLoan, setCloseLoan] = useState<AdminLoanListItem | null>(null)
  const [closeNote, setCloseNote] = useState('')
  const [closeResolution, setCloseResolution] = useState<'repaid' | 'defaulted'>('repaid')
  const [actionMessage, setActionMessage] = useState<string | null>(null)

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

  const { data: collectionsData, isLoading: collectionsLoading } = useQuery({
    queryKey: ['admin', 'loans-collections', page, limit, dpdBucket],
    queryFn: () => adminApi.collectionsByDpd(page, limit, dpdBucket || undefined),
    enabled: tab === 'collections',
  })

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'loans'] })
    void qc.invalidateQueries({ queryKey: ['admin', 'loans-overdue'] })
    void qc.invalidateQueries({ queryKey: ['admin', 'loans-collections'] })
    void qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
  }

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveLoan(id),
    onSuccess: () => {
      invalidate()
      setActionMessage('Loan approved and fuel credit disbursed')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: () => adminApi.rejectLoan(rejectLoan!.id, rejectReason.trim() || 'Rejected by admin'),
    onSuccess: () => {
      invalidate()
      setRejectLoan(null)
      setRejectReason('')
      setActionMessage('Loan rejected')
    },
  })

  const closeMutation = useMutation({
    mutationFn: () => adminApi.closeLoan(closeLoan!.id, closeResolution, closeNote),
    onSuccess: () => {
      invalidate()
      setCloseLoan(null)
      setCloseNote('')
      setActionMessage('Loan closed')
    },
  })

  const items: LoanRow[] =
    tab === 'overdue'
      ? (overdueData?.items ?? [])
      : tab === 'collections'
        ? (collectionsData?.items ?? [])
        : tab === 'unpaid'
          ? (allData?.items ?? []).filter(
              (l) =>
                l.outstandingBalance > 0 &&
                ['active', 'partially_repaid', 'defaulted'].includes(l.status),
            )
          : (allData?.items ?? [])

  const pagination =
    tab === 'overdue'
      ? overdueData?.pagination
      : tab === 'collections'
        ? collectionsData?.pagination
        : allData?.pagination

  const isLoading =
    tab === 'overdue' ? overdueLoading : tab === 'collections' ? collectionsLoading : allLoading

  const setTabAndUrl = (next: Tab) => {
    setTab(next)
    setPage(1)
    const params = new URLSearchParams(searchParams)
    if (next === 'all') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params)
  }

  const columns = useMemo<ColumnDef<LoanRow>[]>(
    () => [
      {
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) => (
          <Link to={`/loans/${row.original.id}`} className="text-left hover:opacity-80">
            <p className="font-medium text-emerald-500">
              {row.original.customer.firstName} {row.original.customer.lastName}
            </p>
            <p className="text-xs text-(--text-muted)">{row.original.customer.email}</p>
          </Link>
        ),
      },
      {
        id: 'amounts',
        header: 'Facility',
        cell: ({ row }) => (
          <div className="text-sm">
            <p>{formatCurrency(row.original.breakdown.amountDisbursed)} disbursed</p>
            <p className="text-xs text-(--text-muted)">
              Spent {formatCurrency(row.original.breakdown.amountSpent)} · To pay{' '}
              <span className="text-amber-500">
                {formatCurrency(row.original.breakdown.amountToPay)}
              </span>
            </p>
          </div>
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
        id: 'fsm',
        header: 'Lifecycle',
        cell: ({ row }) => (
          <div className="space-y-1">
            <StatusBadge status={row.original.status} />
            {row.original.canonicalStatus && (
              <p className="text-[10px] uppercase tracking-wide text-(--text-muted)">
                {String(row.original.canonicalStatus).replace(/_/g, ' ')}
              </p>
            )}
            {row.original.dpdBucket && (
              <StatusBadge status={String(row.original.dpdBucket)} />
            )}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <Link to={`/loans/${row.original.id}`}>
              <Button size="sm" variant="secondary">
                Open
              </Button>
            </Link>
            {row.original.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate(row.original.id)}
                  disabled={approveMutation.isPending}
                >
                  Disburse
                </Button>
                <Button size="sm" variant="danger" onClick={() => setRejectLoan(row.original)}>
                  Reject
                </Button>
              </>
            )}
            {['active', 'partially_repaid', 'defaulted'].includes(row.original.status) && (
              <Button size="sm" variant="danger" onClick={() => setCloseLoan(row.original)}>
                Close
              </Button>
            )}
          </div>
        ),
      },
    ],
    [approveMutation.isPending],
  )

  const handleExport = () => {
    if (!items.length) return
    downloadCsv(
      `loans-${tab}.csv`,
      [
        'Customer',
        'Email',
        'Disbursed',
        'Spent',
        'To Pay',
        'Due',
        'Status',
        'Canonical',
        'DPD',
      ],
      items.map((l) => [
        `${l.customer.firstName} ${l.customer.lastName}`,
        l.customer.email,
        String(l.breakdown.amountDisbursed),
        String(l.breakdown.amountSpent),
        String(l.breakdown.amountToPay),
        formatDate(l.dueDate),
        l.status,
        String(l.canonicalStatus ?? ''),
        String(l.dpdBucket ?? ''),
      ]),
    )
  }

  return (
    <div>
      <PageHeader
        title="Loan management"
        description="Approve & disburse, reject, collections, and close facilities"
        actions={
          <>
            <Link to="/loans">
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
            <Button variant="secondary" onClick={handleExport}>
              Export CSV
            </Button>
          </>
        }
      />

      {actionMessage && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          {actionMessage}
          <button type="button" className="ml-3 underline" onClick={() => setActionMessage(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {([
          ['all', 'All loans'],
          ['overdue', 'Overdue'],
          ['unpaid', 'Unpaid'],
          ['collections', 'Collections'],
        ] as const).map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setTabAndUrl(key)}
          >
            {label}
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
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
                const params = new URLSearchParams(searchParams)
                if (e.target.value) params.set('status', e.target.value)
                else params.delete('status')
                setSearchParams(params)
              }}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="partially_repaid">Partially repaid</option>
              <option value="repaid">Repaid</option>
              <option value="defaulted">Defaulted</option>
              <option value="rejected">Rejected</option>
            </Select>
          ) : tab === 'collections' ? (
            <Select
              value={dpdBucket}
              onChange={(e) => {
                setDpdBucket(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All DPD buckets</option>
              <option value="CURRENT">Current</option>
              <option value="DPD_1_30">1–30</option>
              <option value="DPD_31_60">31–60</option>
              <option value="DPD_61_90">61–90</option>
              <option value="DPD_90_PLUS">90+</option>
            </Select>
          ) : null
        }
      />

      <Modal open={!!rejectLoan} onClose={() => setRejectLoan(null)} title="Reject loan">
        <p className="mb-4 text-sm text-(--text-secondary)">
          Reject application for {rejectLoan?.customer.firstName} {rejectLoan?.customer.lastName}
        </p>
        <FormField label="Reason">
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason shown to ops / audit trail"
            rows={3}
          />
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRejectLoan(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => rejectMutation.mutate()}
            disabled={rejectMutation.isPending}
          >
            {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
          </Button>
        </div>
      </Modal>

      <Modal open={!!closeLoan} onClose={() => setCloseLoan(null)} title="Close loan">
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
            <option value="defaulted">Defaulted / write-off path</option>
          </Select>
        </FormField>
        <FormField label="Note (optional)">
          <Input value={closeNote} onChange={(e) => setCloseNote(e.target.value)} placeholder="Admin note" />
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCloseLoan(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => closeMutation.mutate()}
            disabled={closeMutation.isPending}
          >
            {closeMutation.isPending ? 'Closing…' : 'Close loan'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

/** @deprecated use LoansManagePage — kept for route compatibility */
export const LoansPage = LoansManagePage

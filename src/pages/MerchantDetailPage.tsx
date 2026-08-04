import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { adminApi } from '../api/admin'
import { DataTable } from '../components/data-table/DataTable'
import { Button, Card, Input, KpiCard, Modal, PageHeader, Spinner, StatusBadge, FormField, Textarea } from '../components/ui'
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
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionError, setActionError] = useState('')

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
      setActionError('')
      qc.invalidateQueries({ queryKey: ['admin', 'merchant', merchantId] })
      qc.invalidateQueries({ queryKey: ['admin', 'merchants'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
    onError: (err: Error) => setActionError(err.message || 'Failed to approve'),
  })

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => adminApi.rejectMerchant(merchantId, reason),
    onSuccess: () => {
      setActionError('')
      setRejectOpen(false)
      setRejectReason('')
      qc.invalidateQueries({ queryKey: ['admin', 'merchant', merchantId] })
      qc.invalidateQueries({ queryKey: ['admin', 'merchants'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
    onError: (err: Error) => setActionError(err.message || 'Failed to reject'),
  })

  const suspendMutation = useMutation({
    mutationFn: () => adminApi.suspendMerchant(merchantId),
    onSuccess: () => {
      setActionError('')
      qc.invalidateQueries({ queryKey: ['admin', 'merchant', merchantId] })
      qc.invalidateQueries({ queryKey: ['admin', 'merchants'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
    onError: (err: Error) => setActionError(err.message || 'Failed to suspend'),
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

  if (merchantQuery.isLoading) {
    return <Spinner />
  }

  if (!merchantQuery.data) {
    return (
      <div className="space-y-4">
        <PageHeader title="Merchant not found" description="This station profile could not be loaded." />
        <Link to="/merchants" className="text-sm text-emerald-500 hover:underline">
          Back to merchants
        </Link>
      </div>
    )
  }

  const m = merchantQuery.data
  const summary = summaryQuery.data
  const isApplication = m.status === 'pending' || m.status === 'rejected'
  const busy = approveMutation.isPending || rejectMutation.isPending || suspendMutation.isPending

  const detailRows: Array<{ label: string; value: string }> = [
    { label: 'Status', value: m.status },
    { label: 'Station code', value: m.merchantId },
    { label: 'Contact person', value: m.merchantName },
    { label: 'Email (login)', value: m.email },
    { label: 'Phone', value: m.phone },
    { label: 'Business / station name', value: m.businessName },
    { label: 'Business location', value: m.businessLocation || '—' },
    { label: 'Station branch', value: m.stationBranch },
    { label: 'Address', value: m.address },
    { label: 'City', value: m.city },
    { label: 'LGA', value: m.lga },
    { label: 'State', value: m.state },
    { label: 'Landmark', value: m.landmark || '—' },
    {
      label: 'NIN name match',
      value: m.ninVerified
        ? `Verified${
            m.ninFirstNameScore != null && m.ninLastNameScore != null
              ? ` (${Math.round(m.ninFirstNameScore * 100)}% / ${Math.round(m.ninLastNameScore * 100)}%)`
              : ''
          }`
        : 'Not verified',
    },
    { label: 'CAC / RC number', value: m.cacNumber || '—' },
    ...(m.cacDocumentUrl
      ? [{ label: 'CAC document', value: m.cacDocumentUrl }]
      : []),
    { label: 'Applied / created', value: formatDateTime(m.createdAt) },
    ...(m.reviewedAt ? [{ label: 'Reviewed', value: formatDateTime(m.reviewedAt) }] : []),
    ...(m.rejectReason ? [{ label: 'Decline reason', value: m.rejectReason }] : []),
  ]

  return (
    <div>
      <PageHeader
        title={m.businessName || m.merchantName}
        description={
          m.status === 'pending'
            ? 'Self-serve station application — review details below, then approve or decline'
            : `${m.merchantId} · ${m.city} · ${m.stationBranch}`
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/merchants"
              className="inline-flex items-center rounded-lg border border-(--border) bg-(--bg-hover) px-3 py-2 text-sm font-medium text-(--text-primary) hover:bg-(--border)"
            >
              Back
            </Link>
            {m.status === 'pending' && (
              <>
                <Button
                  onClick={() => approveMutation.mutate()}
                  disabled={busy}
                >
                  {approveMutation.isPending ? 'Approving…' : 'Approve & email login'}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setActionError('')
                    setRejectOpen(true)
                  }}
                  disabled={busy}
                >
                  Decline
                </Button>
              </>
            )}
            {m.status === 'approved' && (
              <Button
                variant="danger"
                onClick={() => suspendMutation.mutate()}
                disabled={busy}
              >
                Suspend
              </Button>
            )}
          </div>
        }
      />

      {actionError ? (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {actionError}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge status={m.status} />
        <span className="text-(--text-muted)">
          {m.email} · {m.phone}
        </span>
        {m.status === 'pending' && (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-600">
            Awaiting your decision
          </span>
        )}
      </div>

      {/* Full application / profile details */}
      <Card className="mb-6 p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-(--text-primary)">
              {m.status === 'pending' ? 'Application details' : 'Station details'}
            </h2>
            <p className="mt-0.5 text-sm text-(--text-muted)">
              {m.status === 'pending'
                ? 'Submitted via apply form. Approving creates merchant login and emails credentials.'
                : 'Contact and station profile on file.'}
            </p>
          </div>
          {m.status === 'pending' && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => approveMutation.mutate()} disabled={busy}>
                {approveMutation.isPending ? 'Approving…' : 'Approve & email login'}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setActionError('')
                  setRejectOpen(true)
                }}
                disabled={busy}
              >
                Decline with reason
              </Button>
            </div>
          )}
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {detailRows.map((row) => (
            <div
              key={row.label}
              className="rounded-lg border border-(--border) bg-(--bg-secondary)/40 px-3 py-2.5"
            >
              <dt className="text-xs font-medium uppercase tracking-wide text-(--text-muted)">
                {row.label}
              </dt>
              <dd className="mt-1 text-sm font-medium text-(--text-primary) break-words">
                {row.label === 'CAC document' && row.value.startsWith('http') ? (
                  <a
                    href={row.value}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 underline hover:text-emerald-500"
                  >
                    View document
                  </a>
                ) : (
                  row.value
                )}
              </dd>
            </div>
          ))}
        </dl>

        {m.status === 'pending' && (
          <div className="mt-5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-(--text-secondary)">
            <p className="font-medium text-emerald-600">What happens next</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Approve</strong> — contact receives email + temp password and can log in to
                the merchant app (they can change password after).
              </li>
              <li>
                <strong>Decline</strong> — contact is emailed your reason; they cannot log in.
              </li>
            </ul>
          </div>
        )}

        {m.status === 'rejected' && m.rejectReason && (
          <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <p className="font-medium">Application declined</p>
            <p className="mt-1">{m.rejectReason}</p>
          </div>
        )}
      </Card>

      <Modal
        open={rejectOpen}
        onClose={() => {
          setRejectOpen(false)
          setRejectReason('')
        }}
        title="Decline station application"
      >
        <p className="mb-3 text-sm text-(--text-secondary)">
          The contact person will be emailed this reason.
        </p>
        <FormField label="Reason">
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Why is this application being declined?"
          />
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setRejectOpen(false)
              setRejectReason('')
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={rejectReason.trim().length < 5 || rejectMutation.isPending}
            onClick={() => rejectMutation.mutate(rejectReason.trim())}
          >
            {rejectMutation.isPending ? 'Declining…' : 'Decline application'}
          </Button>
        </div>
      </Modal>

      {/* Ops / sales UI only after the station is live (or suspended). Hide noise for pure applications. */}
      {!isApplication && (
        <>
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
            <KpiCard
              label="Status"
              value={m.status}
              sub={`Created ${formatDate(m.createdAt)}`}
              accent="amber"
            />
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
        </>
      )}
    </div>
  )
}

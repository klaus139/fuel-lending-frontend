import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { adminApi } from '../api/admin'
import { DataTable } from '../components/data-table/DataTable'
import { Button, Input, Modal, PageHeader, StatusBadge } from '../components/ui'
import { formatCurrency, formatDate, formatNumber } from '../lib/utils'
import type {
  AdminSaleRow,
  ReconciliationMerchantRow,
  ReconciliationSnapshotRow,
} from '../types/api'

type View = 'merchants' | 'snapshots' | 'transactions'

export function ReconciliationPage() {
  const qc = useQueryClient()
  const [view, setView] = useState<View>('merchants')
  const [merchant, setMerchant] = useState<ReconciliationMerchantRow | null>(null)
  const [snapshot, setSnapshot] = useState<ReconciliationSnapshotRow | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [syncDate, setSyncDate] = useState(new Date().toISOString().slice(0, 10))
  const [showSync, setShowSync] = useState(false)

  const merchantsQuery = useQuery({
    queryKey: ['admin', 'reconciliation', 'merchants', page, limit],
    queryFn: () => adminApi.reconciliationMerchants(page, limit),
    enabled: view === 'merchants',
  })

  const snapshotsQuery = useQuery({
    queryKey: ['admin', 'reconciliation', 'snapshots', merchant?.merchantProfileId, page, limit],
    queryFn: () => adminApi.merchantSnapshots(merchant!.merchantProfileId, page, limit),
    enabled: view === 'snapshots' && !!merchant,
  })

  const transactionsQuery = useQuery({
    queryKey: [
      'admin',
      'reconciliation',
      'transactions',
      merchant?.merchantProfileId,
      snapshot?.salesDate,
      page,
      limit,
    ],
    queryFn: () =>
      adminApi.snapshotTransactions(merchant!.merchantProfileId, snapshot!.salesDate, page, limit),
    enabled: view === 'transactions' && !!merchant && !!snapshot,
  })

  const reconcileMutation = useMutation({
    mutationFn: (snapshotId: string) => adminApi.reconcileSnapshot(snapshotId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reconciliation'] })
      qc.invalidateQueries({ queryKey: ['admin', 'settlements'] })
    },
  })

  const initiateMutation = useMutation({
    mutationFn: (snapshotId: string) => adminApi.initiateSettlementFromSnapshot(snapshotId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reconciliation'] })
      qc.invalidateQueries({ queryKey: ['admin', 'settlements'] })
    },
  })

  const syncMutation = useMutation({
    mutationFn: () => adminApi.syncMerchantSnapshot(merchant!.merchantProfileId, syncDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reconciliation'] })
      setShowSync(false)
    },
  })

  const merchantColumns = useMemo<ColumnDef<ReconciliationMerchantRow>[]>(
    () => [
      {
        accessorKey: 'merchantCode',
        header: 'Merchant',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.merchantCode}</p>
            <p className="text-xs text-(--text-muted)">{row.original.businessName}</p>
          </div>
        ),
      },
      {
        id: 'open',
        header: 'Open days',
        cell: ({ row }) => row.original.openSnapshotCount,
      },
      {
        id: 'reconciled',
        header: 'Reconciled',
        cell: ({ row }) => row.original.reconciledSnapshotCount,
      },
      {
        accessorKey: 'latestSalesDate',
        header: 'Latest sale',
        cell: ({ getValue }) => formatDate(getValue<string>()),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setMerchant(row.original)
              setSnapshot(null)
              setPage(1)
              setView('snapshots')
            }}
          >
            View days
          </Button>
        ),
      },
    ],
    [],
  )

  const snapshotColumns = useMemo<ColumnDef<ReconciliationSnapshotRow>[]>(
    () => [
      {
        accessorKey: 'salesDate',
        header: 'Date',
        cell: ({ getValue }) => formatDate(getValue<string>()),
      },
      {
        accessorKey: 'totalAmount',
        header: 'Total sales',
        cell: ({ getValue }) => formatCurrency(getValue<number>()),
      },
      {
        accessorKey: 'totalLitres',
        header: 'Litres',
        cell: ({ getValue }) => `${formatNumber(getValue<number>(), 2)} L`,
      },
      {
        accessorKey: 'transactionCount',
        header: 'Purchases',
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
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSnapshot(row.original)
                setPage(1)
                setView('transactions')
              }}
            >
              View purchases
            </Button>
            {row.original.status === 'open' && (
              <Button
                size="sm"
                onClick={() => reconcileMutation.mutate(row.original.id)}
                disabled={reconcileMutation.isPending}
              >
                Reconcile
              </Button>
            )}
            {row.original.status === 'reconciled' && !row.original.settlementId && (
              <Button
                size="sm"
                onClick={() => initiateMutation.mutate(row.original.id)}
                disabled={initiateMutation.isPending}
              >
                Initiate settlement
              </Button>
            )}
          </div>
        ),
      },
    ],
    [initiateMutation, reconcileMutation],
  )

  const transactionColumns = useMemo<ColumnDef<AdminSaleRow>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Time',
        cell: ({ row }) => formatDate(row.original.completedAt ?? row.original.createdAt),
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

  const isLoading =
    view === 'merchants'
      ? merchantsQuery.isLoading
      : view === 'snapshots'
        ? snapshotsQuery.isLoading
        : transactionsQuery.isLoading

  const title =
    view === 'merchants'
      ? 'Reconciliation'
      : view === 'snapshots'
        ? `${merchant?.businessName ?? merchant?.merchantCode} — daily snapshots`
        : `${merchant?.merchantCode} · ${formatDate(snapshot?.salesDate)} — purchases`

  return (
    <div>
      <PageHeader
        title={title}
        description="Review merchant daily sales, reconcile totals, then initiate settlement"
        actions={
          view !== 'merchants' ? (
            <div className="flex gap-2">
              {view === 'snapshots' && (
                <Button variant="secondary" onClick={() => setShowSync(true)}>
                  Sync day
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  if (view === 'transactions') {
                    setView('snapshots')
                    setSnapshot(null)
                  } else {
                    setView('merchants')
                    setMerchant(null)
                    setSnapshot(null)
                  }
                  setPage(1)
                }}
              >
                Back
              </Button>
            </div>
          ) : undefined
        }
      />

      {view === 'transactions' && transactionsQuery.data?.snapshot && (
        <div className="mb-4 grid gap-3 rounded-xl border border-(--border) bg-(--bg-secondary) p-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-(--text-muted)">Total sales</p>
            <p className="text-lg font-semibold">
              {formatCurrency(transactionsQuery.data.snapshot.totalAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-(--text-muted)">Litres</p>
            <p className="text-lg font-semibold">
              {formatNumber(transactionsQuery.data.snapshot.totalLitres, 2)} L
            </p>
          </div>
          <div>
            <p className="text-xs text-(--text-muted)">Purchases</p>
            <p className="text-lg font-semibold">{transactionsQuery.data.snapshot.transactionCount}</p>
          </div>
          <div>
            <p className="text-xs text-(--text-muted)">Status</p>
            <StatusBadge status={transactionsQuery.data.snapshot.status} />
          </div>
        </div>
      )}

      {view === 'merchants' && (
        <DataTable
          data={merchantsQuery.data?.items ?? []}
          columns={merchantColumns}
          pagination={merchantsQuery.data?.pagination}
          onPageChange={setPage}
          onLimitChange={(l) => {
            setLimit(l)
            setPage(1)
          }}
          loading={isLoading}
        />
      )}

      {view === 'snapshots' && (
        <DataTable
          data={snapshotsQuery.data?.items ?? []}
          columns={snapshotColumns}
          pagination={snapshotsQuery.data?.pagination}
          onPageChange={setPage}
          onLimitChange={(l) => {
            setLimit(l)
            setPage(1)
          }}
          loading={isLoading}
        />
      )}

      {view === 'transactions' && (
        <DataTable
          data={transactionsQuery.data?.items ?? []}
          columns={transactionColumns}
          pagination={transactionsQuery.data?.pagination}
          onPageChange={setPage}
          onLimitChange={(l) => {
            setLimit(l)
            setPage(1)
          }}
          loading={isLoading}
        />
      )}

      <Modal open={showSync} onClose={() => setShowSync(false)} title="Sync sales snapshot">
        <p className="mb-4 text-sm text-(--text-muted)">
          Build or refresh the daily ledger for {merchant?.businessName} from completed transactions.
        </p>
        <Input type="date" value={syncDate} onChange={(e) => setSyncDate(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowSync(false)}>Cancel</Button>
          <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            {syncMutation.isPending ? 'Syncing...' : 'Sync'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

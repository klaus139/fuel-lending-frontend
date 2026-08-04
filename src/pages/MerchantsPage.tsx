import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { adminApi } from '../api/admin'
import { DataTable } from '../components/data-table/DataTable'
import {
  Button,
  Card,
  FormField,
  Input,
  KpiCard,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
} from '../components/ui'
import { downloadCsv, formatCurrency, formatDate, formatLitres } from '../lib/utils'
import type { AdminCreateMerchantInput, AdminMerchantSummary, NetworkFuelMerchantRow } from '../types/api'

const emptyCreateForm: AdminCreateMerchantInput = {
  merchantName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  stationBranch: '',
  lga: '',
  state: '',
  businessName: '',
  businessLocation: '',
  landmark: '',
  nin: '',
  cacNumber: '',
  latitude: undefined,
  longitude: undefined,
}

function toIsoStart(date: string): string | undefined {
  if (!date) return undefined
  return new Date(`${date}T00:00:00.000`).toISOString()
}

function toIsoEnd(date: string): string | undefined {
  if (!date) return undefined
  return new Date(`${date}T23:59:59.999`).toISOString()
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toDateInputValue(d)
}

function MerchantFormFields({
  form,
  setForm,
  showNin,
}: {
  form: Partial<AdminCreateMerchantInput>
  setForm: (patch: Partial<AdminCreateMerchantInput>) => void
  /** NIN is required when creating a merchant (not on edit). */
  showNin?: boolean
}) {
  return (
    <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
      <FormField label="Merchant name">
        <Input value={form.merchantName ?? ''} onChange={(e) => setForm({ merchantName: e.target.value })} />
      </FormField>
      <FormField label="Business name">
        <Input value={form.businessName ?? ''} onChange={(e) => setForm({ businessName: e.target.value })} />
      </FormField>
      <FormField label="Email">
        <Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ email: e.target.value })} />
      </FormField>
      <FormField label="Phone">
        <Input value={form.phone ?? ''} onChange={(e) => setForm({ phone: e.target.value })} />
      </FormField>
      <FormField label="City">
        <Input value={form.city ?? ''} onChange={(e) => setForm({ city: e.target.value })} />
      </FormField>
      <FormField label="Station branch">
        <Input value={form.stationBranch ?? ''} onChange={(e) => setForm({ stationBranch: e.target.value })} />
      </FormField>
      <FormField label="Address">
        <Input value={form.address ?? ''} onChange={(e) => setForm({ address: e.target.value })} />
      </FormField>
      <FormField label="LGA">
        <Input value={form.lga ?? ''} onChange={(e) => setForm({ lga: e.target.value })} />
      </FormField>
      <FormField label="State">
        <Input value={form.state ?? ''} onChange={(e) => setForm({ state: e.target.value })} />
      </FormField>
      <FormField label="Business location">
        <Input value={form.businessLocation ?? ''} onChange={(e) => setForm({ businessLocation: e.target.value })} />
      </FormField>
      <FormField label="Landmark">
        <Input value={form.landmark ?? ''} onChange={(e) => setForm({ landmark: e.target.value })} />
      </FormField>
      {showNin && (
        <FormField label="NIN">
          <Input value={form.nin ?? ''} onChange={(e) => setForm({ nin: e.target.value })} placeholder="11 digits" />
        </FormField>
      )}
      <FormField label="CAC / RC number (optional)">
        <Input
          value={form.cacNumber ?? ''}
          onChange={(e) => setForm({ cacNumber: e.target.value })}
          placeholder="e.g. RC1234567"
        />
      </FormField>
      <FormField label="Latitude (optional)">
        <Input
          value={form.latitude != null ? String(form.latitude) : ''}
          onChange={(e) => {
            const raw = e.target.value.trim()
            setForm({ latitude: raw === '' ? undefined : Number(raw) })
          }}
          placeholder="e.g. 6.6018"
          inputMode="decimal"
        />
      </FormField>
      <FormField label="Longitude (optional)">
        <Input
          value={form.longitude != null ? String(form.longitude) : ''}
          onChange={(e) => {
            const raw = e.target.value.trim()
            setForm({ longitude: raw === '' ? undefined : Number(raw) })
          }}
          placeholder="e.g. 3.3515"
          inputMode="decimal"
        />
      </FormField>
      <p className="sm:col-span-2 mb-2 text-xs text-(--text-muted)">
        Leave lat/lng blank to auto-geocode from address + city + state. For best map accuracy,
        paste coordinates from Google Maps (right‑click the station → copy).
      </p>
    </div>
  )
}

export function MerchantsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [status, setStatus] = useState('')
  const [editMerchant, setEditMerchant] = useState<AdminMerchantSummary | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editForm, setEditForm] = useState<Partial<AdminCreateMerchantInput>>({})
  const [createForm, setCreateForm] = useState<AdminCreateMerchantInput>(emptyCreateForm)
  const [rejectTarget, setRejectTarget] = useState<AdminMerchantSummary | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const today = toDateInputValue(new Date())
  const [fromDate, setFromDate] = useState(daysAgo(6))
  const [toDate, setToDate] = useState(today)
  const fromIso = toIsoStart(fromDate)
  const toIso = toIsoEnd(toDate)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'merchants', page, limit, status],
    queryFn: () =>
      adminApi.merchants({
        page,
        limit,
        status: (status || undefined) as AdminMerchantSummary['status'],
      }),
  })

  const { data: dashboard } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.dashboard,
  })

  const { data: pendingMerchants } = useQuery({
    queryKey: ['admin', 'merchants', 'pending-count'],
    queryFn: () => adminApi.merchants({ page: 1, limit: 1, status: 'pending' }),
  })

  const { data: fuelStats, isFetching: fuelStatsFetching } = useQuery({
    queryKey: ['admin', 'merchants', 'fuel-stats', fromIso, toIso],
    queryFn: () => adminApi.merchantFuelStats({ fromDate: fromIso, toDate: toIso }),
  })

  const fuelMerchantColumns = useMemo<ColumnDef<NetworkFuelMerchantRow>[]>(
    () => [
      {
        accessorKey: 'merchantCode',
        header: 'Station',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.merchantCode}</p>
            <p className="text-xs text-(--text-muted)">{row.original.businessName}</p>
          </div>
        ),
      },
      {
        accessorKey: 'postedPricePerLitre',
        header: 'Posted ₦/L',
        cell: ({ row }) =>
          row.original.postedPricePerLitre != null
            ? formatCurrency(row.original.postedPricePerLitre)
            : '—',
      },
      {
        accessorKey: 'averageSoldPricePerLitre',
        header: 'Sold avg ₦/L',
        cell: ({ getValue }) => formatCurrency(getValue<number>()),
      },
      {
        accessorKey: 'totalLitres',
        header: 'Litres sold',
        cell: ({ getValue }) => formatLitres(getValue<number>()),
      },
      {
        accessorKey: 'totalFuelAmount',
        header: 'Fuel amount',
        cell: ({ getValue }) => formatCurrency(getValue<number>()),
      },
      {
        accessorKey: 'salesCount',
        header: 'Sales',
      },
      {
        id: 'view',
        header: '',
        cell: ({ row }) =>
          row.original.merchantProfileId ? (
            <Link
              to={`/merchants/${row.original.merchantProfileId}`}
              className="text-xs font-medium text-(--accent) hover:underline"
            >
              View
            </Link>
          ) : null,
      },
    ],
    [],
  )

  const updateMutation = useMutation({
    mutationFn: () => adminApi.updateMerchant(editMerchant!.id, editForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'merchants'] })
      setEditMerchant(null)
    },
  })

  const createMutation = useMutation({
    mutationFn: () => {
      const body: AdminCreateMerchantInput = {
        ...createForm,
        cacNumber: createForm.cacNumber?.trim() || undefined,
        latitude:
          createForm.latitude != null && Number.isFinite(createForm.latitude)
            ? createForm.latitude
            : undefined,
        longitude:
          createForm.longitude != null && Number.isFinite(createForm.longitude)
            ? createForm.longitude
            : undefined,
      }
      return adminApi.createMerchant(body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'merchants'] })
      setShowCreate(false)
      setCreateForm(emptyCreateForm)
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveMerchant(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'merchants'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.rejectMerchant(id, reason),
    onSuccess: () => {
      setRejectTarget(null)
      setRejectReason('')
      qc.invalidateQueries({ queryKey: ['admin', 'merchants'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })

  const suspendMutation = useMutation({
    mutationFn: (id: string) => adminApi.suspendMerchant(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'merchants'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })

  const openEdit = (m: AdminMerchantSummary) => {
    setEditMerchant(m)
    setEditForm({
      merchantName: m.merchantName,
      businessName: m.businessName,
      email: m.email,
      phone: m.phone,
      address: m.address,
      city: m.city,
      stationBranch: m.stationBranch,
      lga: m.lga,
      state: m.state,
      businessLocation: m.businessLocation,
      landmark: m.landmark,
      cacNumber: m.cacNumber ?? '',
      latitude: m.latitude,
      longitude: m.longitude,
    })
  }

  const columns = useMemo<ColumnDef<AdminMerchantSummary>[]>(
    () => [
      {
        accessorKey: 'merchantId',
        header: 'Station',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.merchantId}</p>
            <p className="text-xs text-(--text-muted)">{row.original.businessName}</p>
            <p className="text-xs text-(--text-muted)">{row.original.city} · {row.original.stationBranch}</p>
          </div>
        ),
      },
      {
        id: 'contact',
        header: 'Contact',
        cell: ({ row }) => (
          <div>
            <p>{row.original.merchantName}</p>
            <p className="text-xs text-(--text-muted)">{row.original.email}</p>
          </div>
        ),
      },
      {
        accessorKey: 'fuelPricePerLitre',
        header: 'Price / L',
        cell: ({ row }) =>
          row.original.fuelPricePerLitre != null ? (
            <span className="font-medium">{formatCurrency(row.original.fuelPricePerLitre)}</span>
          ) : (
            <span className="text-(--text-muted)">Not set</span>
          ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ getValue }) => formatDate(getValue<string>()),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <Link
              to={`/merchants/${row.original.id}`}
              className="inline-flex items-center rounded-lg border border-(--border) bg-(--bg-hover) px-3 py-1.5 text-xs font-medium text-(--text-primary) hover:bg-(--border)"
            >
              {row.original.status === 'pending' ? 'Review details' : 'View'}
            </Link>
            {row.original.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate(row.original.id)}
                  disabled={approveMutation.isPending}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setRejectTarget(row.original)
                    setRejectReason('')
                  }}
                  disabled={rejectMutation.isPending}
                >
                  Decline
                </Button>
              </>
            )}
            {row.original.status !== 'pending' && (
              <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>
                Edit
              </Button>
            )}
            {row.original.status === 'approved' && (
              <Button size="sm" variant="danger" onClick={() => suspendMutation.mutate(row.original.id)}>
                Suspend
              </Button>
            )}
          </div>
        ),
      },
    ],
    [approveMutation, rejectMutation, suspendMutation],
  )

  const handleExport = () => {
    if (!data?.items.length) return
    downloadCsv(
      'merchants.csv',
      ['Code', 'Business', 'Branch', 'City', 'Price/L', 'Contact', 'Email', 'Status'],
      data.items.map((m) => [
        m.merchantId,
        m.businessName,
        m.stationBranch,
        m.city,
        m.fuelPricePerLitre != null ? String(m.fuelPricePerLitre) : '',
        m.merchantName,
        m.email,
        m.status,
      ]),
    )
  }

  return (
    <div>
      <PageHeader
        title="Merchants"
        description="Fuel stations — review applications, manage onboarding, sales, and staff"
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              Export CSV
            </Button>
            <Button onClick={() => setShowCreate(true)}>Add Merchant</Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total merchants"
          value={String(dashboard?.merchantProfiles.total ?? data?.pagination.total ?? '—')}
          sub={`${dashboard?.merchantProfiles.approved ?? 0} approved`}
          accent="green"
        />
        <KpiCard
          label="New (7 days)"
          value={String(dashboard?.merchantProfiles.new7d ?? '—')}
          sub={`${dashboard?.merchantProfiles.new30d ?? 0} in last 30 days`}
          accent="blue"
        />
        <button
          type="button"
          className="text-left"
          onClick={() => {
            setStatus('pending')
            setPage(1)
          }}
          title="Show pending applications"
        >
          <KpiCard
            label="Pending approval"
            value={String(
              dashboard?.merchantProfiles.pending ?? pendingMerchants?.pagination.total ?? '—',
            )}
            sub="Click to filter · open row → Review details"
            accent="amber"
          />
        </button>
        <KpiCard
          label="Showing"
          value={String(data?.pagination.total ?? '—')}
          sub="Matching current status filter"
          accent="red"
        />
      </div>

      {status === 'pending' && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/5 p-4 text-sm text-(--text-secondary)">
          <p className="font-medium text-amber-600">Station applications</p>
          <p className="mt-1">
            Open <strong>Review details</strong> to see the full application (contact, address, NIN
            location fields). Use <strong>Approve</strong> to email login credentials, or{' '}
            <strong>Decline</strong> with a reason.
          </p>
        </Card>
      )}

      <Card className="mb-6 p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-(--text-primary)">Network fuel stats</h2>
            <p className="text-xs text-(--text-muted)">
              Average posted prices and litres sold across stations for a day or period.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setFromDate(today)
                setToDate(today)
              }}
            >
              Today
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setFromDate(daysAgo(6))
                setToDate(today)
              }}
            >
              7 days
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setFromDate(daysAgo(29))
                setToDate(today)
              }}
            >
              30 days
            </Button>
            <div>
              <label className="mb-1 block text-xs text-(--text-muted)">From</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-(--text-muted)">To</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Avg posted ₦/L"
            value={formatCurrency(fuelStats?.postedPrices.average ?? 0)}
            sub={
              fuelStatsFetching
                ? 'Updating…'
                : `${fuelStats?.postedPrices.merchantsWithPrice ?? 0} stations · min ${formatCurrency(fuelStats?.postedPrices.min ?? 0)} · max ${formatCurrency(fuelStats?.postedPrices.max ?? 0)}`
            }
            accent="blue"
          />
          <KpiCard
            label="Avg sold ₦/L"
            value={formatCurrency(fuelStats?.period.averageSoldPricePerLitre ?? 0)}
            sub="Volume-weighted across completed sales"
            accent="green"
          />
          <KpiCard
            label="Litres sold"
            value={formatLitres(fuelStats?.period.totalLitres ?? 0)}
            sub={`${fuelStats?.period.salesCount ?? 0} sales · ${fuelStats?.period.merchantCountWithSales ?? 0} stations`}
            accent="amber"
          />
          <KpiCard
            label="Fuel amount"
            value={formatCurrency(fuelStats?.period.totalFuelAmount ?? 0)}
            sub="Customer fuel cost in period"
            accent="red"
          />
        </div>

        {(fuelStats?.byDay.length ?? 0) > 0 && (
          <div className="mb-4 h-56 w-full">
            <p className="mb-2 text-xs font-medium text-(--text-muted)">Litres by day</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fuelStats?.byDay ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [formatLitres(Number(value ?? 0)), 'Litres']}
                  labelFormatter={(label) => String(label)}
                />
                <Bar dataKey="totalLitres" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-medium text-(--text-muted)">By station (period)</p>
          {(fuelStats?.byMerchant.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-sm text-(--text-muted)">
              No completed fuel sales in this period.
            </p>
          ) : (
            <DataTable
              data={fuelStats?.byMerchant ?? []}
              columns={fuelMerchantColumns}
              loading={fuelStatsFetching && !fuelStats}
            />
          )}
        </div>
      </Card>

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
            <option value="approved">Approved</option>
                <option value="pending">Pending applications</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected</option>
          </Select>
        }
      />

      <Modal open={!!editMerchant} onClose={() => setEditMerchant(null)} title="Edit Merchant" wide>
        <MerchantFormFields
          form={editForm}
          setForm={(patch) => setEditForm((prev) => ({ ...prev, ...patch }))}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEditMerchant(null)}>Cancel</Button>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </Modal>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Merchant" wide>
        <p className="mb-4 text-sm text-(--text-muted)">
          A temporary login password will be generated and emailed to the merchant.
        </p>
        <MerchantFormFields
          form={createForm}
          setForm={(patch) => setCreateForm((prev) => ({ ...prev, ...patch }))}
          showNin
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!rejectTarget}
        onClose={() => {
          setRejectTarget(null)
          setRejectReason('')
        }}
        title="Decline station application"
      >
        {rejectTarget && (
          <p className="mb-3 text-sm text-(--text-secondary)">
            Declining <strong>{rejectTarget.businessName}</strong> ({rejectTarget.email}). The contact
            person will be emailed this reason.
          </p>
        )}
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
              setRejectTarget(null)
              setRejectReason('')
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={
              !rejectTarget || rejectReason.trim().length < 5 || rejectMutation.isPending
            }
            onClick={() =>
              rejectMutation.mutate({ id: rejectTarget!.id, reason: rejectReason.trim() })
            }
          >
            {rejectMutation.isPending ? 'Declining…' : 'Decline application'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

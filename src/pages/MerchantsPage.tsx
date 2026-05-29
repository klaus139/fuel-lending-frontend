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
import { downloadCsv, formatDate } from '../lib/utils'
import type { AdminCreateMerchantInput, AdminMerchantSummary } from '../types/api'

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

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'merchants', page, limit, status],
    queryFn: () =>
      adminApi.merchants({
        page,
        limit,
        status: (status || undefined) as AdminMerchantSummary['status'],
      }),
  })

  const updateMutation = useMutation({
    mutationFn: () => adminApi.updateMerchant(editMerchant!.id, editForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'merchants'] })
      setEditMerchant(null)
    },
  })

  const createMutation = useMutation({
    mutationFn: () => adminApi.createMerchant(createForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'merchants'] })
      setShowCreate(false)
      setCreateForm(emptyCreateForm)
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveMerchant(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'merchants'] }),
  })

  const suspendMutation = useMutation({
    mutationFn: (id: string) => adminApi.suspendMerchant(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'merchants'] }),
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
            <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>
              Edit
            </Button>
            {row.original.status === 'pending' && (
              <Button size="sm" onClick={() => approveMutation.mutate(row.original.id)}>
                Approve
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
    [approveMutation, suspendMutation],
  )

  const handleExport = () => {
    if (!data?.items.length) return
    downloadCsv(
      'merchants.csv',
      ['Code', 'Business', 'Branch', 'City', 'Contact', 'Email', 'Status'],
      data.items.map((m) => [
        m.merchantId,
        m.businessName,
        m.stationBranch,
        m.city,
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
        description="Fuel stations and seller accounts"
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              Export CSV
            </Button>
            <Button onClick={() => setShowCreate(true)}>Add Merchant</Button>
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
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
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
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { adminApi } from '../api/admin'
import { getApiErrorMessage } from '../api/client'
import { DataTable } from '../components/data-table/DataTable'
import {
  Button,
  Card,
  FormField,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
} from '../components/ui'
import { useToast } from '../components/ui/Toast'
import { formatDateTime } from '../lib/utils'
import type {
  AdminCreateMerchantInput,
  MerchantApplication,
  MerchantApplicationStatus,
} from '../types/api'

const emptyOnboardForm = (app?: MerchantApplication | null): AdminCreateMerchantInput => ({
  merchantName: app?.name ?? '',
  email: app?.email ?? '',
  phone: app?.phone ?? '',
  address: app?.address ?? '',
  businessName: app?.petrolStationName ?? '',
  businessLocation: app?.petrolStationName ?? '',
  city: '',
  stationBranch: '',
  lga: '',
  state: '',
  landmark: '',
  nin: '',
  cacNumber: app?.cacNumber ?? '',
  latitude: undefined,
  longitude: undefined,
})

export function MerchantApplicationsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<MerchantApplicationStatus | ''>('new')
  const [rejectTarget, setRejectTarget] = useState<MerchantApplication | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [onboardTarget, setOnboardTarget] = useState<MerchantApplication | null>(null)
  const [onboardForm, setOnboardForm] = useState<AdminCreateMerchantInput>(emptyOnboardForm())
  const [cacDocument, setCacDocument] = useState<File | null>(null)

  const query = useQuery({
    queryKey: ['admin', 'merchant-applications', page, status],
    queryFn: () =>
      adminApi.merchantApplications({
        page,
        limit: 20,
        status: status || undefined,
      }),
  })

  const contactedMutation = useMutation({
    mutationFn: (id: string) => adminApi.markMerchantApplicationContacted(id),
    onSuccess: () => {
      toast.success('Marked as contacted')
      qc.invalidateQueries({ queryKey: ['admin', 'merchant-applications'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not update')),
  })

  const rejectMutation = useMutation({
    mutationFn: () => adminApi.rejectMerchantApplication(rejectTarget!.id, rejectReason.trim()),
    onSuccess: () => {
      toast.success('Interest rejected')
      setRejectTarget(null)
      setRejectReason('')
      qc.invalidateQueries({ queryKey: ['admin', 'merchant-applications'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Reject failed')),
  })

  const onboardMutation = useMutation({
    mutationFn: () => {
      const body: AdminCreateMerchantInput = {
        ...onboardForm,
        cacNumber: onboardForm.cacNumber?.trim() || undefined,
        latitude:
          onboardForm.latitude != null && Number.isFinite(onboardForm.latitude)
            ? onboardForm.latitude
            : undefined,
        longitude:
          onboardForm.longitude != null && Number.isFinite(onboardForm.longitude)
            ? onboardForm.longitude
            : undefined,
      }
      return adminApi.onboardMerchantApplication(onboardTarget!.id, body, cacDocument)
    },
    onSuccess: (result) => {
      toast.success(
        `Onboarded ${result.merchant.merchantId} — login emailed. They now appear under Merchants.`,
      )
      setOnboardTarget(null)
      setCacDocument(null)
      qc.invalidateQueries({ queryKey: ['admin', 'merchant-applications'] })
      qc.invalidateQueries({ queryKey: ['admin', 'merchants'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Onboard failed')),
  })

  const openOnboard = (app: MerchantApplication) => {
    setOnboardTarget(app)
    setOnboardForm(emptyOnboardForm(app))
    setCacDocument(null)
  }

  const columns = useMemo<ColumnDef<MerchantApplication>[]>(
    () => [
      {
        accessorKey: 'petrolStationName',
        header: 'Station',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-(--text-primary)">{row.original.petrolStationName}</p>
            <p className="text-xs text-(--text-muted)">{row.original.address}</p>
          </div>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Contact',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-(--text-muted)">{row.original.email}</p>
            <p className="text-xs text-(--text-muted)">{row.original.phone}</p>
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
        header: 'Submitted',
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const app = row.original
          const canAct = app.status === 'new' || app.status === 'contacted'
          return (
            <div className="flex flex-wrap justify-end gap-2">
              {app.status === 'new' && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={contactedMutation.isPending}
                  onClick={() => contactedMutation.mutate(app.id)}
                >
                  Mark contacted
                </Button>
              )}
              {canAct && (
                <>
                  <Button size="sm" onClick={() => openOnboard(app)}>
                    Onboard
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setRejectTarget(app)}>
                    Reject
                  </Button>
                </>
              )}
              {app.status === 'onboarded' && app.merchantProfileId && (
                <Link
                  to={`/merchants/${app.merchantProfileId}`}
                  className="text-xs font-medium text-(--accent) hover:underline"
                >
                  View merchant
                </Link>
              )}
            </div>
          )
        },
      },
    ],
    [contactedMutation],
  )

  const patchOnboard = (patch: Partial<AdminCreateMerchantInput>) =>
    setOnboardForm((prev) => ({ ...prev, ...patch }))

  return (
    <div>
      <PageHeader
        title="Merchant interest"
        description="Leads from the simple indicate-interest form. Reach out, complete checks, then onboard to create their merchant login."
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <FormField label="Status">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as MerchantApplicationStatus | '')
                setPage(1)
              }}
            >
              <option value="">All</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="onboarded">Onboarded</option>
              <option value="rejected">Rejected</option>
            </Select>
          </FormField>
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
        loading={query.isLoading}
        pagination={query.data?.pagination}
        onPageChange={setPage}
        emptyMessage="No interest requests yet"
      />

      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject interest"
      >
        <p className="mb-3 text-sm text-(--text-muted)">
          Reject {rejectTarget?.petrolStationName} ({rejectTarget?.email})
        </p>
        <FormField label="Reason">
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRejectTarget(null)}>
            Cancel
          </Button>
          <Button
            disabled={!rejectReason.trim() || rejectMutation.isPending}
            onClick={() => rejectMutation.mutate()}
          >
            Reject
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!onboardTarget}
        onClose={() => setOnboardTarget(null)}
        title="Onboard merchant"
        size="xl"
      >
        <p className="mb-3 text-sm text-(--text-muted)">
          Complete station details after checks. <strong>NIN is verified against the contact name</strong> —
          if it does not match, onboarding is blocked. On success they become an approved merchant (Merchants
          table) and login credentials are emailed to <strong>{onboardTarget?.email}</strong>.
        </p>
        <div className="grid max-h-[70vh] grid-cols-1 gap-0 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Contact name">
            <Input
              value={onboardForm.merchantName}
              onChange={(e) => patchOnboard({ merchantName: e.target.value })}
            />
          </FormField>
          <FormField label="Business / station name">
            <Input
              value={onboardForm.businessName}
              onChange={(e) => patchOnboard({ businessName: e.target.value })}
            />
          </FormField>
          <FormField label="Email">
            <Input
              type="email"
              value={onboardForm.email}
              onChange={(e) => patchOnboard({ email: e.target.value })}
            />
          </FormField>
          <FormField label="Phone">
            <Input
              value={onboardForm.phone}
              onChange={(e) => patchOnboard({ phone: e.target.value })}
            />
          </FormField>
          <FormField label="Address">
            <Input
              value={onboardForm.address}
              onChange={(e) => patchOnboard({ address: e.target.value })}
            />
          </FormField>
          <FormField label="City">
            <Input value={onboardForm.city} onChange={(e) => patchOnboard({ city: e.target.value })} />
          </FormField>
          <FormField label="Station branch">
            <Input
              value={onboardForm.stationBranch}
              onChange={(e) => patchOnboard({ stationBranch: e.target.value })}
            />
          </FormField>
          <FormField label="LGA">
            <Input value={onboardForm.lga} onChange={(e) => patchOnboard({ lga: e.target.value })} />
          </FormField>
          <FormField label="State">
            <Input
              value={onboardForm.state}
              onChange={(e) => patchOnboard({ state: e.target.value })}
            />
          </FormField>
          <FormField label="Business location">
            <Input
              value={onboardForm.businessLocation}
              onChange={(e) => patchOnboard({ businessLocation: e.target.value })}
            />
          </FormField>
          <FormField label="Landmark">
            <Input
              value={onboardForm.landmark}
              onChange={(e) => patchOnboard({ landmark: e.target.value })}
            />
          </FormField>
          <FormField label="NIN (11 digits) — must match contact name">
            <Input value={onboardForm.nin} onChange={(e) => patchOnboard({ nin: e.target.value })} />
          </FormField>
          <FormField label="CAC / RC number (optional)">
            <Input
              value={onboardForm.cacNumber ?? ''}
              onChange={(e) => patchOnboard({ cacNumber: e.target.value })}
            />
          </FormField>
          <FormField label="CAC document (optional)">
            <Input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setCacDocument(e.target.files?.[0] ?? null)}
            />
            {cacDocument && (
              <p className="mt-1 text-xs text-(--text-muted)">{cacDocument.name}</p>
            )}
          </FormField>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOnboardTarget(null)}>
            Cancel
          </Button>
          <Button disabled={onboardMutation.isPending} onClick={() => onboardMutation.mutate()}>
            {onboardMutation.isPending ? 'Onboarding…' : 'Onboard & email login'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

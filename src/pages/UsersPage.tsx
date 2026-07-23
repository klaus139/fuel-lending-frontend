import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { adminApi } from '../api/admin'
import { DataTable } from '../components/data-table/DataTable'
import {
  Button,
  FormField,
  Input,
  KpiCard,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
} from '../components/ui'
import { downloadCsv, formatDate } from '../lib/utils'
import type { AdminUserSummary } from '../types/api'

export function UsersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [accountStatus, setAccountStatus] = useState('')
  const [editUser, setEditUser] = useState<AdminUserSummary | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, limit, search, role, accountStatus],
    queryFn: () =>
      adminApi.users({
        page,
        limit,
        search: search || undefined,
        role: (role || undefined) as AdminUserSummary['role'],
        accountStatus: (accountStatus || undefined) as AdminUserSummary['accountStatus'],
      }),
  })

  const { data: dashboard } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.dashboard,
  })

  const updateMutation = useMutation({
    mutationFn: () => adminApi.updateUser(editUser!.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      setEditUser(null)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'blocked' }) =>
      adminApi.updateUserStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const openEdit = (user: AdminUserSummary) => {
    setEditUser(user)
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
    })
  }

  const columns = useMemo<ColumnDef<AdminUserSummary>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessorFn: (r) => `${r.firstName} ${r.lastName}`,
        cell: ({ row }) => (
          <Link
            to={`/users/${row.original.id}`}
            className="block hover:text-emerald-500"
          >
            <p className="font-medium">
              {row.original.firstName} {row.original.lastName}
            </p>
            <p className="text-xs text-(--text-muted)">{row.original.email}</p>
          </Link>
        ),
      },
      { accessorKey: 'phone', header: 'Phone' },
      { accessorKey: 'role', header: 'Role', cell: ({ getValue }) => <StatusBadge status={getValue<string>()} /> },
      {
        accessorKey: 'accountStatus',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        id: 'kyc',
        header: 'KYC',
        cell: ({ row }) => (row.original.isKycVerified ? '✓ Verified' : '—'),
      },
      {
        accessorKey: 'createdAt',
        header: 'Joined',
        cell: ({ getValue }) => formatDate(getValue<string>()),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Link
              to={`/users/${row.original.id}`}
              className="inline-flex items-center rounded-lg border border-(--border) bg-(--bg-hover) px-3 py-1.5 text-xs font-medium text-(--text-primary) hover:bg-(--border)"
            >
              View
            </Link>
            <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant={row.original.accountStatus === 'blocked' ? 'primary' : 'danger'}
              onClick={() =>
                statusMutation.mutate({
                  id: row.original.id,
                  status: row.original.accountStatus === 'blocked' ? 'active' : 'blocked',
                })
              }
            >
              {row.original.accountStatus === 'blocked' ? 'Unblock' : 'Block'}
            </Button>
          </div>
        ),
      },
    ],
    [statusMutation],
  )

  const handleExport = () => {
    if (!data?.items.length) return
    downloadCsv(
      'users.csv',
      ['Name', 'Email', 'Phone', 'Role', 'Status', 'KYC', 'Joined'],
      data.items.map((u) => [
        `${u.firstName} ${u.lastName}`,
        u.email,
        u.phone,
        u.role,
        u.accountStatus,
        u.isKycVerified ? 'yes' : 'no',
        formatDate(u.createdAt),
      ]),
    )
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Customers, merchants, and admins"
        actions={
          <Button variant="secondary" onClick={handleExport}>
            Export CSV
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total users"
          value={String(dashboard?.users.total ?? data?.pagination.total ?? '—')}
          sub={`${dashboard?.users.customers ?? 0} customers`}
          accent="green"
        />
        <KpiCard
          label="New customers (7d)"
          value={String(dashboard?.users.newCustomers7d ?? '—')}
          sub={`${dashboard?.users.newCustomers30d ?? 0} in last 30 days`}
          accent="blue"
        />
        <KpiCard
          label="Merchant accounts"
          value={String(dashboard?.users.merchants ?? '—')}
          sub={`${dashboard?.users.admins ?? 0} admins`}
          accent="amber"
        />
        <KpiCard
          label="Blocked"
          value={String(dashboard?.users.blocked ?? '—')}
          sub={`${data?.pagination.total ?? 0} match current filters`}
          accent="red"
        />
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
          <>
            <Input
              placeholder="Search name, email, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-56"
            />
            <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1) }}>
              <option value="">All roles</option>
              <option value="customer">Customer</option>
              <option value="merchant_admin">Merchant Admin</option>
              <option value="merchant_seller">Merchant Seller</option>
              <option value="admin">Admin</option>
            </Select>
            <Select value={accountStatus} onChange={(e) => { setAccountStatus(e.target.value); setPage(1) }}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </Select>
          </>
        }
      />

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        <FormField label="First name">
          <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        </FormField>
        <FormField label="Last name">
          <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </FormField>
        <FormField label="Email">
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </FormField>
        <FormField label="Phone">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEditUser(null)}>
            Cancel
          </Button>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

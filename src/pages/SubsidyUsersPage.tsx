import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
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
import { useAuth } from '../context/AuthContext'
import { downloadCsv, formatDate } from '../lib/utils'
import type { SubsidyUserRow } from '../types/api'

const emptyOperator = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
}

export function SubsidyUsersPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [accountStatus, setAccountStatus] = useState('')
  const [showOperator, setShowOperator] = useState(false)
  const [operator, setOperator] = useState(emptyOperator)
  const canCreateLogin = user?.role === 'admin'

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'subsidy-users', page, limit, search, accountStatus],
    queryFn: () =>
      adminApi.listSubsidyUsers({
        page,
        limit,
        search: search || undefined,
        accountStatus: (accountStatus || undefined) as 'active' | 'blocked',
      }),
  })

  const createMutation = useMutation({
    mutationFn: () => adminApi.createSubsidyOperator(operator),
    onSuccess: () => {
      setShowOperator(false)
      setOperator(emptyOperator)
      toast.success('Subsidy admin login created')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Could not create subsidy login'))
    },
  })

  const columns = useMemo<ColumnDef<SubsidyUserRow>[]>(
    () => [
      {
        id: 'name',
        header: 'Beneficiary',
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
        accessorKey: 'purchaseId',
        header: 'Purchase ID',
        cell: ({ getValue }) => getValue<string>() || '—',
      },
      {
        accessorKey: 'accountStatus',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        id: 'kyc',
        header: 'KYC',
        cell: ({ row }) => (row.original.isKycVerified ? 'Verified' : 'Pending'),
      },
      {
        accessorKey: 'createdAt',
        header: 'Joined',
        cell: ({ getValue }) => formatDate(getValue<string>()),
      },
    ],
    [],
  )

  const handleExport = () => {
    if (!data?.items.length) return
    downloadCsv(
      'subsidy-users.csv',
      ['Name', 'Email', 'Phone', 'Purchase ID', 'Status', 'KYC', 'Joined'],
      data.items.map((row) => [
        `${row.firstName} ${row.lastName}`,
        row.email,
        row.phone,
        row.purchaseId ?? '',
        row.accountStatus,
        row.isKycVerified ? 'yes' : 'no',
        formatDate(row.createdAt),
      ]),
    )
  }

  return (
    <div>
      <PageHeader
        title="Subsidy users"
        description="Beneficiaries registered on the government subsidy app"
        actions={
          <div className="flex gap-2">
            {canCreateLogin ? (
              <Button onClick={() => setShowOperator(true)}>Add subsidy login</Button>
            ) : null}
            <Button variant="secondary" onClick={handleExport}>
              Export CSV
            </Button>
          </div>
        }
      />

      <DataTable
        data={data?.items ?? []}
        columns={columns}
        pagination={data?.pagination}
        onPageChange={setPage}
        onLimitChange={(next) => {
          setLimit(next)
          setPage(1)
        }}
        loading={isLoading}
        emptyMessage="No subsidy users yet"
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
            <Select
              value={accountStatus}
              onChange={(e) => {
                setAccountStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </Select>
          </>
        }
      />

      <Modal open={showOperator} onClose={() => setShowOperator(false)} title="Subsidy admin login">
        <p className="mb-4 text-sm text-(--text-secondary)">
          This login can only see subsidy users, subsidy sales, and subsidy settlements.
        </p>
        <FormField label="First name">
          <Input
            value={operator.firstName}
            onChange={(e) => setOperator({ ...operator, firstName: e.target.value })}
          />
        </FormField>
        <FormField label="Last name">
          <Input
            value={operator.lastName}
            onChange={(e) => setOperator({ ...operator, lastName: e.target.value })}
          />
        </FormField>
        <FormField label="Email">
          <Input
            type="email"
            value={operator.email}
            onChange={(e) => setOperator({ ...operator, email: e.target.value })}
          />
        </FormField>
        <FormField label="Phone">
          <Input
            value={operator.phone}
            onChange={(e) => setOperator({ ...operator, phone: e.target.value })}
          />
        </FormField>
        <FormField label="Password">
          <Input
            type="password"
            value={operator.password}
            onChange={(e) => setOperator({ ...operator, password: e.target.value })}
          />
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowOperator(false)}>
            Cancel
          </Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create login'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

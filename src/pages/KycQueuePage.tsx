import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { adminApi } from '../api/admin'
import { getApiErrorMessage } from '../api/client'
import { DataTable } from '../components/data-table/DataTable'
import {
  Button,
  FormField,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
} from '../components/ui'
import { useToast } from '../components/ui/Toast'
import { formatDate } from '../lib/utils'
import type { AdminKycSubmission, KycStatus } from '../types/api'

type KycFilter = '' | Exclude<KycStatus, 'not_submitted'>

export function KycQueuePage() {
  const qc = useQueryClient()
  const toast = useToast()
  const [status, setStatus] = useState<KycFilter>('pending')
  const [rejectTarget, setRejectTarget] = useState<AdminKycSubmission | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['admin', 'kyc', status || 'all'],
    queryFn: () => adminApi.listKyc(status || undefined),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'kyc'] })

  const approveMutation = useMutation({
    mutationFn: (kycId: string) => adminApi.approveKyc(kycId),
    onSuccess: () => {
      toast.success('KYC approved')
      invalidate()
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to approve KYC')),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ kycId, reason }: { kycId: string; reason: string }) =>
      adminApi.rejectKyc(kycId, reason),
    onSuccess: () => {
      toast.success('KYC rejected')
      setRejectTarget(null)
      setRejectReason('')
      invalidate()
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to reject KYC')),
  })

  const columns = useMemo<ColumnDef<AdminKycSubmission>[]>(
    () => [
      {
        id: 'user',
        header: 'User',
        cell: ({ row }) => (
          <Link
            to={`/users/${row.original.userId}`}
            className="font-medium text-emerald-500 hover:underline"
          >
            {row.original.userId.slice(-8)}
          </Link>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'location',
        header: 'Location',
        cell: ({ row }) =>
          [row.original.city, row.original.lga, row.original.state].filter(Boolean).join(', ') ||
          '—',
      },
      {
        accessorKey: 'motorType',
        header: 'Motor',
        cell: ({ row }) =>
          `${row.original.motorType} · ${row.original.motorRegistrationNumber}`,
      },
      {
        accessorKey: 'submittedAt',
        header: 'Submitted',
        cell: ({ row }) => formatDate(row.original.submittedAt),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const item = row.original
          const canReview = item.status === 'pending' || item.status === 'rejected'
          return (
            <div className="flex justify-end gap-2">
              <Link to={`/users/${item.userId}`}>
                <Button size="sm" variant="ghost">
                  Open user
                </Button>
              </Link>
              {canReview && (
                <>
                  <Button
                    size="sm"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate(item.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setRejectTarget(item)}
                  >
                    Reject
                  </Button>
                </>
              )}
            </div>
          )
        },
      },
    ],
    [approveMutation],
  )

  return (
    <div>
      <PageHeader
        title="KYC queue"
        description="Review pending submissions or open a user to submit KYC and generate a wallet."
      />

      <div className="mb-4 max-w-xs">
        <FormField label="Status">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as KycFilter)}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="">All</option>
          </Select>
        </FormField>
      </div>

      <DataTable columns={columns} data={data} loading={isLoading} />

      <Modal
        open={!!rejectTarget}
        onClose={() => {
          setRejectTarget(null)
          setRejectReason('')
        }}
        title="Reject KYC"
      >
        <FormField label="Reason">
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Why is this KYC being rejected?"
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
            disabled={rejectReason.trim().length < 3 || rejectMutation.isPending || !rejectTarget}
            onClick={() =>
              rejectMutation.mutate({
                kycId: rejectTarget!.id,
                reason: rejectReason.trim(),
              })
            }
          >
            {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

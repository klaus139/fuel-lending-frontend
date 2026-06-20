import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { adminApi } from '../api/admin'
import { DataTable } from '../components/data-table/DataTable'
import {
  Button,
  ErrorMessage,
  FormField,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatusBadge,
} from '../components/ui'
import { cn, formatDateTime } from '../lib/utils'
import type { SupportMessage, SupportTicketStatus, SupportTicketSummary } from '../types/api'

const STATUS_OPTIONS: { value: SupportTicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

export function SupportTicketsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [status, setStatus] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [statusDraft, setStatusDraft] = useState<SupportTicketStatus>('open')
  const [actionError, setActionError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'support', page, limit, status],
    queryFn: () =>
      adminApi.supportTickets({
        page,
        limit,
        status: (status || undefined) as SupportTicketStatus | undefined,
      }),
  })

  const { data: ticketDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin', 'support', selectedId],
    queryFn: () => adminApi.getSupportTicket(selectedId!),
    enabled: !!selectedId,
  })

  const statusMutation = useMutation({
    mutationFn: ({ ticketId, nextStatus }: { ticketId: string; nextStatus: SupportTicketStatus }) =>
      adminApi.updateSupportTicketStatus(ticketId, nextStatus),
    onSuccess: (updated) => {
      setActionError('')
      qc.invalidateQueries({ queryKey: ['admin', 'support'] })
      qc.setQueryData(['admin', 'support', updated.id], updated)
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const replyMutation = useMutation({
    mutationFn: ({ ticketId, message }: { ticketId: string; message: string }) =>
      adminApi.replySupportTicket(ticketId, message),
    onSuccess: (updated) => {
      setActionError('')
      setReplyText('')
      qc.invalidateQueries({ queryKey: ['admin', 'support'] })
      qc.setQueryData(['admin', 'support', updated.id], updated)
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const openTicket = (ticket: SupportTicketSummary) => {
    setSelectedId(ticket.id)
    setStatusDraft(ticket.status)
    setReplyText('')
    setActionError('')
  }

  const closeModal = () => {
    setSelectedId(null)
    setReplyText('')
    setActionError('')
  }

  const columns = useMemo<ColumnDef<SupportTicketSummary>[]>(
    () => [
      {
        accessorKey: 'topicLabel',
        header: 'Topic',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.topicLabel}</p>
            <p className="max-w-xs truncate text-xs text-(--text-muted)">{row.original.lastMessage}</p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: 'messageCount',
        header: 'Messages',
      },
      {
        accessorKey: 'hasAdminReply',
        header: 'Admin Reply',
        cell: ({ getValue }) =>
          getValue<boolean>() ? (
            <span className="text-xs text-emerald-500">Yes</span>
          ) : (
            <span className="text-xs text-amber-500">Awaiting</span>
          ),
      },
      {
        accessorKey: 'lastMessageAt',
        header: 'Last Activity',
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Button size="sm" onClick={() => openTicket(row.original)}>
            View
          </Button>
        ),
      },
    ],
    [],
  )

  const handleStatusUpdate = () => {
    if (!selectedId || !ticketDetail) return
    statusMutation.mutate({ ticketId: selectedId, nextStatus: statusDraft })
  }

  const handleReply = () => {
    if (!selectedId) return
    const message = replyText.trim()
    if (message.length < 10) {
      setActionError('Reply must be at least 10 characters')
      return
    }
    replyMutation.mutate({ ticketId: selectedId, message })
  }

  const openCount = data?.items.filter((t) => t.status === 'open').length ?? 0
  const inProgressCount = data?.items.filter((t) => t.status === 'in_progress').length ?? 0

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        description="Manage customer help requests — reply to messages and update ticket status"
        actions={
          <div className="flex gap-2 text-sm text-(--text-secondary)">
            <span className="rounded-lg border border-(--border) px-3 py-1.5">
              Open on page: <strong className="text-amber-500">{openCount}</strong>
            </span>
            <span className="rounded-lg border border-(--border) px-3 py-1.5">
              In progress: <strong className="text-blue-500">{inProgressCount}</strong>
            </span>
          </div>
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
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        }
      />

      <Modal
        open={!!selectedId}
        onClose={closeModal}
        title={ticketDetail?.topicLabel ?? 'Support Ticket'}
        wide
      >
        {detailLoading || !ticketDetail ? (
          <Spinner />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--bg-secondary) p-4">
              <div>
                <p className="font-medium text-(--text-primary)">{ticketDetail.subject}</p>
                <p className="mt-1 text-xs text-(--text-muted)">
                  Ticket #{ticketDetail.id.slice(-8).toUpperCase()} · Created{' '}
                  {formatDateTime(ticketDetail.createdAt)}
                </p>
              </div>
              <StatusBadge status={ticketDetail.status} />
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-(--text-muted)">
                Conversation
              </p>
              <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-(--border) bg-(--bg-secondary) p-4">
                {ticketDetail.messages.map((msg: SupportMessage) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </div>
            </div>

            {ticketDetail.status !== 'closed' && (
              <>
                <FormField label="Admin reply">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                    placeholder="Type your response to the customer..."
                    className="w-full rounded-lg border border-(--border) bg-(--bg-primary) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </FormField>
                <div className="flex justify-end">
                  <Button
                    onClick={handleReply}
                    disabled={replyMutation.isPending || replyText.trim().length < 10}
                  >
                    {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                  </Button>
                </div>
              </>
            )}

            <div className="border-t border-(--border) pt-4">
              <FormField label="Update status">
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value as SupportTicketStatus)}
                    className="min-w-[160px]"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="secondary"
                    onClick={handleStatusUpdate}
                    disabled={statusMutation.isPending || statusDraft === ticketDetail.status}
                  >
                    {statusMutation.isPending ? 'Updating...' : 'Update Status'}
                  </Button>
                </div>
              </FormField>
            </div>

            {actionError && <ErrorMessage message={actionError} />}

            <div className="flex justify-end">
              <Button variant="secondary" onClick={closeModal}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function MessageBubble({ message }: { message: SupportMessage }) {
  const isAdmin = message.senderRole === 'admin'

  return (
    <div className={cn('flex', isAdmin ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-3 py-2 text-sm',
          isAdmin
            ? 'bg-emerald-500/15 text-(--text-primary)'
            : 'bg-(--bg-card) text-(--text-primary) ring-1 ring-(--border)',
        )}
      >
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-(--text-muted)">
          {isAdmin ? 'Admin' : 'Customer'}
        </p>
        <p className="whitespace-pre-wrap">{message.message}</p>
        <p className="mt-1 text-[10px] text-(--text-muted)">{formatDateTime(message.createdAt)}</p>
      </div>
    </div>
  )
}

import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { adminApi } from '../api/admin'
import { DataTable } from '../components/data-table/DataTable'
import {
  Button,
  ErrorMessage,
  FormField,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatusBadge,
} from '../components/ui'
import { formatDateTime } from '../lib/utils'
import type {
  AdminNotificationItem,
  NotificationAudience,
  NotificationCategory,
  NotificationMedia,
  NotificationStatus,
} from '../types/api'

const AUDIENCE_LABELS: Record<NotificationAudience, string> = {
  all: 'Everyone',
  all_customers: 'All customers',
  all_merchants: 'All merchants',
  users: 'Specific user IDs',
}

export function NotificationsPage() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [actionError, setActionError] = useState('')

  const [draftCategory, setDraftCategory] = useState<NotificationCategory>('broadcast')
  const [draftAudience, setDraftAudience] = useState<NotificationAudience>('all_customers')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [draftUserIds, setDraftUserIds] = useState('')
  const [draftExpiresAt, setDraftExpiresAt] = useState('')
  const [draftMedia, setDraftMedia] = useState<NotificationMedia[]>([])

  const { data: meta } = useQuery({
    queryKey: ['admin', 'notifications', 'meta'],
    queryFn: adminApi.notificationMeta,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'notifications', page, limit, category, status],
    queryFn: () =>
      adminApi.listNotifications({
        page,
        limit,
        category: (category || undefined) as NotificationCategory | undefined,
        status: (status || undefined) as NotificationStatus | undefined,
      }),
  })

  const createMutation = useMutation({
    mutationFn: adminApi.createNotification,
    onSuccess: () => {
      setActionError('')
      setComposeOpen(false)
      resetDraft()
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] })
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const uploadMutation = useMutation({
    mutationFn: adminApi.uploadNotificationMedia,
    onSuccess: (media) => {
      setDraftMedia((prev) => [...prev, media])
      setActionError('')
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const resetDraft = () => {
    setDraftCategory('broadcast')
    setDraftAudience('all_customers')
    setDraftTitle('')
    setDraftBody('')
    setDraftUserIds('')
    setDraftExpiresAt('')
    setDraftMedia([])
    setActionError('')
  }

  const openCompose = () => {
    resetDraft()
    setComposeOpen(true)
  }

  const submitCompose = () => {
    const userIds =
      draftAudience === 'users'
        ? draftUserIds
            .split(/[\s,]+/)
            .map((id) => id.trim())
            .filter(Boolean)
        : undefined

    createMutation.mutate({
      category: draftCategory,
      audience: draftAudience,
      title: draftTitle.trim(),
      body: draftBody.trim(),
      userIds,
      media: draftMedia.length ? draftMedia : undefined,
      expiresAt: draftExpiresAt.trim()
        ? new Date(draftExpiresAt).toISOString()
        : undefined,
      status: 'published',
    })
  }

  const columns = useMemo<ColumnDef<AdminNotificationItem>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Notification',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.title}</p>
            <p className="max-w-md truncate text-xs text-(--text-muted)">{row.original.body}</p>
          </div>
        ),
      },
      {
        accessorKey: 'categoryLabel',
        header: 'Category',
        cell: ({ row }) => <StatusBadge status={row.original.category} />,
      },
      {
        accessorKey: 'audience',
        header: 'Audience',
        cell: ({ row }) => (
          <span className="text-sm">{AUDIENCE_LABELS[row.original.audience]}</span>
        ),
      },
      {
        accessorKey: 'contentType',
        header: 'Type',
        cell: ({ row }) => (
          <span className="text-sm capitalize text-(--text-secondary)">{row.original.contentType}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'publishedAt',
        header: 'Published',
        cell: ({ row }) => (
          <span className="text-sm text-(--text-secondary)">
            {row.original.publishedAt ? formatDateTime(row.original.publishedAt) : '—'}
          </span>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Broadcasts, promos, and direct messages delivered to customer and merchant apps."
        actions={
          <Button onClick={openCompose}>Compose</Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <FormField label="Category">
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }}>
            <option value="">All</option>
            {(meta?.categories ?? []).map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </Select>
        </FormField>
      </div>

      {isLoading && !data ? (
        <Spinner />
      ) : (
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          pagination={data?.pagination}
          onPageChange={setPage}
          onLimitChange={(next) => {
            setLimit(next)
            setPage(1)
          }}
          loading={isLoading}
        />
      )}

      <Modal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="Compose notification"
        wide
      >
        <div className="space-y-4">
          {actionError ? <ErrorMessage message={actionError} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Category">
              <Select
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value as NotificationCategory)}
              >
                {(meta?.categories ?? [
                  { value: 'broadcast', label: 'Broadcast' },
                  { value: 'promo', label: 'Promo / offer' },
                  { value: 'direct', label: 'Direct message' },
                  { value: 'system', label: 'System' },
                ]).map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Audience">
              <Select
                value={draftAudience}
                onChange={(e) => setDraftAudience(e.target.value as NotificationAudience)}
              >
                {(Object.keys(AUDIENCE_LABELS) as NotificationAudience[]).map((value) => (
                  <option key={value} value={value}>
                    {AUDIENCE_LABELS[value]}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {draftAudience === 'users' ? (
            <FormField label="User IDs (comma or space separated)">
              <Input
                value={draftUserIds}
                onChange={(e) => setDraftUserIds(e.target.value)}
                placeholder="68abc..., 68def..."
              />
            </FormField>
          ) : null}

          <FormField label="Title">
            <Input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              maxLength={160}
              placeholder="Short headline"
            />
          </FormField>

          <FormField label="Body">
            <textarea
              className="min-h-28 w-full rounded-lg border border-(--border) bg-(--bg-primary) px-3 py-2 text-sm text-(--text-primary) outline-none focus:border-emerald-500"
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              maxLength={4000}
              placeholder="Message details..."
            />
          </FormField>

          <FormField label="Expires at (optional)">
            <Input
              type="datetime-local"
              value={draftExpiresAt}
              onChange={(e) => setDraftExpiresAt(e.target.value)}
            />
          </FormField>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-(--text-primary)">Media</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={uploadMutation.isPending}
                onClick={() => fileRef.current?.click()}
              >
                {uploadMutation.isPending ? 'Uploading…' : 'Add image / video'}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadMutation.mutate(file)
                  e.target.value = ''
                }}
              />
            </div>
            {draftMedia.length ? (
              <ul className="space-y-2">
                {draftMedia.map((item) => (
                  <li
                    key={item.url}
                    className="flex items-center justify-between rounded-lg border border-(--border) px-3 py-2 text-sm"
                  >
                    <span className="truncate capitalize text-(--text-secondary)">
                      {item.type} · {item.url}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDraftMedia((prev) => prev.filter((m) => m.url !== item.url))
                      }
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-(--text-muted)">Optional. Supports images and short videos.</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitCompose}
              disabled={
                createMutation.isPending ||
                !draftTitle.trim() ||
                !draftBody.trim() ||
                (draftAudience === 'users' && !draftUserIds.trim())
              }
            >
              {createMutation.isPending ? 'Publishing…' : 'Publish'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

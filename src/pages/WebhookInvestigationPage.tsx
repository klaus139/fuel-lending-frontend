/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../api/admin'
import {
  Button,
  Card,
  Input,
  PageHeader,
  Spinner,
  StatusBadge,
} from '../components/ui'
import { formatDateTime } from '../lib/utils'
import type { AdminWebhookLogDetail } from '../types/api'

export function WebhookInvestigationPage() {
  const [reference, setReference] = useState('')
  const [submittedRef, setSubmittedRef] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const investigateQuery = useQuery({
    queryKey: ['admin', 'webhooks', 'investigate', submittedRef],
    queryFn: () => adminApi.investigateWebhook(submittedRef),
    enabled: submittedRef.length > 0,
  })

  const detailQuery = useQuery({
    queryKey: ['admin', 'webhooks', selectedId],
    queryFn: () => adminApi.getWebhook(selectedId!),
    enabled: Boolean(selectedId),
  })

  const items = investigateQuery.data?.items ?? []

  const summary = useMemo(() => {
    if (!investigateQuery.data) return null
    const d = investigateQuery.data
    return {
      found: d.found,
      count: d.count,
      ok: d.hasSuccessfulProcessing,
    }
  }, [investigateQuery.data])

  useEffect(() => {
    if (items.length === 1 && !selectedId) {
      setSelectedId(items[0].id)
    }
  }, [items, selectedId])

  return (
    <div>
      <PageHeader
        title="Payment webhook lookup"
        description="Paste a Paystack payment reference to see if we received the webhook and whether it was processed."
      />

      <Card className="mb-6">
        <form
          className="flex flex-col gap-3 p-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            const ref = reference.trim()
            if (!ref) return
            setSelectedId(null)
            setSubmittedRef(ref)
          }}
        >
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-xs font-medium text-(--text-secondary)">
              Paystack reference
            </label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. FCR_778a4347_1785912499154_a13c6d"
            />
          </div>
          <Button type="submit" disabled={!reference.trim() || investigateQuery.isFetching}>
            {investigateQuery.isFetching ? 'Searching…' : 'Investigate'}
          </Button>
        </form>
      </Card>

      {submittedRef && investigateQuery.isLoading && <Spinner />}

      {summary && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Card>
            <p className="text-xs text-(--text-muted)">Webhook received?</p>
            <p className="mt-1 text-lg font-semibold text-(--text-primary)">
              {summary.found ? 'Yes' : 'No'}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-(--text-muted)">Hits for this reference</p>
            <p className="mt-1 text-lg font-semibold text-(--text-primary)">{summary.count}</p>
          </Card>
          <Card>
            <p className="text-xs text-(--text-muted)">Successfully processed?</p>
            <p className="mt-1 text-lg font-semibold text-(--text-primary)">
              {summary.ok ? 'Yes' : summary.found ? 'Received but not processed' : '—'}
            </p>
          </Card>
        </div>
      )}

      {summary && !summary.found && (
        <Card className="mb-6 border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-(--text-primary)">
            No webhook was logged for <code className="text-emerald-500">{submittedRef}</code>.
            That usually means Paystack never hit our server, the wrong webhook URL is configured,
            or the reference is mistyped.
          </p>
        </Card>
      )}

      {items.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-(--text-primary)">Matches</h3>
            <div className="space-y-2">
              {items.map((item: AdminWebhookLogDetail) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                    selectedId === item.id
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-(--border) hover:bg-(--bg-hover)'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={item.processingStatus} />
                    <span className="text-xs text-(--text-muted)">{formatDateTime(item.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-(--text-primary)">
                    {item.event ?? 'unknown event'} · {item.provider}
                  </p>
                  <p className="text-xs text-(--text-muted)">
                    Amount:{' '}
                    {item.amountNairaHint != null
                      ? `₦${item.amountNairaHint.toLocaleString()} (${item.amount} kobo)`
                      : item.amount ?? '—'}
                  </p>
                  {item.processingError && (
                    <p className="mt-1 text-xs text-red-400">{item.processingError}</p>
                  )}
                  {item.processingNote && (
                    <p className="mt-1 text-xs text-(--text-secondary)">{item.processingNote}</p>
                  )}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-(--text-primary)">Full payload</h3>
            {!selectedId && (
              <p className="text-sm text-(--text-muted)">Select a webhook on the left to inspect details.</p>
            )}
            {selectedId && detailQuery.isLoading && <Spinner />}
            {detailQuery.data && <WebhookDetailView log={detailQuery.data} />}
          </Card>
        </div>
      )}
    </div>
  )
}

function WebhookDetailView({ log }: { log: AdminWebhookLogDetail }) {
  return (
    <div className="space-y-3 text-sm">
      <Row label="Reference" value={log.reference ?? '—'} />
      <Row label="Event" value={log.event ?? '—'} />
      <Row label="Status" value={log.processingStatus} />
      <Row
        label="Amount"
        value={
          log.amountNairaHint != null
            ? `₦${log.amountNairaHint.toLocaleString()} (${log.amount} kobo)`
            : String(log.amount ?? '—')
        }
      />
      <Row label="Received" value={formatDateTime(log.createdAt)} />
      <Row label="Processed" value={log.processedAt ? formatDateTime(log.processedAt) : '—'} />
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-(--text-muted)">Payload</p>
        <pre className="max-h-96 overflow-auto rounded-lg bg-(--bg-primary) p-3 text-xs text-(--text-secondary)">
          {JSON.stringify(log.payload, null, 2)}
        </pre>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-(--border) py-1.5">
      <span className="text-(--text-muted)">{label}</span>
      <span className="break-all text-right font-medium text-(--text-primary)">{value}</span>
    </div>
  )
}

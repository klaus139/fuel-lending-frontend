import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api/admin'
import { Button, FormField, Input, PageHeader } from '../components/ui'
import { formatCurrency } from '../lib/utils'

function SourceBadge({ source }: { source: 'database' | 'env' }) {
  return (
    <span
      className={
        source === 'database'
          ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-500'
          : 'rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600'
      }
    >
      {source === 'database' ? 'Saved' : 'Env default'}
    </span>
  )
}

export function SettingsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'config', 'loan'],
    queryFn: adminApi.getLoanConfig,
  })

  const [interestPerLitre, setInterestPerLitre] = useState('')
  const [overdueDailyInterestPercent, setOverdueDailyInterestPercent] = useState('')

  useEffect(() => {
    if (!data) return
    setInterestPerLitre(String(data.interestPerLitre))
    setOverdueDailyInterestPercent(String(data.overdueDailyInterestPercent))
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () =>
      adminApi.setLoanConfig({
        interestPerLitre: Number(interestPerLitre),
        overdueDailyInterestPercent: Number(overdueDailyInterestPercent),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'config', 'loan'] }),
  })

  const parsedInterest = Number(interestPerLitre)
  const parsedOverdue = Number(overdueDailyInterestPercent)
  const canSave =
    Number.isFinite(parsedInterest) &&
    parsedInterest >= 0 &&
    Number.isFinite(parsedOverdue) &&
    parsedOverdue >= 0 &&
    parsedOverdue <= 100

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Platform loan interest configuration"
      />

      <div className="max-w-2xl rounded-xl border border-(--border) bg-(--bg-secondary) p-6">
        <h2 className="text-lg font-semibold text-(--text-primary)">Loan interest</h2>
        <p className="mt-1 text-sm text-(--text-muted)">
          These rates apply to new fuel purchases and overdue reminders. Existing loans keep the
          rate snapshotted at disbursement.
        </p>

        {isLoading ? (
          <p className="mt-6 text-sm text-(--text-muted)">Loading configuration...</p>
        ) : (
          <div className="mt-6 space-y-5">
            <FormField label="Interest per litre">
              <p className="mb-2 text-xs text-(--text-muted)">
                Added to each litre of fuel purchased on credit
              </p>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={interestPerLitre}
                  onChange={(e) => setInterestPerLitre(e.target.value)}
                />
                {data && <SourceBadge source={data.sources.interestPerLitre} />}
              </div>
              {Number.isFinite(parsedInterest) && (
                <p className="mt-1 text-xs text-(--text-muted)">
                  Example: 10 L at this rate adds {formatCurrency(parsedInterest * 10)} interest
                </p>
              )}
            </FormField>

            <FormField label="Overdue daily interest (%)">
              <p className="mb-2 text-xs text-(--text-muted)">
                Daily percent applied after the loan due date (used in overdue notices)
              </p>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={overdueDailyInterestPercent}
                  onChange={(e) => setOverdueDailyInterestPercent(e.target.value)}
                />
                {data && <SourceBadge source={data.sources.overdueDailyInterestPercent} />}
              </div>
            </FormField>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!canSave || saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </div>

            {saveMutation.isSuccess && (
              <p className="text-sm text-emerald-500">Configuration saved.</p>
            )}
            {saveMutation.isError && (
              <p className="text-sm text-red-500">
                {(saveMutation.error as Error).message || 'Failed to save configuration'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

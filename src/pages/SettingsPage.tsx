import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api/admin'
import { Button, FormField, Input, PageHeader, Select } from '../components/ui'
import { formatCurrency } from '../lib/utils'
import type { ServiceChargeMode } from '../types/api'

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

  const [serviceChargeMode, setServiceChargeMode] = useState<ServiceChargeMode>('fixed')
  const [serviceChargePerLitre, setServiceChargePerLitre] = useState('')
  const [serviceChargePercent, setServiceChargePercent] = useState('')
  const [overdueDailyInterestPercent, setOverdueDailyInterestPercent] = useState('')

  useEffect(() => {
    if (!data) return
    setServiceChargeMode(data.serviceChargeMode)
    setServiceChargePerLitre(String(data.serviceChargePerLitre ?? data.interestPerLitre))
    setServiceChargePercent(String(data.serviceChargePercent))
    setOverdueDailyInterestPercent(String(data.overdueDailyInterestPercent))
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () =>
      adminApi.setLoanConfig({
        serviceChargeMode,
        serviceChargePerLitre: Number(serviceChargePerLitre),
        serviceChargePercent: Number(serviceChargePercent),
        overdueDailyInterestPercent: Number(overdueDailyInterestPercent),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'config', 'loan'] }),
  })

  const parsedPerLitre = Number(serviceChargePerLitre)
  const parsedPercent = Number(serviceChargePercent)
  const parsedOverdue = Number(overdueDailyInterestPercent)
  const canSave =
    Number.isFinite(parsedPerLitre) &&
    parsedPerLitre >= 0 &&
    Number.isFinite(parsedPercent) &&
    parsedPercent >= 0 &&
    parsedPercent <= 100 &&
    Number.isFinite(parsedOverdue) &&
    parsedOverdue >= 0 &&
    parsedOverdue <= 100

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Service charge and overdue interest configuration"
      />

      <div className="max-w-2xl rounded-xl border border-(--border) bg-(--bg-secondary) p-6">
        <h2 className="text-lg font-semibold text-(--text-primary)">Fuel service charge</h2>
        <p className="mt-1 text-sm text-(--text-muted)">
          Charged on each fuel purchase (not interest). True interest only applies after the due
          date. New purchases use the latest saved rates.
        </p>

        {isLoading ? (
          <p className="mt-6 text-sm text-(--text-muted)">Loading configuration...</p>
        ) : (
          <div className="mt-6 space-y-5">
            <FormField label="Service charge mode">
              <p className="mb-2 text-xs text-(--text-muted)">
                Fixed ₦ per litre, or a percent of the fuel purchase amount
              </p>
              <div className="flex items-center gap-3">
                <Select
                  value={serviceChargeMode}
                  onChange={(e) => setServiceChargeMode(e.target.value as ServiceChargeMode)}
                >
                  <option value="fixed">Fixed (₦ per litre)</option>
                  <option value="percent">Percent of fuel cost</option>
                </Select>
                {data && <SourceBadge source={data.sources.serviceChargeMode} />}
              </div>
            </FormField>

            {serviceChargeMode === 'fixed' ? (
              <FormField label="Service charge per litre (₦)">
                <p className="mb-2 text-xs text-(--text-muted)">
                  Added to each litre of fuel purchased on credit
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={serviceChargePerLitre}
                    onChange={(e) => setServiceChargePerLitre(e.target.value)}
                  />
                  {data && (
                    <SourceBadge
                      source={
                        data.sources.serviceChargePerLitre ?? data.sources.interestPerLitre
                      }
                    />
                  )}
                </div>
                {Number.isFinite(parsedPerLitre) && (
                  <p className="mt-1 text-xs text-(--text-muted)">
                    Example: 10 L adds {formatCurrency(parsedPerLitre * 10)} service charge
                  </p>
                )}
              </FormField>
            ) : (
              <FormField label="Service charge percent (%)">
                <p className="mb-2 text-xs text-(--text-muted)">
                  Percent of the fuel purchase amount added as service charge
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={serviceChargePercent}
                    onChange={(e) => setServiceChargePercent(e.target.value)}
                  />
                  {data && <SourceBadge source={data.sources.serviceChargePercent} />}
                </div>
                {Number.isFinite(parsedPercent) && (
                  <p className="mt-1 text-xs text-(--text-muted)">
                    Example: ₦10,000 fuel adds {formatCurrency(10_000 * (parsedPercent / 100))}{' '}
                    service charge
                  </p>
                )}
              </FormField>
            )}

            <FormField label="Overdue daily interest (%)">
              <p className="mb-2 text-xs text-(--text-muted)">
                Daily percent of outstanding balance applied only after the loan due date
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

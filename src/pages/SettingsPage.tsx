/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api/admin'
import { Button, FormField, Input, PageHeader, Select } from '../components/ui'
import { formatCurrency } from '../lib/utils'
import type { ServiceChargeMode, VehicleType } from '../types/api'

const VEHICLE_LABELS: Record<VehicleType, string> = {
  bike: 'Bike',
  car: 'Car',
  keke: 'Keke',
  bus: 'Bus',
  taxi: 'Taxi',
  trailer: 'Trailer',
}

function SourceBadge({ source }: { source: 'database' | 'env' }) {
  return (
    <span
      className={
        source === 'database'
          ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-500'
          : 'rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600'
      }
    >
      {source === 'database' ? 'Saved' : 'default'}
    </span>
  )
}

export function SettingsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'config', 'loan'],
    queryFn: adminApi.getLoanConfig,
  })

  const { data: capsData, isLoading: capsLoading } = useQuery({
    queryKey: ['admin', 'config', 'vehicle-fuel-caps'],
    queryFn: adminApi.getVehicleFuelCaps,
  })

  const { data: referralData, isLoading: referralLoading } = useQuery({
    queryKey: ['admin', 'config', 'referrals'],
    queryFn: adminApi.getReferralConfig,
  })

  const [serviceChargeMode, setServiceChargeMode] = useState<ServiceChargeMode>('fixed')
  const [serviceChargePerLitre, setServiceChargePerLitre] = useState('')
  const [serviceChargePercent, setServiceChargePercent] = useState('')
  const [overdueDailyInterestPercent, setOverdueDailyInterestPercent] = useState('')
  const [capInputs, setCapInputs] = useState<Partial<Record<VehicleType, string>>>({})
  const [bonusLitres, setBonusLitres] = useState('')
  const [referencePricePerLitre, setReferencePricePerLitre] = useState('')
  const [milestoneCount, setMilestoneCount] = useState('')
  const [debtReductionPercent, setDebtReductionPercent] = useState('')

  useEffect(() => {
    if (!data) return
    setServiceChargeMode(data.serviceChargeMode)
    setServiceChargePerLitre(String(data.serviceChargePerLitre ?? data.interestPerLitre))
    setServiceChargePercent(String(data.serviceChargePercent))
    setOverdueDailyInterestPercent(String(data.overdueDailyInterestPercent))
  }, [data])

  useEffect(() => {
    if (!capsData) return
    const next: Partial<Record<VehicleType, string>> = {}
    for (const type of capsData.vehicleTypes) {
      next[type] = String(capsData.caps[type] ?? 20)
    }
    setCapInputs(next)
  }, [capsData])

  useEffect(() => {
    if (!referralData) return
    setBonusLitres(String(referralData.bonusLitres))
    setReferencePricePerLitre(String(referralData.referencePricePerLitre))
    setMilestoneCount(String(referralData.milestoneCount))
    setDebtReductionPercent(String(referralData.debtReductionPercent))
  }, [referralData])

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

  const saveCapsMutation = useMutation({
    mutationFn: () => {
      const caps: Partial<Record<VehicleType, number>> = {}
      for (const [type, value] of Object.entries(capInputs)) {
        const litres = Number(value)
        if (Number.isFinite(litres) && litres > 0) {
          caps[type as VehicleType] = litres
        }
      }
      return adminApi.setVehicleFuelCaps(caps)
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['admin', 'config', 'vehicle-fuel-caps'] }),
  })

  const saveReferralMutation = useMutation({
    mutationFn: () =>
      adminApi.setReferralConfig({
        bonusLitres: Number(bonusLitres),
        referencePricePerLitre: Number(referencePricePerLitre),
        milestoneCount: Number(milestoneCount),
        debtReductionPercent: Number(debtReductionPercent),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'config', 'referrals'] }),
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

  const canSaveCaps =
    Object.values(capInputs).length > 0 &&
    Object.values(capInputs).every((value) => {
      const litres = Number(value)
      return Number.isFinite(litres) && litres > 0 && litres <= 10_000
    })

  const parsedBonusLitres = Number(bonusLitres)
  const parsedReferencePrice = Number(referencePricePerLitre)
  const parsedMilestone = Number(milestoneCount)
  const parsedDebtReduction = Number(debtReductionPercent)
  const canSaveReferral =
    Number.isFinite(parsedBonusLitres) &&
    parsedBonusLitres > 0 &&
    parsedBonusLitres <= 1_000 &&
    Number.isFinite(parsedReferencePrice) &&
    parsedReferencePrice > 0 &&
    Number.isFinite(parsedMilestone) &&
    Number.isInteger(parsedMilestone) &&
    parsedMilestone >= 1 &&
    parsedMilestone <= 100 &&
    Number.isFinite(parsedDebtReduction) &&
    parsedDebtReduction >= 0 &&
    parsedDebtReduction <= 100

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Fuel limits, referrals, service charge, and overdue interest"
      />

      <div className="mb-6 max-w-2xl rounded-xl border border-(--border) bg-(--bg-secondary) p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-(--text-primary)">
              Vehicle fuel limits (litres)
            </h2>
            <p className="mt-1 text-sm text-(--text-muted)">
              Each vehicle type gets a max litres per purchase. Customers must repay before the next
              purchase.
            </p>
          </div>
          {capsData && <SourceBadge source={capsData.source} />}
        </div>

        {capsLoading ? (
          <p className="mt-6 text-sm text-(--text-muted)">Loading fuel limits...</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(capsData?.vehicleTypes ?? (Object.keys(VEHICLE_LABELS) as VehicleType[])).map(
              (type) => (
                <FormField key={type} label={`${VEHICLE_LABELS[type]} (L)`}>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.1}
                    value={capInputs[type] ?? ''}
                    onChange={(e) =>
                      setCapInputs((prev) => ({ ...prev, [type]: e.target.value }))
                    }
                  />
                </FormField>
              ),
            )}
            <div className="sm:col-span-2 flex justify-end pt-2">
              <Button
                onClick={() => saveCapsMutation.mutate()}
                disabled={!canSaveCaps || saveCapsMutation.isPending}
              >
                {saveCapsMutation.isPending ? 'Saving...' : 'Save fuel limits'}
              </Button>
            </div>
            {saveCapsMutation.isSuccess && (
              <p className="sm:col-span-2 text-sm text-emerald-500">Fuel limits saved.</p>
            )}
            {saveCapsMutation.isError && (
              <p className="sm:col-span-2 text-sm text-red-500">
                {(saveCapsMutation.error as Error).message || 'Failed to save fuel limits'}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mb-6 max-w-2xl rounded-xl border border-(--border) bg-(--bg-secondary) p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-(--text-primary)">Referral rewards</h2>
            <p className="mt-1 text-sm text-(--text-muted)">
              Referrers earn bonus litres when invitees complete their first fuel purchase. If the
              referrer has an outstanding purchase, they get a percent off instead.
            </p>
          </div>
          {referralData && <SourceBadge source={referralData.sources.bonusLitres} />}
        </div>

        {referralLoading ? (
          <p className="mt-6 text-sm text-(--text-muted)">Loading referral settings...</p>
        ) : (
          <div className="mt-6 space-y-5">
            <FormField label="Bonus litres">
              <p className="mb-2 text-xs text-(--text-muted)">
                Litres credited to the referrer&apos;s fuel wallet at each milestone
              </p>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={bonusLitres}
                  onChange={(e) => setBonusLitres(e.target.value)}
                />
                {referralData && <SourceBadge source={referralData.sources.bonusLitres} />}
              </div>
            </FormField>

            <FormField label="Reference price (₦/L)">
              <p className="mb-2 text-xs text-(--text-muted)">
                Used to convert bonus litres into fuel-wallet credit
              </p>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={referencePricePerLitre}
                  onChange={(e) => setReferencePricePerLitre(e.target.value)}
                />
                {referralData && (
                  <SourceBadge source={referralData.sources.referencePricePerLitre} />
                )}
              </div>
              {Number.isFinite(parsedBonusLitres) && Number.isFinite(parsedReferencePrice) && (
                <p className="mt-1 text-xs text-(--text-muted)">
                  Each reward credits about{' '}
                  {formatCurrency(parsedBonusLitres * parsedReferencePrice)} (
                  {parsedBonusLitres} L)
                </p>
              )}
            </FormField>

            <FormField label="Milestone (successful referrals)">
              <p className="mb-2 text-xs text-(--text-muted)">
                Reward unlocks every N friends who complete a first purchase
              </p>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={milestoneCount}
                  onChange={(e) => setMilestoneCount(e.target.value)}
                />
                {referralData && <SourceBadge source={referralData.sources.milestoneCount} />}
              </div>
            </FormField>

            <FormField label="Outstanding purchase discount (%)">
              <p className="mb-2 text-xs text-(--text-muted)">
                Applied instead of litre bonus when the referrer has unpaid fuel
              </p>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={debtReductionPercent}
                  onChange={(e) => setDebtReductionPercent(e.target.value)}
                />
                {referralData && (
                  <SourceBadge source={referralData.sources.debtReductionPercent} />
                )}
              </div>
            </FormField>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => saveReferralMutation.mutate()}
                disabled={!canSaveReferral || saveReferralMutation.isPending}
              >
                {saveReferralMutation.isPending ? 'Saving...' : 'Save referral settings'}
              </Button>
            </div>

            {saveReferralMutation.isSuccess && (
              <p className="text-sm text-emerald-500">Referral settings saved.</p>
            )}
            {saveReferralMutation.isError && (
              <p className="text-sm text-red-500">
                {(saveReferralMutation.error as Error).message ||
                  'Failed to save referral settings'}
              </p>
            )}
          </div>
        )}
      </div>

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
                  Added to each litre of fuel purchased
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
                Daily percent of outstanding balance applied only after the due date
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

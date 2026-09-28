/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api/admin'
import { getApiErrorMessage } from '../api/client'
import { Button, FormField, Input, PageHeader } from '../components/ui'
import { useToast } from '../components/ui/Toast'
import type { VehicleType } from '../types/api'

const VEHICLE_LABELS: Record<VehicleType, string> = {
  bike: 'Bike',
  car: 'Car',
  keke: 'Keke',
  bus: 'Bus',
  taxi: 'Taxi',
  trailer: 'Trailer',
}

export function SubsidyLimitsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'subsidy-fuel-caps'],
    queryFn: adminApi.getSubsidyFuelCaps,
  })
  const [capInputs, setCapInputs] = useState<Partial<Record<VehicleType, string>>>({})

  useEffect(() => {
    if (!data) return
    const next: Partial<Record<VehicleType, string>> = {}
    for (const type of data.vehicleTypes) {
      next[type] = String(data.caps[type] ?? 20)
    }
    setCapInputs(next)
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () => {
      const caps: Partial<Record<VehicleType, number>> = {}
      for (const [type, value] of Object.entries(capInputs)) {
        const litres = Number(value)
        if (Number.isFinite(litres) && litres > 0) {
          caps[type as VehicleType] = litres
        }
      }
      return adminApi.setSubsidyFuelCaps(caps)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'subsidy-fuel-caps'] })
      toast.success('Subsidy litre limits saved')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Could not save subsidy litre limits'))
    },
  })

  const canSave =
    Object.values(capInputs).length > 0 &&
    Object.values(capInputs).every((value) => {
      const litres = Number(value)
      return Number.isFinite(litres) && litres > 0 && litres <= 10_000
    })

  return (
    <div>
      <PageHeader
        title="Subsidy limits"
        description="Daily litres a subsidy beneficiary can collect, by vehicle type. Lending fuel limits stay unchanged."
      />

      <div className="max-w-2xl rounded-xl border border-(--border) bg-(--bg-secondary) p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-(--text-muted)">
            {data?.source === 'database'
              ? 'Using the saved subsidy limits.'
              : 'Using the default 20L per vehicle until you save subsidy limits.'}
          </p>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-(--text-muted)">Loading subsidy limits...</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(data?.vehicleTypes ?? (Object.keys(VEHICLE_LABELS) as VehicleType[])).map((type) => (
              <FormField key={type} label={`${VEHICLE_LABELS[type]} (L per day)`}>
                <Input
                  type="number"
                  min={0.01}
                  step={0.1}
                  value={capInputs[type] ?? ''}
                  onChange={(e) => setCapInputs((prev) => ({ ...prev, [type]: e.target.value }))}
                />
              </FormField>
            ))}
            <div className="flex justify-end pt-2 sm:col-span-2">
              <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save subsidy limits'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

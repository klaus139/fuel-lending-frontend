import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  StatusBadge,
} from '../components/ui'
import { useToast } from '../components/ui/Toast'
import { downloadCsv, formatCurrency, formatDate, formatNumber } from '../lib/utils'
import type { SubsidySettlementRow } from '../types/api'

export function SubsidySettlementsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    merchantCode: '',
    settlementDate: '',
    paymentReference: '',
    note: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'subsidy-settlements', page, limit],
    queryFn: () => adminApi.listSubsidySettlements({ page, limit }),
  })

  const settleMutation = useMutation({
    mutationFn: () =>
      adminApi.settleSubsidy({
        merchantCode: form.merchantCode.trim(),
        settlementDate: form.settlementDate,
        paymentReference: form.paymentReference.trim() || undefined,
        note: form.note.trim() || undefined,
      }),
    onSuccess: () => {
      setOpen(false)
      setForm({ merchantCode: '', settlementDate: '', paymentReference: '', note: '' })
      void qc.invalidateQueries({ queryKey: ['admin', 'subsidy-settlements'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'subsidy-sales'] })
      toast.success('Subsidy sales settled')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Could not settle subsidy sales'))
    },
  })

  const columns = useMemo<ColumnDef<SubsidySettlementRow>[]>(
    () => [
      {
        accessorKey: 'merchantCode',
        header: 'Station',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.businessName}</p>
            <p className="text-xs text-(--text-muted)">{row.original.merchantCode}</p>
          </div>
        ),
      },
      {
        accessorKey: 'settlementDate',
        header: 'Sales date',
        cell: ({ getValue }) => formatDate(getValue<string>()),
      },
      { accessorKey: 'saleCount', header: 'Sales' },
      {
        accessorKey: 'totalLitres',
        header: 'Litres',
        cell: ({ getValue }) => `${formatNumber(getValue<number>(), 2)} L`,
      },
      {
        accessorKey: 'grossAmount',
        header: 'Amount',
        cell: ({ getValue }) => formatCurrency(getValue<number>()),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: 'paymentReference',
        header: 'Payment ref',
        cell: ({ getValue }) => getValue<string>() || '—',
      },
      {
        accessorKey: 'paidAt',
        header: 'Paid',
        cell: ({ getValue }) => formatDate(getValue<string>()),
      },
    ],
    [],
  )

  const handleExport = () => {
    if (!data?.items.length) return
    downloadCsv(
      'subsidy-settlements.csv',
      ['Station', 'Merchant', 'Sales date', 'Sales', 'Litres', 'Amount', 'Payment ref', 'Paid'],
      data.items.map((row) => [
        row.businessName,
        row.merchantCode,
        row.settlementDate,
        String(row.saleCount),
        String(row.totalLitres),
        String(row.grossAmount),
        row.paymentReference ?? '',
        row.paidAt,
      ]),
    )
  }

  return (
    <div>
      <PageHeader
        title="Subsidy settlements"
        description="Pay a station for unsettled subsidy fills on a given day"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setOpen(true)}>Settle station</Button>
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
        emptyMessage="No subsidy settlements yet"
      />

      <Modal open={open} onClose={() => setOpen(false)} title="Settle subsidy sales">
        <p className="mb-4 text-sm text-(--text-secondary)">
          This marks every unsettled subsidy sale for that station and date as paid. It does not
          touch lending settlements.
        </p>
        <FormField label="Merchant code">
          <Input
            value={form.merchantCode}
            onChange={(e) => setForm({ ...form, merchantCode: e.target.value })}
            placeholder="Station merchant code"
          />
        </FormField>
        <FormField label="Sales date">
          <Input
            type="date"
            value={form.settlementDate}
            onChange={(e) => setForm({ ...form, settlementDate: e.target.value })}
          />
        </FormField>
        <FormField label="Payment reference">
          <Input
            value={form.paymentReference}
            onChange={(e) => setForm({ ...form, paymentReference: e.target.value })}
            placeholder="Bank transfer reference"
          />
        </FormField>
        <FormField label="Note">
          <Input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => settleMutation.mutate()}
            disabled={settleMutation.isPending || !form.merchantCode.trim() || !form.settlementDate}
          >
            {settleMutation.isPending ? 'Settling...' : 'Mark paid'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

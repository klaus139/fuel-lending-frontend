export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

export function formatNumber(n: number, decimals = 2): string {
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-400',
    approved: 'bg-emerald-500/20 text-emerald-400',
    completed: 'bg-emerald-500/20 text-emerald-400',
    paid: 'bg-emerald-500/20 text-emerald-400',
    pending: 'bg-amber-500/20 text-amber-400',
    partially_repaid: 'bg-blue-500/20 text-blue-400',
    awaiting_confirmation: 'bg-blue-500/20 text-blue-400',
    overdue: 'bg-red-500/20 text-red-400',
    defaulted: 'bg-red-500/20 text-red-400',
    rejected: 'bg-red-500/20 text-red-400',
    declined: 'bg-red-500/20 text-red-400',
    blocked: 'bg-red-500/20 text-red-400',
    suspended: 'bg-red-500/20 text-red-400',
    expired: 'bg-zinc-500/20 text-zinc-400',
    cancelled: 'bg-zinc-500/20 text-zinc-400',
  }
  return map[status] ?? 'bg-zinc-500/20 text-zinc-400'
}

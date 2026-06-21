import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function StatusBadge({ status }: { status?: string | null }) {
  const label = (status ?? 'unknown').replace(/_/g, ' ')

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        status === 'active' || status === 'approved' || status === 'completed' || status === 'paid' || status === 'resolved'
          ? 'bg-emerald-500/15 text-emerald-500'
          : status === 'pending' || status === 'partially_repaid' || status === 'awaiting_confirmation' || status === 'open'
            ? 'bg-amber-500/15 text-amber-500'
            : status === 'in_progress'
              ? 'bg-blue-500/15 text-blue-500'
              : status === 'rejected' || status === 'declined' || status === 'defaulted' || status === 'blocked' || status === 'suspended' || status === 'closed'
              ? 'bg-red-500/15 text-red-500'
              : 'bg-zinc-500/15 text-zinc-400',
      )}
    >
      {label}
    </span>
  )
}

export function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: 'green' | 'amber' | 'red' | 'blue'
}) {
  const accentMap = {
    green: 'border-emerald-500/30',
    amber: 'border-amber-500/30',
    red: 'border-red-500/30',
    blue: 'border-blue-500/30',
  }

  return (
    <div
      className={cn(
        'rounded-xl border bg-(--bg-card) p-5 shadow-sm',
        accent ? accentMap[accent] : 'border-(--border)',
      )}
    >
      <p className="text-sm text-(--text-muted)">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-(--text-primary)">{value}</p>
      {sub && <p className="mt-1 text-xs text-(--text-secondary)">{sub}</p>}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-(--text-primary)">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-(--text-secondary)">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-(--border) bg-(--bg-card)', className)}>
      {children}
    </div>
  )
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}) {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50',
    secondary:
      'border border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--border)]',
    danger: 'bg-red-600 text-white hover:bg-red-500 disabled:opacity-50',
    ghost: 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
  }
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' }

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border border-(--border) bg-(--bg-secondary) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-lg border border-(--border) bg-(--bg-secondary) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500',
        className,
      )}
      {...props}
    />
  )
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'rounded-lg border border-(--border) bg-(--bg-secondary) px-3 py-2 text-sm text-(--text-primary) focus:border-emerald-500 focus:outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} role="presentation" />
      <div
        className={cn(
          'relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-xl border border-(--border) bg-(--bg-card) p-6 shadow-2xl',
          wide ? 'max-w-2xl' : 'max-w-md',
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-(--text-primary)">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-(--text-muted) hover:bg-(--bg-hover) hover:text-(--text-primary)"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  )
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
      {message}
    </div>
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-xs font-medium text-(--text-secondary)">{children}</label>
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

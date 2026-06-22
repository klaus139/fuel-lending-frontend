import { formatCurrency, formatNumber } from '../lib/utils'
import type { LoanBreakdown } from '../types/api'

export function LoanBreakdownCell({ breakdown }: { breakdown: LoanBreakdown }) {
  return (
    <div className="min-w-44 space-y-0.5 text-xs">
      <div className="flex justify-between gap-3">
        <span className="text-(--text-muted)">Credit limit</span>
        <span>{formatCurrency(breakdown.creditLimit)}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-(--text-muted)">Disbursed</span>
        <span>{formatCurrency(breakdown.amountDisbursed)}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-(--text-muted)">Spent</span>
        <span>{formatCurrency(breakdown.amountSpent)}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-(--text-muted)">Unspent</span>
        <span>{formatCurrency(breakdown.amountUnspent)}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-(--text-muted)">To pay</span>
        <span className="font-medium text-amber-500">{formatCurrency(breakdown.amountToPay)}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-(--text-muted)">Litres</span>
        <span>{formatNumber(breakdown.litresConsumed, 2)} L</span>
      </div>
    </div>
  )
}

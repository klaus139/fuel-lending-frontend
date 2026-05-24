/* eslint-disable react-hooks/incompatible-library */
import { useMemo, useState, type ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import type { PaginationMeta } from '../../types/api'
import { Button } from '../ui'
import { cn } from '../../lib/utils'

type DataTableProps<T> = {
  data: T[]
  columns: ColumnDef<T, unknown>[]
  pagination?: PaginationMeta
  onPageChange?: (page: number) => void
  onLimitChange?: (limit: number) => void
  loading?: boolean
  emptyMessage?: string
  toolbar?: ReactNode
}

export function DataTable<T>({
  data,
  columns,
  pagination,
  onPageChange,
  onLimitChange,
  loading,
  emptyMessage = 'No records found',
  toolbar,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const page = pagination?.page ?? 1
  const totalPages = pagination?.totalPages ?? 1

  return (
    <div className="overflow-hidden rounded-xl border border-(--border) bg-(--bg-card)">
      {toolbar && (
        <div className="flex flex-wrap items-center gap-3 border-b border-(--border) p-4">
          {toolbar}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-(--border) bg-(--bg-hover)">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wide text-(--text-muted)"
                  >
                    {header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="flex items-center gap-1 hover:text-(--text-primary)"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: ' ↑',
                          desc: ' ↓',
                        }[header.column.getIsSorted() as string] ?? null}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-(--text-muted)">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-(--text-muted)">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-(--border) transition-colors hover:bg-(--bg-hover)"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="whitespace-nowrap px-4 py-3 text-(--text-primary)">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination && onPageChange && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--border) px-4 py-3">
          <p className="text-xs text-(--text-muted)">
            Page {page} of {totalPages} · {pagination.total} total
          </p>
          <div className="flex items-center gap-2">
            {onLimitChange && (
              <select
                value={pagination.limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                className="rounded-lg border border-(--border) bg-(--bg-secondary) px-2 py-1 text-xs"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
            )}
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useColumns<T>(factory: () => ColumnDef<T, unknown>[]) {
  // eslint-disable-next-line react-hooks/use-memo
  return useMemo(factory, [factory])
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn(className)}>{children}</span>
}

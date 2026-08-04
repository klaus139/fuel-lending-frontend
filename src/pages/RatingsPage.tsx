import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { adminApi } from '../api/admin'
import { DataTable } from '../components/data-table/DataTable'
import { Input, KpiCard, PageHeader, Select } from '../components/ui'
import { formatDateTime } from '../lib/utils'
import type { AdminPurchaseRating } from '../types/api'

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`${rating} / 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? 'text-amber-500' : 'text-(--text-muted)'}>
          {i < rating ? '★' : '☆'}
        </span>
      ))}
      <span className="ml-1 text-xs font-medium text-(--text-secondary)">{rating}</span>
    </span>
  )
}

export function RatingsPage() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [rating, setRating] = useState('')
  const [minRating, setMinRating] = useState('')
  const [merchantUserId, setMerchantUserId] = useState('')
  const [userId, setUserId] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'ratings', page, limit, rating, minRating, merchantUserId, userId],
    queryFn: () =>
      adminApi.ratings({
        page,
        limit,
        rating: rating ? Number(rating) : undefined,
        minRating: !rating && minRating ? Number(minRating) : undefined,
        merchantUserId: merchantUserId.trim() || undefined,
        userId: userId.trim() || undefined,
      }),
  })

  const columns = useMemo<ColumnDef<AdminPurchaseRating>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
      {
        accessorKey: 'rating',
        header: 'Rating',
        cell: ({ getValue }) => <Stars rating={getValue<number>()} />,
      },
      {
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) => (
          <Link to={`/users/${row.original.userId}`} className="block hover:text-emerald-500">
            <p className="font-medium">{row.original.customerName}</p>
            <p className="text-xs text-(--text-muted)">{row.original.customerEmail}</p>
          </Link>
        ),
      },
      {
        id: 'station',
        header: 'Station',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.stationName}</p>
            {row.original.stationCode ? (
              <p className="text-xs text-(--text-muted)">{row.original.stationCode}</p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'review',
        header: 'Review',
        cell: ({ getValue }) => {
          const text = getValue<string | undefined>()
          if (!text) return <span className="text-(--text-muted)">—</span>
          return (
            <p className="max-w-xs truncate text-sm" title={text}>
              {text}
            </p>
          )
        },
      },
      {
        accessorKey: 'transactionId',
        header: 'Transaction',
        cell: ({ getValue }) => {
          const id = getValue<string>()
          return (
            <span className="font-mono text-xs text-(--text-secondary)" title={id}>
              …{id.slice(-10)}
            </span>
          )
        },
      },
    ],
    [],
  )

  const stats = data?.stats
  const lowCount = (stats?.ratingCounts?.[1] ?? 0) + (stats?.ratingCounts?.[2] ?? 0)

  return (
    <div>
      <PageHeader
        title="Purchase ratings"
        description="Customer feedback on fuel purchases and stations"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total ratings" value={String(stats?.total ?? 0)} />
        <KpiCard
          label="Average rating"
          value={stats?.total ? `${stats.averageRating.toFixed(2)} / 5` : '—'}
        />
        <KpiCard
          label="5-star ratings"
          value={String(stats?.ratingCounts?.[5] ?? 0)}
        />
        <KpiCard label="Low (1–2 stars)" value={String(lowCount)} />
      </div>

      <DataTable
        data={data?.items ?? []}
        columns={columns}
        pagination={data?.pagination}
        onPageChange={setPage}
        onLimitChange={(l) => {
          setLimit(l)
          setPage(1)
        }}
        loading={isLoading}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={rating}
              onChange={(e) => {
                setRating(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All stars</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n === 1 ? '' : 's'}
                </option>
              ))}
            </Select>
            <Select
              value={minRating}
              onChange={(e) => {
                setMinRating(e.target.value)
                setPage(1)
              }}
              disabled={!!rating}
            >
              <option value="">Min stars</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  ≥ {n}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Customer user id"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value)
                setPage(1)
              }}
              className="w-44"
            />
            <Input
              placeholder="Merchant user id"
              value={merchantUserId}
              onChange={(e) => {
                setMerchantUserId(e.target.value)
                setPage(1)
              }}
              className="w-44"
            />
          </div>
        }
      />
    </div>
  )
}

'use client'

import type { QuoteFilters } from '@/lib/types'

interface QuoteFiltersProps {
  filters: QuoteFilters
  onChange: (filters: QuoteFilters) => void
  onReset: () => void
}

const inputCls =
  'w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400'

export default function QuoteFiltersBar({ filters, onChange, onReset }: QuoteFiltersProps) {
  function update(partial: Partial<QuoteFilters>) {
    onChange({ ...filters, ...partial })
  }

  const hasFilters =
    !!filters.seller ||
    !!filters.dateFrom ||
    !!filters.dateTo ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined

  return (
    <div className="flex items-end gap-2 flex-wrap rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <div className="flex-1 min-w-[140px]">
        <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Seller</label>
        <input
          className={inputCls}
          placeholder="Name or email"
          value={filters.seller ?? ''}
          onChange={(e) => update({ seller: e.target.value || undefined })}
        />
      </div>
      <div className="min-w-[120px]">
        <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">From</label>
        <input
          className={inputCls}
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={(e) => update({ dateFrom: e.target.value || undefined })}
        />
      </div>
      <div className="min-w-[120px]">
        <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">To</label>
        <input
          className={inputCls}
          type="date"
          value={filters.dateTo ?? ''}
          onChange={(e) => update({ dateTo: e.target.value || undefined })}
        />
      </div>
      <div className="min-w-[100px]">
        <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Min ($)</label>
        <input
          className={inputCls}
          type="number"
          min={0}
          placeholder="0"
          value={filters.minPrice ?? ''}
          onChange={(e) =>
            update({ minPrice: e.target.value ? Number(e.target.value) : undefined })
          }
        />
      </div>
      <div className="min-w-[100px]">
        <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Max ($)</label>
        <input
          className={inputCls}
          type="number"
          min={0}
          placeholder="Any"
          value={filters.maxPrice ?? ''}
          onChange={(e) =>
            update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })
          }
        />
      </div>
      {hasFilters && (
        <button
          onClick={onReset}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          ✕ Clear
        </button>
      )}
    </div>
  )
}

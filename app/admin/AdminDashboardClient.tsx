'use client'

import { useState, useMemo } from 'react'
import QuotesTable from '@/components/admin/QuotesTable'
import QuoteFiltersBar from '@/components/admin/QuoteFilters'
import ExportButton from '@/components/admin/ExportButton'
import type { Quote, QuoteFilters } from '@/lib/types'
import { formatPrice } from '@/lib/pricing-engine'

interface AdminDashboardClientProps {
  initialQuotes: Quote[]
}

const EMPTY_FILTERS: QuoteFilters = {}

export default function AdminDashboardClient({ initialQuotes }: AdminDashboardClientProps) {
  const [filters, setFilters] = useState<QuoteFilters>(EMPTY_FILTERS)

  const filtered = useMemo(() => {
    return initialQuotes.filter((q) => {
      if (filters.seller) {
        const search = filters.seller.toLowerCase()
        if (
          !q.sellerName.toLowerCase().includes(search) &&
          !q.sellerEmail.toLowerCase().includes(search)
        ) {
          return false
        }
      }
      if (filters.dateFrom) {
        if (new Date(q.createdAt) < new Date(filters.dateFrom)) return false
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo)
        to.setDate(to.getDate() + 1)
        if (new Date(q.createdAt) >= to) return false
      }
      if (filters.minPrice !== undefined && q.totalPrice < filters.minPrice) return false
      if (filters.maxPrice !== undefined && q.totalPrice > filters.maxPrice) return false
      return true
    })
  }, [initialQuotes, filters])

  const totalRevenue = filtered.reduce((sum, q) => sum + (q.totalPrice ?? 0), 0)
  const isFiltered = filtered.length !== initialQuotes.length

  return (
    <div className="space-y-4">
      {/* Stats strip + Export */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200">
            <span className="text-lg font-bold text-gray-900">{initialQuotes.length}</span>
            <span className="text-xs text-gray-500">total quotes</span>
          </div>
          {isFiltered && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100">
              <span className="text-lg font-bold text-indigo-700">{filtered.length}</span>
              <span className="text-xs text-indigo-500">filtered</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200">
            <span className="text-lg font-bold text-gray-900">{formatPrice(totalRevenue)}</span>
            <span className="text-xs text-gray-500">{isFiltered ? 'filtered value' : 'total value'}</span>
          </div>
        </div>
        <ExportButton filters={filters} />
      </div>

      {/* Filters */}
      <QuoteFiltersBar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY_FILTERS)}
      />

      {/* Table */}
      <QuotesTable quotes={filtered} />
    </div>
  )
}

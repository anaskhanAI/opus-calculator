'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const [filters, setFilters] = useState<QuoteFilters>(EMPTY_FILTERS)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 1200)
  }, [router])

  // Refresh once on mount so navigating to /admin within the same tab always
  // shows the latest data (window focus event wouldn't fire in that case).
  useEffect(() => {
    router.refresh()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Also refresh whenever the browser window regains focus (switching tabs/windows).
  useEffect(() => {
    const onFocus = () => router.refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [router])

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
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200">
            <span className="text-lg font-bold text-gray-900">{initialQuotes.length}</span>
            <span className="text-xs text-gray-500">total quotes</span>
          </div>
          {isFiltered && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100">
              <span className="text-lg font-bold text-indigo-700">{filtered.length}</span>
              <span className="text-xs text-indigo-500">filtered</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200">
            <span className="text-lg font-bold text-gray-900">{formatPrice(totalRevenue)}</span>
            <span className="text-xs text-gray-500">{isFiltered ? 'filtered value' : 'total value'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <ExportButton filters={filters} />
        </div>
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

'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import type { QuoteFilters } from '@/lib/types'

interface ExportButtonProps {
  filters: QuoteFilters
}

export default function ExportButton({ filters }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.seller)                params.set('seller', filters.seller)
      if (filters.dateFrom)              params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo)                params.set('dateTo', filters.dateTo)
      if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice))
      if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice))

      const response = await fetch(`/api/quotes/export?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `opus-quotes-export-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Export failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="secondary" onClick={handleExport} loading={loading}>
      Export CSV
    </Button>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import type { Quote } from '@/lib/types'
import { formatPrice } from '@/lib/pricing-engine'

interface QuoteCardProps {
  quote: Quote
  onDuplicate: (quote: Quote) => void
  onRedownload: (quote: Quote) => void
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function QuoteCard({ quote, onDuplicate, onRedownload }: QuoteCardProps) {
  const [redownloading, setRedownloading] = useState(false)

  async function handleRedownload() {
    setRedownloading(true)
    try {
      await onRedownload(quote)
    } finally {
      setRedownloading(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="font-mono text-xs font-semibold text-indigo-600">
              {quote.quoteRef}
            </span>
            <Badge color={quote.calculatorMode === 'detailed' ? 'indigo' : 'blue'}>
              {quote.calculatorMode}
            </Badge>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 truncate">{quote.clientName}</h3>
          <p className="text-xs text-gray-500 truncate">{quote.projectName}</p>
          <p className="text-[10px] text-gray-400 mt-1">{formatDate(quote.createdAt)}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-gray-900">
            {formatPrice(quote.totalPrice)}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {typeof quote.totalWeeks === 'number'
              ? `${quote.totalWeeks.toFixed(1)} wks`
              : 'On Demand'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 pt-3 border-t border-gray-100">
        <Button
          variant="secondary"
          size="sm"
          loading={redownloading}
          onClick={handleRedownload}
        >
          Download PDF
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDuplicate(quote)}
        >
          Duplicate
        </Button>
        <Link
          href={`/quotes/${quote.id}`}
          className="ml-auto text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          View →
        </Link>
      </div>
    </div>
  )
}

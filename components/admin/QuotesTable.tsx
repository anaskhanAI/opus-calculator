'use client'

import React, { useState } from 'react'
import Badge from '@/components/ui/Badge'
import QuoteDetail from '@/components/quotes/QuoteDetail'
import type { Quote } from '@/lib/types'
import { formatPrice } from '@/lib/pricing-engine'

interface QuotesTableProps {
  quotes: Quote[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function QuotesTable({ quotes }: QuotesTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggleRow(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (quotes.length === 0) {
    return (
      <div className="border border-gray-200 bg-white px-6 py-12 text-center">
        <p className="text-sm text-gray-400">No quotes match the current filters.</p>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/80 text-left">
            <th className="py-2.5 pl-4 pr-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Ref
            </th>
            <th className="py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Seller
            </th>
            <th className="py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Client / Project
            </th>
            <th className="py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Mode
            </th>
            <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Total
            </th>
            <th className="py-2.5 pl-3 pr-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {quotes.map((quote) => (
            <React.Fragment key={quote.id}>
              <tr
                className="cursor-pointer hover:bg-gray-50/70 transition-colors"
                onClick={() => toggleRow(quote.id)}
              >
                <td className="py-2.5 pl-4 pr-3 font-mono text-xs font-semibold text-indigo-600">
                  {quote.quoteRef}
                </td>
                <td className="py-2.5 px-3">
                  <div className="text-xs font-medium text-gray-800">{quote.sellerName}</div>
                  <div className="text-[10px] text-gray-400">{quote.sellerEmail}</div>
                </td>
                <td className="py-2.5 px-3">
                  <div className="text-xs font-medium text-gray-800">{quote.clientName}</div>
                  <div className="text-[10px] text-gray-400">{quote.projectName}</div>
                </td>
                <td className="py-2.5 px-3">
                  <Badge color={quote.calculatorMode === 'detailed' ? 'indigo' : 'blue'}>
                    {quote.calculatorMode}
                  </Badge>
                </td>
                <td className="py-2.5 px-3 text-right font-semibold text-xs tabular-nums text-gray-900">
                  {formatPrice(quote.totalPrice)}
                </td>
                <td className="py-2.5 pl-3 pr-4 text-[10px] text-gray-400">
                  <div className="flex items-center gap-1.5">
                    {formatDate(quote.createdAt)}
                    <span className="text-gray-300">{expanded.has(quote.id) ? '▲' : '▼'}</span>
                  </div>
                </td>
              </tr>
              {expanded.has(quote.id) && (
                <tr className="bg-gray-50/40">
                  <td colSpan={6} className="px-4 py-4">
                    <QuoteDetail quote={quote} isAdmin />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

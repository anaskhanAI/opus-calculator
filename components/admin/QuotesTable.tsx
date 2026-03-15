'use client'

import React, { useState } from 'react'
import Badge from '@/components/ui/Badge'
import type { Quote, DetailedInputs, SimpleInputs } from '@/lib/types'
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

function InputBreakdown({ inputs, mode }: { inputs: DetailedInputs | SimpleInputs; mode: string }) {
  if (mode === 'detailed') {
    const d = inputs as DetailedInputs
    const grid = d.integrations
    const totalIntegrations =
      grid.restLibrary + grid.restModification + grid.restNew +
      grid.soapLibrary + grid.soapModification + grid.soapNew +
      grid.dbLibrary   + grid.dbModification   + grid.dbNew

    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4 text-xs text-gray-600 bg-gray-50 rounded-lg p-3 mt-1">
        <div><span className="text-gray-400 block">Tier 1</span><span className="font-medium text-gray-800">{d.tier1UseCases} use cases</span></div>
        <div><span className="text-gray-400 block">Tier 2</span><span className="font-medium text-gray-800">{d.tier2UseCases} use cases</span></div>
        <div><span className="text-gray-400 block">Integrations</span><span className="font-medium text-gray-800">{totalIntegrations} total</span></div>
        <div><span className="text-gray-400 block">Complexity</span><span className="font-medium text-gray-800">{Math.round(d.complexityFactor * 100)}%</span></div>
        <div className="col-span-2 sm:col-span-2"><span className="text-gray-400 block">Deployment</span><span className="font-medium text-gray-800">{d.deployment}</span></div>
        <div><span className="text-gray-400 block">Training</span><span className="font-medium text-gray-800">{d.training ? 'Yes' : 'No'}</span></div>
        <div className="col-span-2 sm:col-span-4 border-t border-gray-200 pt-2 mt-1">
          <span className="text-gray-400 block mb-1">Integration grid (Type × Status × Auth)</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
            <div className="text-gray-700">REST/JSON — L:{grid.restLibrary} M:{grid.restModification} N:{grid.restNew} · <span className="text-gray-400">{grid.restAuth}</span></div>
            <div className="text-gray-700">SOAP/XML — L:{grid.soapLibrary} M:{grid.soapModification} N:{grid.soapNew} · <span className="text-gray-400">{grid.soapAuth}</span></div>
            <div className="text-gray-700">DB/Prop — L:{grid.dbLibrary} M:{grid.dbModification} N:{grid.dbNew} · <span className="text-gray-400">{grid.dbAuth}</span></div>
          </div>
        </div>
      </div>
    )
  }

  const s = inputs as SimpleInputs
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4 text-xs text-gray-600 bg-gray-50 rounded-lg p-3 mt-1">
      <div><span className="text-gray-400 block">Tier 1</span><span className="font-medium text-gray-800">{s.tier1UseCases} use cases</span></div>
      <div><span className="text-gray-400 block">Tier 2</span><span className="font-medium text-gray-800">{s.tier2UseCases} use cases</span></div>
      <div><span className="text-gray-400 block">Standard APIs</span><span className="font-medium text-gray-800">{s.standardApiIntegrations}</span></div>
      <div><span className="text-gray-400 block">Custom Integrations</span><span className="font-medium text-gray-800">{s.customIntegrations}</span></div>
      <div className="col-span-2"><span className="text-gray-400 block">Deployment</span><span className="font-medium text-gray-800">{s.deployment}</span></div>
      <div><span className="text-gray-400 block">Training</span><span className="font-medium text-gray-800">{s.training ? 'Yes' : 'No'}</span></div>
      <div><span className="text-gray-400 block">Complexity</span><span className="font-medium text-gray-800">{Math.round(s.complexityFactor * 100)}%</span></div>
    </div>
  )
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
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
        <p className="text-sm text-gray-400">No quotes match the current filters.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
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
                  <td colSpan={6} className="px-4 pb-3">
                    <InputBreakdown inputs={quote.inputs} mode={quote.calculatorMode} />
                    {quote.notes && (
                      <p className="mt-2 text-xs text-gray-400 italic pl-1">
                        Notes: {quote.notes}
                      </p>
                    )}
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

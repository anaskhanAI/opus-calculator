'use client'

import Badge from '@/components/ui/Badge'
import SummaryPanel from '@/components/calculator/SummaryPanel'
import type { Quote, DetailedInputs, SimpleInputs } from '@/lib/types'
import { formatPrice } from '@/lib/pricing-engine'

interface QuoteDetailProps {
  quote: Quote
  isAdmin?: boolean
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-xs font-semibold text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}

function DetailedInputsView({ inputs }: { inputs: DetailedInputs }) {
  const g = inputs.integrations
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <InfoRow label="Simple Automation" value={`${inputs.tier1UseCases}`} />
        <InfoRow label="Agentic AI Automation" value={`${inputs.tier2UseCases}`} />
        <InfoRow label="Training" value={inputs.training ? 'Included' : 'Not included'} />
        <InfoRow label="Complexity Factor" value={`${Math.round(inputs.complexityFactor * 100)}%`} />
        <div className="col-span-2 sm:col-span-2">
          <InfoRow label="Deployment" value={inputs.deployment} />
        </div>
        {inputs.requestedDiscount != null && inputs.requestedDiscount > 0 && (
          <div className="col-span-2 sm:col-span-3">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Requested Discount</p>
            <p className="text-xs font-semibold text-red-600 mt-0.5">
              -${inputs.requestedDiscount.toLocaleString('en-US')}
            </p>
          </div>
        )}
      </div>
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Integration Grid
        </p>
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border-b border-gray-100 px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="border-b border-l border-gray-100 px-3 py-2 text-center text-[10px] font-semibold text-gray-600">REST / JSON</th>
                <th className="border-b border-l border-gray-100 px-3 py-2 text-center text-[10px] font-semibold text-gray-600">SOAP / XML</th>
                <th className="border-b border-l border-gray-100 px-3 py-2 text-center text-[10px] font-semibold text-gray-600">DB / Proprietary</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-b border-gray-100 px-3 py-2 text-[10px] font-medium text-gray-500">Library</td>
                <td className="border-b border-l border-gray-100 px-3 py-2 text-center font-semibold text-gray-800">{g.restLibrary}</td>
                <td className="border-b border-l border-gray-100 px-3 py-2 text-center font-semibold text-gray-800">{g.soapLibrary}</td>
                <td className="border-b border-l border-gray-100 px-3 py-2 text-center font-semibold text-gray-800">{g.dbLibrary}</td>
              </tr>
              <tr>
                <td className="border-b border-gray-100 px-3 py-2 text-[10px] font-medium text-gray-500">Modification</td>
                <td className="border-b border-l border-gray-100 px-3 py-2 text-center font-semibold text-gray-800">{g.restModification}</td>
                <td className="border-b border-l border-gray-100 px-3 py-2 text-center font-semibold text-gray-800">{g.soapModification}</td>
                <td className="border-b border-l border-gray-100 px-3 py-2 text-center font-semibold text-gray-800">{g.dbModification}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-[10px] font-medium text-gray-500">New</td>
                <td className="border-l border-gray-100 px-3 py-2 text-center font-semibold text-gray-800">{g.restNew}</td>
                <td className="border-l border-gray-100 px-3 py-2 text-center font-semibold text-gray-800">{g.soapNew}</td>
                <td className="border-l border-gray-100 px-3 py-2 text-center font-semibold text-gray-800">{g.dbNew}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SimpleInputsView({ inputs }: { inputs: SimpleInputs }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <InfoRow label="Simple Automation"          value={`${inputs.tier1UseCases}`} />
      <InfoRow label="Agentic AI Automation"      value={`${inputs.tier2UseCases}`} />
      <InfoRow label="Standard API Integrations"  value={`${inputs.standardApiIntegrations}`} />
      <InfoRow label="Custom Integrations"        value={`${inputs.customIntegrations}`} />
      <InfoRow label="Training"                   value={inputs.training ? 'Included' : 'Not included'} />
      <InfoRow label="Complexity Factor"          value={`${Math.round(inputs.complexityFactor * 100)}%`} />
      <div className="col-span-2 sm:col-span-3">
        <InfoRow label="Deployment" value={inputs.deployment} />
      </div>
    </div>
  )
}

export default function QuoteDetail({ quote, isAdmin = false }: QuoteDetailProps) {
  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-indigo-600">
                {quote.quoteRef}
              </span>
              <Badge color={quote.calculatorMode === 'detailed' ? 'indigo' : 'blue'}>
                {quote.calculatorMode}
              </Badge>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{formatDate(quote.createdAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-900">
              {formatPrice(quote.totalPrice)}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {typeof quote.totalWeeks === 'number'
                ? `${quote.totalWeeks.toFixed(1)} weeks · ${quote.totalHours?.toFixed(0) ?? 0} hrs`
                : 'On Demand'}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-gray-100 pt-3">
          <InfoRow label="Client"  value={quote.clientName} />
          <InfoRow label="Project" value={quote.projectName} />
          <InfoRow label="Seller"  value={quote.sellerName} />
          <InfoRow label="Email"   value={quote.sellerEmail} />
        </div>

        {quote.notes && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Notes</p>
            <p className="text-xs text-gray-700 mt-0.5">{quote.notes}</p>
          </div>
        )}
      </div>

      {/* Inputs card */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Calculator Inputs
        </h2>
        {quote.calculatorMode === 'detailed' ? (
          <DetailedInputsView inputs={quote.inputs as DetailedInputs} />
        ) : (
          <SimpleInputsView inputs={quote.inputs as SimpleInputs} />
        )}
      </div>

      {/* Pricing breakdown */}
      <div>
        <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
          Pricing Breakdown
        </h2>
        <SummaryPanel
          outputs={quote.outputs}
          discount={(quote.inputs as DetailedInputs).requestedDiscount ?? 0}
          showDetail={isAdmin}
        />
      </div>
    </div>
  )
}

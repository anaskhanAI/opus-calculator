'use client'

import type { GmOutputs, GmInputs, GmSignal } from '@/lib/types'
import { fmtCurrency, fmtPct } from '@/lib/gm-engine'

interface Props {
  outputs: GmOutputs
  inputs: GmInputs
}

const SIGNAL_CONFIG: Record<
  GmSignal,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  SAFE: {
    label: 'Safe to proceed',
    bg: 'bg-green-50',
    text: 'text-green-800',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
  REVIEW: {
    label: 'Manager review needed',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  APPROVAL: {
    label: 'Director approval required',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
  },
  ESCALATE: {
    label: 'Escalation required',
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
      <p className={`text-lg font-bold leading-tight ${highlight ? 'text-indigo-700' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function GmResultsPanel({ outputs, inputs }: Props) {
  const hasData = outputs.totalDays > 0 || outputs.dealPrice > 0

  if (!hasData) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg flex items-center justify-center min-h-[240px]">
        <p className="text-sm text-gray-400">Link a quote or enter values to see the GM analysis.</p>
      </div>
    )
  }

  const sig = SIGNAL_CONFIG[outputs.signal]
  const priceDeltaPct =
    outputs.listPrice > 0 ? (outputs.priceDelta / outputs.listPrice) * 100 : 0

  return (
    <div className="space-y-3">

      {/* Signal banner */}
      <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${sig.bg} ${sig.border}`}>
        <span className={`mt-0.5 inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full ${sig.dot}`} />
        <div className="flex-1">
          <p className={`text-sm font-semibold ${sig.text}`}>{sig.label}</p>
          {outputs.adjustmentHint && (
            <p className={`text-xs mt-0.5 ${sig.text} opacity-80`}>{outputs.adjustmentHint}</p>
          )}
        </div>
        <span className={`text-xs font-bold uppercase tracking-widest ${sig.text}`}>
          {outputs.signal}
        </span>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard
          label="List Price"
          value={fmtCurrency(outputs.listPrice)}
          highlight
        />
        <StatCard
          label="Discounted Price"
          value={fmtCurrency(outputs.discountedPrice)}
          sub={inputs.requestedDiscount > 0 ? `${fmtCurrency(inputs.requestedDiscount)} off` : undefined}
        />
        <StatCard
          label="Total Cost"
          value={fmtCurrency(outputs.totalCost)}
          sub={`${outputs.totalDays} days effort`}
        />
        <StatCard
          label="Gross Profit"
          value={fmtCurrency(outputs.grossProfit)}
          sub={outputs.grossProfit >= 0 ? 'After costs' : 'Loss-making'}
        />
        <StatCard
          label="Actual GM"
          value={fmtPct(outputs.actualGm)}
          sub={`Target: ${inputs.targetGm}%`}
        />
      </div>

      {/* Price vs list delta */}
      {outputs.listPrice > 0 && outputs.priceDelta !== 0 && (
        <div className={`rounded-lg border px-4 py-2.5 flex items-center gap-3 ${
          outputs.priceDelta > 0
            ? 'bg-green-50 border-green-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <span className={`text-sm font-bold ${outputs.priceDelta > 0 ? 'text-green-700' : 'text-amber-700'}`}>
            {outputs.priceDelta > 0 ? '▲' : '▼'}
          </span>
          <p className={`text-xs font-medium ${outputs.priceDelta > 0 ? 'text-green-800' : 'text-amber-800'}`}>
            Deal price is{' '}
            <strong>{fmtCurrency(Math.abs(outputs.priceDelta))}</strong>{' '}
            ({Math.abs(priceDeltaPct).toFixed(1)}%){' '}
            {outputs.priceDelta > 0 ? 'above' : 'below'} the calculator list price.
          </p>
        </div>
      )}

      {/* Scenarios */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pricing Scenarios</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wide text-gray-400">
                <th className="text-left font-medium px-4 py-2">Scenario</th>
                <th className="text-right font-medium px-3 py-2">Revenue</th>
                <th className="text-right font-medium px-3 py-2">GM %</th>
                <th className="text-right font-medium px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {outputs.scenarios.map((s) => {
                const sc = SIGNAL_CONFIG[s.signal]
                return (
                  <tr key={s.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-700">{s.name}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-gray-800">{fmtCurrency(s.revenue)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{fmtPct(s.gm)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${sc.bg} ${sc.text} border ${sc.border}`}>
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                        {s.signal}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Min price reference */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-0.5">
            Min Price @ {inputs.targetGm}% GM
          </p>
          <p className="text-base font-bold text-gray-900">{fmtCurrency(outputs.minPriceAtTarget)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-0.5">
            List Revenue (per-role)
          </p>
          <p className="text-base font-bold text-gray-900">{fmtCurrency(outputs.totalListRevenue)}</p>
          <p className="text-[10px] text-gray-400">Sum of per-role revenues</p>
        </div>
      </div>

      {/* Role economics table */}
      {outputs.roles.length > 0 && outputs.roles.some((r) => r.days > 0) && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role Economics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wide text-gray-400">
                  <th className="text-left font-medium px-4 py-2">Role</th>
                  <th className="text-right font-medium px-3 py-2">Days</th>
                  <th className="text-right font-medium px-3 py-2">Revenue</th>
                  <th className="text-right font-medium px-3 py-2">Cost</th>
                  <th className="text-right font-medium px-4 py-2">GM %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {outputs.roles
                  .filter((r) => r.days > 0 || (r.quoteRevenue ?? 0) > 0)
                  .map((r) => (
                    <tr key={r.role} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-700">{r.role}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600">{r.days}</td>
                      <td className="px-3 py-2.5 text-right text-gray-800 font-medium">
                        {fmtCurrency(r.standardRevenue)}
                        {r.quoteRevenue !== undefined && (
                          <span className="ml-1 text-[9px] text-indigo-400">quote</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-600">{fmtCurrency(r.cost)}</td>
                      <td className="px-4 py-2.5 text-right font-medium">
                        <span className={
                          r.gmPct >= inputs.targetGm / 100
                            ? 'text-green-700'
                            : r.gmPct >= (inputs.targetGm - inputs.reviewBand) / 100
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }>
                          {fmtPct(r.gmPct)}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <td className="px-4 py-2.5 text-gray-700 text-[10px] uppercase">Total</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{outputs.totalDays}</td>
                  <td className="px-3 py-2.5 text-right text-gray-800">{fmtCurrency(outputs.totalListRevenue)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{fmtCurrency(outputs.totalCost)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={outputs.actualGm >= inputs.targetGm / 100 ? 'text-green-700' : 'text-red-600'}>
                      {fmtPct(outputs.actualGm)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

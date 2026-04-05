'use client'

import type { GmInputs, GmOutputs, GmSignal } from '@/lib/types'
import { fmtCurrency, fmtPct } from '@/lib/gm-engine'

interface Props {
  outputs: GmOutputs
  inputs: GmInputs
}

const SIGNAL_CONFIG: Record<
  GmSignal,
  { label: string; bg: string; text: string; border: string; badge: string }
> = {
  SAFE: {
    label: 'Within Target',
    bg: 'bg-green-50',
    text: 'text-green-800',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-800',
  },
  REVIEW: {
    label: 'Under Review',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800',
  },
  APPROVAL: {
    label: 'Approval Required',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-800',
  },
  ESCALATE: {
    label: 'Escalation Required',
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-800',
  },
}

function MetricCard({
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
    <div
      className={`rounded-lg border px-4 py-3 ${
        highlight ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-gray-200'
      }`}
    >
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-bold leading-none ${highlight ? 'text-indigo-700' : 'text-gray-900'}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function GmResultsPanel({ outputs, inputs }: Props) {
  const sig = SIGNAL_CONFIG[outputs.signal]
  const hasData = outputs.totalDays > 0

  return (
    <div className="space-y-3">

      {/* Signal banner */}
      <div className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-4 ${sig.bg} ${sig.border}`}>
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider ${sig.text}`}>
            {sig.label}
          </p>
          {outputs.adjustmentHint && (
            <p className={`text-xs mt-1 ${sig.text} opacity-80`}>{outputs.adjustmentHint}</p>
          )}
        </div>
        <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full ${sig.badge}`}>
          {outputs.signal}
        </span>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <MetricCard
          label="Actual GM"
          value={fmtPct(outputs.actualGm)}
          sub={`Target: ${inputs.targetGm}%`}
          highlight
        />
        <MetricCard
          label="Gross Profit"
          value={fmtCurrency(outputs.grossProfit)}
        />
        <MetricCard
          label="Net Revenue"
          value={fmtCurrency(outputs.totalDiscountedRevenue)}
          sub={`List: ${fmtCurrency(outputs.totalStandardRevenue)}`}
        />
        <MetricCard
          label="Total Cost"
          value={fmtCurrency(outputs.totalCost)}
          sub={`${outputs.totalDays} days`}
        />
        <MetricCard
          label="Active Discount"
          value={fmtCurrency(outputs.activeDiscount)}
          sub={
            outputs.totalStandardRevenue > 0
              ? `${((outputs.activeDiscount / outputs.totalStandardRevenue) * 100).toFixed(1)}% of list`
              : undefined
          }
        />
        <MetricCard
          label="Max Discount @ Target"
          value={fmtCurrency(outputs.maxDiscountAllowed)}
          sub={`Headroom: ${fmtCurrency(outputs.remainingHeadroom)}`}
        />
      </div>

      {/* Scenarios table */}
      {hasData && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scenarios</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                {['Scenario', 'Revenue', 'Discount', 'GM', 'Status'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {outputs.scenarios.map((s) => {
                const sc = SIGNAL_CONFIG[s.signal]
                return (
                  <tr key={s.name} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2 font-medium text-gray-700">{s.name}</td>
                    <td className="px-3 py-2 text-gray-600">{fmtCurrency(s.revenue)}</td>
                    <td className="px-3 py-2 text-gray-600">{fmtCurrency(s.discount)}</td>
                    <td className="px-3 py-2 font-semibold text-gray-800">{fmtPct(s.gm)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sc.badge}`}>
                        {sc.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Role economics table */}
      {hasData && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role Economics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Role', 'Days', 'List Rev', 'Effort', 'Discount', 'Net Rev', 'Cost', 'GM', 'List GM'].map(
                    (h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-gray-400 whitespace-nowrap">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {outputs.roles.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2 text-gray-700 font-medium whitespace-nowrap max-w-[160px] truncate">
                      {r.role || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{r.days}</td>
                    <td className="px-3 py-2 text-gray-600">{fmtCurrency(r.standardRevenue)}</td>
                    <td className="px-3 py-2 text-gray-600">{(r.effortPct * 100).toFixed(0)}%</td>
                    <td className="px-3 py-2 text-gray-600">{fmtCurrency(r.discount)}</td>
                    <td className="px-3 py-2 text-gray-600">{fmtCurrency(r.discountedRevenue)}</td>
                    <td className="px-3 py-2 text-gray-600">{fmtCurrency(r.cost)}</td>
                    <td className="px-3 py-2 font-semibold text-gray-800">{fmtPct(r.gmPct)}</td>
                    <td className="px-3 py-2 text-gray-500">{fmtPct(r.inputGmPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasData && (
        <div className="bg-white border border-gray-200 rounded-lg px-6 py-10 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-gray-400">Enter days for one or more roles to see results.</p>
          <p className="text-xs text-gray-300 mt-1">Outputs update in real time as you type.</p>
        </div>
      )}
    </div>
  )
}

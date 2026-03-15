'use client'

import type { CalculatorOutputs } from '@/lib/types'
import { formatPrice, formatWeeks, formatHours, formatFte } from '@/lib/pricing-engine'

interface SummaryPanelProps {
  outputs: CalculatorOutputs
}

const ROWS: { key: keyof Omit<CalculatorOutputs, 'projectTotal'>; label: string }[] = [
  { key: 'coreImplementation', label: 'Core Implementation' },
  { key: 'integrations',       label: 'Integrations' },
  { key: 'deployment',         label: 'Deployment' },
  { key: 'training',           label: 'Training' },
  { key: 'complexityFactor',   label: 'Complexity Factor' },
]

export default function SummaryPanel({ outputs }: SummaryPanelProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">Live Summary</h2>
        <span className="text-[10px] text-gray-400">Updates in real time</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="py-2 pl-4 pr-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-[42%]">
                Line Item
              </th>
              <th className="py-2 px-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Price
              </th>
              <th className="py-2 px-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Wks
              </th>
              <th className="py-2 px-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Hrs
              </th>
              <th className="py-2 pl-2 pr-4 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                FTE
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ROWS.map(({ key, label }) => {
              const item = outputs[key]
              const isZero =
                item.listPrice === 0 && item.weeks === 0 && item.hours === 0

              return (
                <tr key={key} className={isZero ? 'text-gray-300' : 'text-gray-700'}>
                  <td className="py-2 pl-4 pr-2 font-medium">{label}</td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {formatPrice(item.listPrice)}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {formatWeeks(item.weeks)}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {formatHours(item.hours)}
                  </td>
                  <td className="py-2 pl-2 pr-4 text-right tabular-nums">
                    {formatFte(item.fte)}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-indigo-50/40">
              <td className="py-3 pl-4 pr-2 font-bold text-gray-900 text-xs">
                Project Total
              </td>
              <td className="py-3 px-2 text-right font-bold text-indigo-700 tabular-nums text-xs">
                {formatPrice(outputs.projectTotal.listPrice)}
              </td>
              <td className="py-3 px-2 text-right font-semibold text-gray-700 tabular-nums text-xs">
                {formatWeeks(outputs.projectTotal.weeks)}
              </td>
              <td className="py-3 px-2 text-right font-semibold text-gray-700 tabular-nums text-xs">
                {formatHours(outputs.projectTotal.hours)}
              </td>
              <td className="py-3 pl-2 pr-4 text-right text-gray-300 text-xs">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

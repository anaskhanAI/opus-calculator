'use client'

import type { CalculatorOutputs } from '@/lib/types'
import { formatPrice, formatWeeks, formatHours, formatFte } from '@/lib/pricing-engine'

interface SummaryPanelProps {
  outputs: CalculatorOutputs
  discount?: number
  showDetail?: boolean   // admin only: adds Hours + FTE columns
}

const ROWS: { key: keyof Omit<CalculatorOutputs, 'projectTotal'>; label: string }[] = [
  { key: 'coreImplementation', label: 'Core Implementation' },
  { key: 'integrations',       label: 'Integrations' },
  { key: 'deployment',         label: 'Deployment' },
  { key: 'training',           label: 'Training' },
  { key: 'complexityFactor',   label: 'Complexity Factor' },
]

export default function SummaryPanel({ outputs, discount = 0, showDetail = false }: SummaryPanelProps) {
  const engineTotal = outputs.projectTotal.listPrice
  const netTotal =
    typeof engineTotal === 'number' && discount > 0
      ? Math.max(0, engineTotal - discount)
      : engineTotal

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">Summary</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="py-2 pl-4 pr-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-[40%]">
              </th>
              <th className="py-2 px-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Price
              </th>
              <th className="py-2 px-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Effort (wks)
              </th>
              {showDetail && (
                <>
                  <th className="py-2 px-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="py-2 pl-2 pr-4 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    FTE
                  </th>
                </>
              )}
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
                  {showDetail && (
                    <>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {formatHours(item.hours)}
                      </td>
                      <td className="py-2 pl-2 pr-4 text-right tabular-nums">
                        {formatFte(item.fte)}
                      </td>
                    </>
                  )}
                </tr>
              )
            })}

            {discount > 0 && (
              <tr className="text-red-600 border-t border-dashed border-gray-200">
                <td className="py-2 pl-4 pr-2 font-medium">Requested Discount</td>
                <td className="py-2 px-2 text-right tabular-nums font-semibold">
                  -{formatPrice(discount)}
                </td>
                <td className="py-2 px-2 text-right text-gray-300">—</td>
                {showDetail && (
                  <>
                    <td className="py-2 px-2 text-right text-gray-300">—</td>
                    <td className="py-2 pl-2 pr-4 text-right text-gray-300">—</td>
                  </>
                )}
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-indigo-50/40">
              <td className="py-3 pl-4 pr-2 font-bold text-gray-900 text-xs">
                Project Total
              </td>
              <td className="py-3 px-2 text-right font-bold text-indigo-700 tabular-nums text-xs">
                {formatPrice(netTotal)}
              </td>
              <td className="py-3 px-2 text-right font-semibold text-gray-700 tabular-nums text-xs">
                {formatWeeks(outputs.projectTotal.weeks)}
              </td>
              {showDetail && (
                <>
                  <td className="py-3 px-2 text-right font-semibold text-gray-700 tabular-nums text-xs">
                    {formatHours(outputs.projectTotal.hours)}
                  </td>
                  <td className="py-3 pl-2 pr-4 text-right text-gray-300 text-xs">—</td>
                </>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

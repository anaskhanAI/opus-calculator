'use client'

import { useState } from 'react'
import type { GmSavedScenario, GmSignal } from '@/lib/types'
import { fmtCurrency, fmtPct } from '@/lib/gm-engine'

const SIGNAL_BADGE: Record<GmSignal, string> = {
  SAFE: 'bg-green-100 text-green-800',
  REVIEW: 'bg-amber-100 text-amber-800',
  APPROVAL: 'bg-orange-100 text-orange-800',
  ESCALATE: 'bg-red-100 text-red-800',
}

const SIGNAL_LABEL: Record<GmSignal, string> = {
  SAFE: 'Within Target',
  REVIEW: 'Under Review',
  APPROVAL: 'Approval Required',
  ESCALATE: 'Escalation Required',
}

interface Props {
  scenarios: GmSavedScenario[]
  onLoad: (s: GmSavedScenario) => void
  onDelete: (id: string) => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function GmSavedScenarios({ scenarios, onLoad, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function handleDelete(id: string) {
    if (confirmDelete === id) {
      onDelete(id)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Saved Scenarios ({scenarios.length})
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead>
            <tr className="border-b border-gray-100">
              {['Date', 'Quote', 'Client', 'Discount', 'Net Revenue', 'GM', 'Status', 'Notes', ''].map(
                (h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-gray-400 whitespace-nowrap">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => {
              const sig = s.outputs.signal
              return (
                <tr
                  key={s.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{formatDate(s.createdAt)}</td>
                  <td className="px-3 py-2 text-gray-700 font-medium whitespace-nowrap">
                    {s.quoteRef ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">
                    {s.clientName ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {fmtCurrency(s.outputs.activeDiscount)}
                  </td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {fmtCurrency(s.outputs.totalDiscountedRevenue)}
                  </td>
                  <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">
                    {fmtPct(s.outputs.actualGm)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${SIGNAL_BADGE[sig]}`}>
                      {SIGNAL_LABEL[sig]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-400 max-w-[120px] truncate">
                    {s.notes ?? '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onLoad(s)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        className={`text-[10px] font-medium transition-colors ${
                          confirmDelete === s.id
                            ? 'text-red-600 hover:text-red-800'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {confirmDelete === s.id ? 'Confirm?' : 'Delete'}
                      </button>
                      {confirmDelete === s.id && (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

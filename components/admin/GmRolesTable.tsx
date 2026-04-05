'use client'

import type { GmRole } from '@/lib/types'

interface Props {
  roles: GmRole[]
  onChange: (roles: GmRole[]) => void
}

const cellInput =
  'w-full rounded border border-gray-200 px-1.5 py-1 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

export default function GmRolesTable({ roles, onChange }: Props) {
  function update(i: number, key: keyof GmRole, value: string | number) {
    const next = roles.map((r, idx) =>
      idx === i ? { ...r, [key]: typeof value === 'string' ? value : Number(value) } : r
    )
    onChange(next)
  }

  function addRole() {
    onChange([...roles, { role: '', days: 0, dailyCost: 0, standardRate: 0 }])
  }

  function removeRole(i: number) {
    onChange(roles.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-[1fr_52px_72px_72px_20px] gap-1.5 px-0.5">
        {['Role', 'Days', 'Daily Cost', 'Day Rate', ''].map((h, i) => (
          <span key={i} className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {roles.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_52px_72px_72px_20px] gap-1.5 items-center">
          <input
            type="text"
            value={r.role}
            onChange={(e) => update(i, 'role', e.target.value)}
            placeholder="Role name"
            className={cellInput}
          />
          <input
            type="number"
            value={r.days === 0 ? '' : r.days}
            onChange={(e) => update(i, 'days', e.target.value === '' ? 0 : Number(e.target.value))}
            placeholder="0"
            min={0}
            className={cellInput}
          />
          <input
            type="number"
            value={r.dailyCost === 0 ? '' : r.dailyCost}
            onChange={(e) => update(i, 'dailyCost', e.target.value === '' ? 0 : Number(e.target.value))}
            placeholder="0"
            min={0}
            className={cellInput}
          />
          <input
            type="number"
            value={r.standardRate === 0 ? '' : r.standardRate}
            onChange={(e) => update(i, 'standardRate', e.target.value === '' ? 0 : Number(e.target.value))}
            placeholder="0"
            min={0}
            className={cellInput}
          />
          <button
            type="button"
            onClick={() => removeRole(i)}
            className="text-gray-300 hover:text-red-400 transition-colors text-sm leading-none"
            aria-label="Remove role"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRole}
        className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors flex items-center gap-1"
      >
        <span className="text-base leading-none">+</span> Add Role
      </button>
    </div>
  )
}

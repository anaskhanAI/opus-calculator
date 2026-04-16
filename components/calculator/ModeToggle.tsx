'use client'

import type { CalculatorMode } from '@/lib/types'

interface ModeToggleProps {
  mode: CalculatorMode
  onChange: (mode: CalculatorMode) => void
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1">
      <button
        type="button"
        onClick={() => onChange('detailed')}
        className={[
          'flex-1 px-4 py-2 text-sm font-medium transition-colors duration-150',
          mode === 'detailed'
            ? 'bg-white text-indigo-700 shadow-sm'
            : 'text-gray-600 hover:text-gray-900',
        ].join(' ')}
      >
        Detailed
      </button>
      <button
        type="button"
        onClick={() => onChange('simple')}
        className={[
          'flex-1 px-4 py-2 text-sm font-medium transition-colors duration-150',
          mode === 'simple'
            ? 'bg-white text-indigo-700 shadow-sm'
            : 'text-gray-600 hover:text-gray-900',
        ].join(' ')}
      >
        Simple
      </button>
    </div>
  )
}

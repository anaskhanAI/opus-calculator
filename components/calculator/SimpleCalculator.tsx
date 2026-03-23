'use client'

import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Toggle from '@/components/ui/Toggle'
import type { SimpleInputs } from '@/lib/types'
import { DEPLOYMENT_OPTIONS } from '@/lib/pricing-engine'

interface SimpleCalculatorProps {
  inputs: SimpleInputs
  onChange: (inputs: SimpleInputs) => void
}

const DEPLOYMENT_SELECT_OPTIONS = DEPLOYMENT_OPTIONS.map((d) => ({ value: d, label: d }))

function sectionHeader(label: string, subtitle?: string) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-gray-800">{label}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}

export default function SimpleCalculator({ inputs, onChange }: SimpleCalculatorProps) {
  function update(partial: Partial<SimpleInputs>) {
    onChange({ ...inputs, ...partial })
  }

  return (
    <div className="space-y-7">
      {/* USE CASE COMPLEXITY */}
      <section>
        {sectionHeader(
          'Use Case Complexity',
          `No. of Workflows = ${inputs.tier1UseCases + inputs.tier2UseCases}`
        )}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tier 1: Linear Automation"
            type="number"
            min={0}
            value={inputs.tier1UseCases}
            onChange={(e) => update({ tier1UseCases: Math.max(0, Number(e.target.value)) })}
          />
          <Input
            label="Tier 2: Agentic AI Automation"
            type="number"
            min={0}
            value={inputs.tier2UseCases}
            onChange={(e) => update({ tier2UseCases: Math.max(0, Number(e.target.value)) })}
          />
        </div>
      </section>

      {/* INTEGRATION STRATEGY */}
      <section>
        {sectionHeader(
          'Integration Strategy',
          `No. of Integrations = ${inputs.standardApiIntegrations + inputs.customIntegrations}`
        )}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Standard: Modern API"
            type="number"
            min={0}
            value={inputs.standardApiIntegrations}
            onChange={(e) =>
              update({ standardApiIntegrations: Math.max(0, Number(e.target.value)) })
            }
            hint="REST / JSON integrations"
          />
          <Input
            label="Custom: High-Code Build"
            type="number"
            min={0}
            value={inputs.customIntegrations}
            onChange={(e) =>
              update({ customIntegrations: Math.max(0, Number(e.target.value)) })
            }
            hint="Custom / proprietary integrations"
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Use Detailed mode when the client can provide integration status and type breakdown.
        </p>
      </section>

      {/* DEPLOYMENT TYPE */}
      <section>
        {sectionHeader('Deployment Type')}
        <Select
          label="Deployment Type"
          value={inputs.deployment}
          options={DEPLOYMENT_SELECT_OPTIONS}
          onChange={(e) =>
            update({ deployment: e.target.value as SimpleInputs['deployment'] })
          }
        />
      </section>

      {/* TRAINING */}
      <section>
        {sectionHeader('Training')}
        <Toggle
          label="Train the Trainer"
          checked={inputs.training}
          onChange={(v) => update({ training: v })}
        />
      </section>

      {/* COMPLEXITY FACTOR */}
      <section>
        {sectionHeader('Complexity Factor')}
        <Input
          label=""
          type="number"
          min={0}
          max={100}
          value={Math.round(inputs.complexityFactor * 100)}
          onChange={(e) =>
            update({ complexityFactor: Math.min(1, Math.max(0, Number(e.target.value) / 100)) })
          }
          className="max-w-[120px]"
          placeholder="0"
        />
      </section>
    </div>
  )
}

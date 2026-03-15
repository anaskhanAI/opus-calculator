'use client'

import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Toggle from '@/components/ui/Toggle'
import type { DetailedInputs, AuthMethod } from '@/lib/types'
import { DEPLOYMENT_OPTIONS } from '@/lib/pricing-engine'

interface DetailedCalculatorProps {
  inputs: DetailedInputs
  onChange: (inputs: DetailedInputs) => void
}

const AUTH_OPTIONS: { value: AuthMethod; label: string }[] = [
  { value: 'API Key / Basic', label: 'API Key / Basic' },
  { value: 'OAuth2',          label: 'OAuth2' },
  { value: 'VPN / mTLS',     label: 'VPN / mTLS' },
]

const DEPLOYMENT_SELECT_OPTIONS = DEPLOYMENT_OPTIONS.map((d) => ({ value: d, label: d }))

function sectionHeader(label: string, subtitle?: string) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-gray-800">{label}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}

export default function DetailedCalculator({ inputs, onChange }: DetailedCalculatorProps) {
  const { integrations: grid } = inputs

  function update(partial: Partial<DetailedInputs>) {
    onChange({ ...inputs, ...partial })
  }

  function updateGrid(partial: Partial<DetailedInputs['integrations']>) {
    onChange({ ...inputs, integrations: { ...grid, ...partial } })
  }

  const totalIntegrations =
    grid.restLibrary + grid.restModification + grid.restNew +
    grid.soapLibrary + grid.soapModification + grid.soapNew +
    grid.dbLibrary   + grid.dbModification   + grid.dbNew

  return (
    <div className="space-y-7">
      {/* DIMENSION A */}
      <section>
        {sectionHeader(
          'Dimension A — Use Case Complexity',
          `No. of Workflows = ${inputs.tier1UseCases + inputs.tier2UseCases}`
        )}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tier 1: Linear Automation"
            type="number"
            min={0}
            value={inputs.tier1UseCases}
            onChange={(e) => update({ tier1UseCases: Math.max(0, Number(e.target.value)) })}
            hint="Deterministic use cases"
          />
          <Input
            label="Tier 2: Agentic AI Automation"
            type="number"
            min={0}
            value={inputs.tier2UseCases}
            onChange={(e) => update({ tier2UseCases: Math.max(0, Number(e.target.value)) })}
            hint="Probabilistic use cases"
          />
        </div>
      </section>

      {/* DIMENSION B */}
      <section>
        {sectionHeader(
          'Dimension B — Integration Strategy',
          `No. of Integrations = ${totalIntegrations}`
        )}
        <p className="text-xs text-gray-500 mb-3">
          Enter the count of integrations for each Type × Status combination. Auth method is captured for context.
        </p>

        {/* 3×3 grid — matches Excel layout exactly */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="py-2 pr-3 text-left text-xs font-medium text-gray-500 w-[140px]">
                  Status \ Type
                </th>
                <th className="py-2 px-2 text-center text-xs font-medium text-gray-600 bg-gray-50 rounded-tl border border-gray-200">
                  REST / JSON
                </th>
                <th className="py-2 px-2 text-center text-xs font-medium text-gray-600 bg-gray-50 border-t border-b border-gray-200">
                  SOAP / XML
                </th>
                <th className="py-2 px-2 text-center text-xs font-medium text-gray-600 bg-gray-50 rounded-tr border border-gray-200">
                  Database / Proprietary
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Row: Existing Opus Library */}
              <tr>
                <td className="py-2 pr-3 text-xs text-gray-600 font-medium">
                  Existing Opus Library
                  <span className="ml-1 text-gray-400">(×0.2)</span>
                </td>
                <td className="py-1 px-2 border border-gray-200">
                  <input
                    type="number" min={0}
                    value={grid.restLibrary}
                    onChange={(e) => updateGrid({ restLibrary: Math.max(0, Number(e.target.value)) })}
                    className="w-full rounded border-0 bg-transparent text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 py-1"
                  />
                </td>
                <td className="py-1 px-2 border-t border-b border-gray-200">
                  <input
                    type="number" min={0}
                    value={grid.soapLibrary}
                    onChange={(e) => updateGrid({ soapLibrary: Math.max(0, Number(e.target.value)) })}
                    className="w-full rounded border-0 bg-transparent text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 py-1"
                  />
                </td>
                <td className="py-1 px-2 border border-gray-200">
                  <input
                    type="number" min={0}
                    value={grid.dbLibrary}
                    onChange={(e) => updateGrid({ dbLibrary: Math.max(0, Number(e.target.value)) })}
                    className="w-full rounded border-0 bg-transparent text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 py-1"
                  />
                </td>
              </tr>
              {/* Row: Modification */}
              <tr>
                <td className="py-2 pr-3 text-xs text-gray-600 font-medium">
                  Modification
                  <span className="ml-1 text-gray-400">(×1.5)</span>
                </td>
                <td className="py-1 px-2 border border-gray-200">
                  <input
                    type="number" min={0}
                    value={grid.restModification}
                    onChange={(e) => updateGrid({ restModification: Math.max(0, Number(e.target.value)) })}
                    className="w-full rounded border-0 bg-transparent text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 py-1"
                  />
                </td>
                <td className="py-1 px-2 border-t border-b border-gray-200">
                  <input
                    type="number" min={0}
                    value={grid.soapModification}
                    onChange={(e) => updateGrid({ soapModification: Math.max(0, Number(e.target.value)) })}
                    className="w-full rounded border-0 bg-transparent text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 py-1"
                  />
                </td>
                <td className="py-1 px-2 border border-gray-200">
                  <input
                    type="number" min={0}
                    value={grid.dbModification}
                    onChange={(e) => updateGrid({ dbModification: Math.max(0, Number(e.target.value)) })}
                    className="w-full rounded border-0 bg-transparent text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 py-1"
                  />
                </td>
              </tr>
              {/* Row: New Integration */}
              <tr>
                <td className="py-2 pr-3 text-xs text-gray-600 font-medium">
                  New Integration
                  <span className="ml-1 text-gray-400">(×3.0)</span>
                </td>
                <td className="py-1 px-2 border border-gray-200">
                  <input
                    type="number" min={0}
                    value={grid.restNew}
                    onChange={(e) => updateGrid({ restNew: Math.max(0, Number(e.target.value)) })}
                    className="w-full rounded border-0 bg-transparent text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 py-1"
                  />
                </td>
                <td className="py-1 px-2 border-t border-b border-gray-200">
                  <input
                    type="number" min={0}
                    value={grid.soapNew}
                    onChange={(e) => updateGrid({ soapNew: Math.max(0, Number(e.target.value)) })}
                    className="w-full rounded border-0 bg-transparent text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 py-1"
                  />
                </td>
                <td className="py-1 px-2 border border-gray-200">
                  <input
                    type="number" min={0}
                    value={grid.dbNew}
                    onChange={(e) => updateGrid({ dbNew: Math.max(0, Number(e.target.value)) })}
                    className="w-full rounded border-0 bg-transparent text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 py-1"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Auth selectors — captured for audit, not used in formula */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Select
            label="REST / JSON Auth"
            value={grid.restAuth}
            options={AUTH_OPTIONS}
            onChange={(e) => updateGrid({ restAuth: e.target.value as AuthMethod })}
          />
          <Select
            label="SOAP / XML Auth"
            value={grid.soapAuth}
            options={AUTH_OPTIONS}
            onChange={(e) => updateGrid({ soapAuth: e.target.value as AuthMethod })}
          />
          <Select
            label="DB / Proprietary Auth"
            value={grid.dbAuth}
            options={AUTH_OPTIONS}
            onChange={(e) => updateGrid({ dbAuth: e.target.value as AuthMethod })}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Auth method is stored for audit context — not included in pricing formula.
        </p>
      </section>

      {/* DIMENSION C */}
      <section>
        {sectionHeader('Dimension C — Deployment')}
        <Select
          label="Deployment Type"
          value={inputs.deployment}
          options={DEPLOYMENT_SELECT_OPTIONS}
          onChange={(e) =>
            update({ deployment: e.target.value as DetailedInputs['deployment'] })
          }
        />
      </section>

      {/* DIMENSION D */}
      <section>
        {sectionHeader('Dimension D — Training')}
        <Toggle
          label="Train the Trainer"
          checked={inputs.training}
          onChange={(v) => update({ training: v })}
        />
        {inputs.training && (
          <p className="text-xs text-gray-500 mt-2">
            1 week, $20,000 fixed price included.
          </p>
        )}
      </section>

      {/* COMPLEXITY FACTOR */}
      <section>
        {sectionHeader(
          'Complexity Factor',
          'Applied as a percentage of Core + Integration price'
        )}
        <div className="flex items-center gap-3">
          <Input
            label="Complexity %"
            type="number"
            min={0}
            max={100}
            value={Math.round(inputs.complexityFactor * 100)}
            onChange={(e) =>
              update({ complexityFactor: Math.min(1, Math.max(0, Number(e.target.value) / 100)) })
            }
            className="max-w-[120px]"
          />
          <span className="text-sm text-gray-500 mt-5">%</span>
        </div>
      </section>
    </div>
  )
}

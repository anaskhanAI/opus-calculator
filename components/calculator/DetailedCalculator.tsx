'use client'

import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Toggle from '@/components/ui/Toggle'
import type { DetailedInputs } from '@/lib/types'
import { DEPLOYMENT_OPTIONS } from '@/lib/pricing-engine'

interface DetailedCalculatorProps {
  inputs: DetailedInputs
  onChange: (inputs: DetailedInputs) => void
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
          `No. of Integrations = ${totalIntegrations}`
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="py-2 pr-3 text-left text-xs font-medium text-gray-500 w-[140px]">
                  Status
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
              <tr>
                <td className="py-2 pr-3 text-xs text-gray-600 font-medium">
                  Existing Opus Library
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
              <tr>
                <td className="py-2 pr-3 text-xs text-gray-600 font-medium">
                  Modification
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
              <tr>
                <td className="py-2 pr-3 text-xs text-gray-600 font-medium">
                  New Integration
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
      </section>

      {/* DEPLOYMENT TYPE */}
      <section>
        {sectionHeader('Deployment Type')}
        <Select
          label="Deployment Type"
          value={inputs.deployment}
          options={DEPLOYMENT_SELECT_OPTIONS}
          onChange={(e) =>
            update({ deployment: e.target.value as DetailedInputs['deployment'] })
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
        <div className="flex items-center gap-2">
          <Input
            label=""
            type="number"
            min={0}
            max={100}
            value={Math.round(inputs.complexityFactor * 100)}
            onChange={(e) =>
              update({ complexityFactor: Math.min(1, Math.max(0, Number(e.target.value) / 100)) })
            }
            className="max-w-[100px]"
            placeholder="0"
          />
          <span className="text-sm text-gray-500 mt-1">%</span>
        </div>
      </section>
    </div>
  )
}

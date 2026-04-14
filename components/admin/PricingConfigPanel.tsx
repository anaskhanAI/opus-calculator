'use client'

import { useState, useCallback } from 'react'
import type { PricingConfig, DeploymentOption, WeekLookupRow, Tier2LookupRow, GmConfig, GmRole } from '@/lib/types'
import { DEFAULT_PRICING_CONFIG } from '@/lib/pricing-engine'
import { DEFAULT_GM_CONFIG } from '@/lib/gm-engine'

interface PricingConfigPanelProps {
  initialConfig: PricingConfig
  initialGmConfig: GmConfig
}

// ─── Primitives ───────────────────────────────────────────────────────────────

const labelCls = 'block text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1'
const inputCls =
  'w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400'
const numInputCls =
  inputCls +
  ' [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

function NumInput({
  value,
  onChange,
  min,
  step,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  step?: number
}) {
  return (
    <input
      type="number"
      className={numInputCls}
      value={value}
      min={min ?? 0}
      step={step ?? 1}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
  defaultOpen = true,
}: {
  title: string
  description?: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{title}</span>
          {description && (
            <span className="hidden sm:inline text-xs text-gray-400">— {description}</span>
          )}
        </div>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className="px-4 pb-5 pt-3 border-t border-gray-100">{children}</div>
      )}
    </div>
  )
}

// ─── Subsection label ─────────────────────────────────────────────────────────

function SubLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-gray-500 mb-3">{children}</p>
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PricingConfigPanel({ initialConfig, initialGmConfig }: PricingConfigPanelProps) {
  const [config, setConfig] = useState<PricingConfig>(initialConfig)
  const [gmConfig, setGmConfig] = useState<GmConfig>(initialGmConfig)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  function update<K extends keyof PricingConfig>(key: K, value: PricingConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
    setSaveStatus(null)
  }

  function updateGm<K extends keyof GmConfig>(key: K, value: GmConfig[K]) {
    setGmConfig((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
    setSaveStatus(null)
  }

  function updateGmRole(idx: number, field: keyof GmRole, value: string | number) {
    const next = gmConfig.defaultRoles.map((r, i) =>
      i === idx ? { ...r, [field]: typeof value === 'string' ? value : Number(value) } : r
    )
    updateGm('defaultRoles', next)
  }

  function updateGmRoleAllocation(idx: number, field: keyof NonNullable<GmRole['allocations']>, pct: number) {
    const next = gmConfig.defaultRoles.map((r, i) => {
      if (i !== idx) return r
      return {
        ...r,
        allocations: {
          coreImpl: 0, integrations: 0, deployment: 0, training: 0, complexity: 0,
          ...(r.allocations ?? {}),
          [field]: pct / 100,
        },
      }
    })
    updateGm('defaultRoles', next)
  }

  function addGmRole() {
    updateGm('defaultRoles', [
      ...gmConfig.defaultRoles,
      {
        role: '', days: 0, dailyCost: 0, standardRate: 0,
        allocations: { coreImpl: 0, integrations: 0, deployment: 0, training: 0, complexity: 0 },
      },
    ])
  }

  function removeGmRole(idx: number) {
    updateGm('defaultRoles', gmConfig.defaultRoles.filter((_, i) => i !== idx))
  }

  function resetToDefaults() {
    if (
      !confirm(
        'Reset all pricing values to factory defaults? Any unsaved changes will be lost.'
      )
    )
      return
    setConfig(DEFAULT_PRICING_CONFIG)
    setGmConfig(DEFAULT_GM_CONFIG)
    setIsDirty(true)
    setSaveStatus(null)
  }

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveStatus(null)
    try {
      const [pricingRes, gmRes] = await Promise.all([
        fetch('/api/pricing-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        }),
        fetch('/api/gm-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gmConfig),
        }),
      ])
      const pricingJson = await pricingRes.json()
      const gmJson = await gmRes.json()

      if (!pricingRes.ok) {
        setSaveStatus({ type: 'error', message: pricingJson.error ?? 'Failed to save pricing config.' })
      } else if (!gmRes.ok) {
        setSaveStatus({ type: 'error', message: gmJson.error ?? 'Failed to save GM config.' })
      } else {
        setSaveStatus({
          type: 'success',
          message: 'Configuration saved. Changes are live.',
        })
        setIsDirty(false)
      }
    } catch (err) {
      setSaveStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Network error. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }, [config, gmConfig])

  // ── Deployment option helpers ─────────────────────────────────────────────

  function updateDeploymentOption(
    idx: number,
    field: keyof DeploymentOption,
    value: string | number | 'On Demand'
  ) {
    const next = config.deploymentOptions.map((opt, i) =>
      i === idx ? { ...opt, [field]: value } : opt
    )
    update('deploymentOptions', next)
  }

  function toggleOnDemand(idx: number, field: 'price' | 'weeks') {
    const opt = config.deploymentOptions[idx]
    updateDeploymentOption(idx, field, opt[field] === 'On Demand' ? 0 : 'On Demand')
  }

  // ── Week lookup helpers ────────────────────────────────────────────────────

  function updateWeekRow(idx: number, field: keyof WeekLookupRow, value: number) {
    const next = config.weekLookupTable.map((r, i) =>
      i === idx ? { ...r, [field]: value } : r
    )
    update('weekLookupTable', next)
  }

  function addWeekRow() {
    const last = config.weekLookupTable[config.weekLookupTable.length - 1]
    update('weekLookupTable', [
      ...config.weekLookupTable,
      { count: (last?.count ?? 0) + 3, tier1: (last?.tier1 ?? 0) + 1, tier2: (last?.tier2 ?? 0) + 1 },
    ])
  }

  function removeWeekRow(idx: number) {
    update('weekLookupTable', config.weekLookupTable.filter((_, i) => i !== idx))
  }

  // ── Tier 2 lookup helpers ──────────────────────────────────────────────────

  function updateTier2Row(idx: number, field: keyof Tier2LookupRow, value: number) {
    const next = config.tier2Lookup.map((r, i) =>
      i === idx ? { ...r, [field]: value } : r
    )
    update('tier2Lookup', next)
  }

  function addTier2Row() {
    const last = config.tier2Lookup[config.tier2Lookup.length - 1]
    update('tier2Lookup', [
      ...config.tier2Lookup,
      { count: (last?.count ?? 0) + 2, weeks: (last?.weeks ?? 0) + 3 },
    ])
  }

  function removeTier2Row(idx: number) {
    update('tier2Lookup', config.tier2Lookup.filter((_, i) => i !== idx))
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* ── Action bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {saveStatus ? (
          <div
            className={`text-xs px-3 py-2 rounded-lg border ${
              saveStatus.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {saveStatus.message}
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={resetToDefaults}
            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="text-xs font-medium px-4 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── 1. General Rates ─────────────────────────────────────────────── */}
      <Section
        title="General Rates"
        description="hourly rate and team size applied across all calculations"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <Field label="Hourly Rate ($)">
            <NumInput value={config.dayRate} onChange={(v) => update('dayRate', v)} min={1} />
          </Field>
          <Field label="Core Team Size">
            <NumInput value={config.coreHeadcount} onChange={(v) => update('coreHeadcount', v)} min={1} />
          </Field>
          <Field label="Integration Team Size">
            <NumInput value={config.intHeadcount} onChange={(v) => update('intHeadcount', v)} min={1} />
          </Field>
          <Field label="Working Days per Week">
            <NumInput value={config.workingDaysPerWeek} onChange={(v) => update('workingDaysPerWeek', v)} min={1} />
          </Field>
          <Field label="Integration Team FTE">
            <NumInput value={config.integrationFte} onChange={(v) => update('integrationFte', v)} min={1} />
          </Field>
          <Field label="Deployment & Training Hours per Week">
            <NumInput value={config.deploymentHoursPerWeek} onChange={(v) => update('deploymentHoursPerWeek', v)} min={1} />
          </Field>
        </div>
      </Section>

      {/* ── 2. Training ──────────────────────────────────────────────────── */}
      <Section title="Training" description="fixed fee charged when training is included">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="List Price ($)">
            <NumInput value={config.trainingListPrice} onChange={(v) => update('trainingListPrice', v)} min={0} />
          </Field>
          <Field label="Duration (weeks)">
            <NumInput value={config.trainingWeeks} onChange={(v) => update('trainingWeeks', v)} min={1} />
          </Field>
        </div>
      </Section>

      {/* ── 3. Deployment Options ────────────────────────────────────────── */}
      <Section
        title="Deployment Options"
        description="list price and implementation weeks per deployment type"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-2 pt-1 text-gray-400 font-medium pr-4">Deployment Type</th>
                <th className="text-left pb-2 pt-1 text-gray-400 font-medium w-32 pr-3">Price ($)</th>
                <th className="text-left pb-2 pt-1 text-gray-400 font-medium w-24 pr-3">Weeks</th>
                <th className="text-left pb-2 pt-1 text-gray-400 font-medium w-32">On Demand</th>
              </tr>
            </thead>
            <tbody>
              {config.deploymentOptions.map((opt, idx) => (
                <tr key={opt.name} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-4 text-gray-700 font-medium">{opt.name}</td>
                  <td className="py-2 pr-3">
                    {opt.price === 'On Demand' ? (
                      <span className="text-gray-400 text-[11px]">On Demand</span>
                    ) : (
                      <input
                        type="number"
                        className={numInputCls + ' w-32'}
                        value={opt.price as number}
                        min={0}
                        step={1000}
                        onChange={(e) => updateDeploymentOption(idx, 'price', Number(e.target.value))}
                      />
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {opt.weeks === 'On Demand' ? (
                      <span className="text-gray-400 text-[11px]">On Demand</span>
                    ) : (
                      <input
                        type="number"
                        className={numInputCls + ' w-20'}
                        value={opt.weeks as number}
                        min={0}
                        onChange={(e) => updateDeploymentOption(idx, 'weeks', Number(e.target.value))}
                      />
                    )}
                  </td>
                  <td className="py-2">
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
                          checked={opt.price === 'On Demand'}
                          onChange={() => toggleOnDemand(idx, 'price')}
                        />
                        <span className="text-gray-500">Price</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
                          checked={opt.weeks === 'On Demand'}
                          onChange={() => toggleOnDemand(idx, 'weeks')}
                        />
                        <span className="text-gray-500">Weeks</span>
                      </label>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── 4. Integration Weights ───────────────────────────────────────── */}
      <Section
        title="Integration Weights"
        description="multipliers applied to integration counts when calculating delivery weeks"
      >
        <div className="space-y-5">
          <div>
            <SubLabel>Base Weight</SubLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <Field label="Base Integration Weight">
                <NumInput value={config.w3BaseWeight} onChange={(v) => update('w3BaseWeight', v)} step={0.1} />
              </Field>
            </div>
          </div>

          <div>
            <SubLabel>Integration Type</SubLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <Field label="REST / JSON">
                <NumInput value={config.w4Rest} onChange={(v) => update('w4Rest', v)} step={0.1} />
              </Field>
              <Field label="SOAP / XML">
                <NumInput value={config.w5Soap} onChange={(v) => update('w5Soap', v)} step={0.1} />
              </Field>
              <Field label="Database / Proprietary">
                <NumInput value={config.w6Db} onChange={(v) => update('w6Db', v)} step={0.1} />
              </Field>
            </div>
          </div>

          <div>
            <SubLabel>Integration Status</SubLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <Field label="Existing Opus Library">
                <NumInput value={config.w7Library} onChange={(v) => update('w7Library', v)} step={0.1} />
              </Field>
              <Field label="Modification to Existing">
                <NumInput value={config.w8Modification} onChange={(v) => update('w8Modification', v)} step={0.1} />
              </Field>
              <Field label="New Integration">
                <NumInput value={config.w9New} onChange={(v) => update('w9New', v)} step={0.1} />
              </Field>
            </div>
          </div>

          <div>
            <SubLabel>Simple Calculator Bases</SubLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <Field label="Standard API — Base Weeks">
                <NumInput value={config.m28StandardBase} onChange={(v) => update('m28StandardBase', v)} step={0.1} />
              </Field>
              <Field label="Custom Build — Base Weeks">
                <NumInput value={config.o28CustomBase} onChange={(v) => update('o28CustomBase', v)} step={0.1} />
              </Field>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 5. Delivery Week Schedules ───────────────────────────────────── */}
      <Section
        title="Delivery Week Schedules"
        description="maps use-case count ranges to estimated delivery weeks"
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-1">

          {/* Linear Automation (Tier 1) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-700">Linear Automation Use Cases</p>
              <button
                type="button"
                onClick={addWeekRow}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
              >
                + Add row
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-400 font-medium border-b border-gray-200">
                      Use Case Count (min)
                    </th>
                    <th className="px-3 py-2 text-left text-gray-400 font-medium border-b border-gray-200">
                      Tier 1 Weeks
                    </th>
                    <th className="px-3 py-2 text-left text-gray-400 font-medium border-b border-gray-200">
                      Tier 2 Weeks
                    </th>
                    <th className="px-3 py-2 border-b border-gray-200 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {config.weekLookupTable.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100 last:border-0">
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          className={numInputCls}
                          value={row.count}
                          min={0}
                          onChange={(e) => updateWeekRow(idx, 'count', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          className={numInputCls}
                          value={row.tier1}
                          min={0}
                          onChange={(e) => updateWeekRow(idx, 'tier1', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          className={numInputCls}
                          value={row.tier2}
                          min={0}
                          onChange={(e) => updateWeekRow(idx, 'tier2', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeWeekRow(idx)}
                          disabled={config.weekLookupTable.length <= 2}
                          className="text-gray-300 hover:text-red-400 disabled:opacity-30 transition-colors"
                          title="Remove row"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              Rows must be sorted by count ascending.
            </p>
          </div>

          {/* Agentic AI (Tier 2) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-700">Agentic AI Use Cases</p>
              <button
                type="button"
                onClick={addTier2Row}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
              >
                + Add row
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-400 font-medium border-b border-gray-200">
                      Use Case Count (min)
                    </th>
                    <th className="px-3 py-2 text-left text-gray-400 font-medium border-b border-gray-200">
                      Weeks
                    </th>
                    <th className="px-3 py-2 border-b border-gray-200 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {config.tier2Lookup.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100 last:border-0">
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          className={numInputCls}
                          value={row.count}
                          min={0}
                          onChange={(e) => updateTier2Row(idx, 'count', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          className={numInputCls}
                          value={row.weeks}
                          min={0}
                          onChange={(e) => updateTier2Row(idx, 'weeks', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeTier2Row(idx)}
                          disabled={config.tier2Lookup.length <= 2}
                          className="text-gray-300 hover:text-red-400 disabled:opacity-30 transition-colors"
                          title="Remove row"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              Rows must be sorted by count ascending.
            </p>
          </div>
        </div>
      </Section>

      {/* ── GM Defaults ──────────────────────────────────────────────────── */}
      <Section
        title="GM Calculator Defaults"
        description="Default guardrails and role rates pre-loaded into the GM calculator"
        defaultOpen={false}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Target Gross Margin (%)">
              <NumInput
                value={gmConfig.targetGm}
                onChange={(v) => updateGm('targetGm', v)}
                min={0}
                step={0.1}
              />
            </Field>
            <Field label="Review Band (pts below target)">
              <NumInput
                value={gmConfig.reviewBand}
                onChange={(v) => updateGm('reviewBand', v)}
                min={0}
                step={0.1}
              />
            </Field>
            <Field label="Approval Band (pts below target)">
              <NumInput
                value={gmConfig.approvalBand}
                onChange={(v) => updateGm('approvalBand', v)}
                min={0}
                step={0.1}
              />
            </Field>
          </div>

          <div>
            <SubLabel>Default Roles</SubLabel>
            <div className="overflow-x-auto rounded-md border border-gray-200">
              <table className="w-full text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {['Role', 'Daily Cost ($)', 'Day Rate ($)', ''].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gmConfig.defaultRoles.map((r, idx) => (
                    <tr key={idx} className="border-b border-gray-100 last:border-0">
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          className={inputCls}
                          value={r.role}
                          placeholder="Role name"
                          onChange={(e) => updateGmRole(idx, 'role', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          className={numInputCls}
                          value={r.dailyCost}
                          min={0}
                          onChange={(e) => updateGmRole(idx, 'dailyCost', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          className={numInputCls}
                          value={r.standardRate}
                          min={0}
                          onChange={(e) => updateGmRole(idx, 'standardRate', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeGmRole(idx)}
                          disabled={gmConfig.defaultRoles.length <= 1}
                          className="text-gray-300 hover:text-red-400 disabled:opacity-30 transition-colors"
                          title="Remove role"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={addGmRole}
              className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors flex items-center gap-1"
            >
              <span className="text-base leading-none">+</span> Add Role
            </button>
          </div>

          {/* ── Day allocation matrix (editable) ────────────────────────── */}
          <div>
            <SubLabel>Hour-to-Day Allocation Matrix</SubLabel>
            <p className="text-[10px] text-gray-400 mb-3">
              When a quote is linked in the GM Calculator, project hours are converted to days (÷8) and
              distributed across roles using these percentages. Each column should sum to 100%.
            </p>
            <div className="overflow-x-auto rounded-md border border-gray-200">
              <table className="w-full text-xs min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-400 min-w-[160px]">Role</th>
                    {(['Core Impl', 'Integrations', 'Deployment', 'Training', 'Complexity'] as const).map((h) => (
                      <th key={h} className="px-2 py-2 text-center font-medium text-gray-400 w-24">{h} (%)</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gmConfig.defaultRoles.map((r, idx) => {
                    const a = r.allocations
                    const fields: { key: keyof NonNullable<GmRole['allocations']>; label: string }[] = [
                      { key: 'coreImpl',     label: 'Core Impl' },
                      { key: 'integrations', label: 'Integrations' },
                      { key: 'deployment',   label: 'Deployment' },
                      { key: 'training',     label: 'Training' },
                      { key: 'complexity',   label: 'Complexity' },
                    ]
                    return (
                      <tr key={idx} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-1.5 font-medium text-gray-700 text-[11px]">{r.role || <span className="text-gray-300 italic">unnamed</span>}</td>
                        {fields.map(({ key }) => (
                          <td key={key} className="px-2 py-1.5">
                            <input
                              type="number"
                              className={numInputCls + ' text-center'}
                              value={Math.round((a?.[key] ?? 0) * 100)}
                              min={0}
                              max={100}
                              step={1}
                              onChange={(e) => updateGmRoleAllocation(idx, key, Number(e.target.value))}
                            />
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="px-3 py-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wide">Column total</td>
                    {(['coreImpl', 'integrations', 'deployment', 'training', 'complexity'] as const).map((key) => {
                      const total = gmConfig.defaultRoles.reduce((sum, r) => sum + Math.round((r.allocations?.[key] ?? 0) * 100), 0)
                      return (
                        <td key={key} className={`px-2 py-1.5 text-center font-semibold text-xs ${total === 100 ? 'text-green-700' : total === 0 ? 'text-gray-300' : 'text-amber-600'}`}>
                          {total}%
                        </td>
                      )
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              Column totals shown below. Green = 100% (correct). Amber = does not sum to 100%.
            </p>
          </div>
        </div>
      </Section>

      {/* ── Bottom save ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={resetToDefaults}
          className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          Reset to defaults
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="text-xs font-medium px-5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

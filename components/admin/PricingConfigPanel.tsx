'use client'

import { useState, useCallback } from 'react'
import type { PricingConfig, DeploymentOption, WeekLookupRow, Tier2LookupRow } from '@/lib/types'
import { DEFAULT_PRICING_CONFIG } from '@/lib/pricing-engine'

interface PricingConfigPanelProps {
  initialConfig: PricingConfig
}

// ─── Small reusable primitives ────────────────────────────────────────────────

const labelCls = 'block text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1'
const inputCls =
  'w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400'
const numInputCls = inputCls + ' [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
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

// ─── Section wrapper with collapse ───────────────────────────────────────────

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
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        </div>
        <span className="text-gray-400 text-xs ml-4">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-gray-100">{children}</div>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PricingConfigPanel({ initialConfig }: PricingConfigPanelProps) {
  const [config, setConfig] = useState<PricingConfig>(initialConfig)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  function update<K extends keyof PricingConfig>(key: K, value: PricingConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
    setStatus(null)
  }

  function resetToDefaults() {
    if (!confirm('Reset all pricing values to factory defaults? This cannot be undone without saving first.')) return
    setConfig(DEFAULT_PRICING_CONFIG)
    setIsDirty(true)
    setStatus(null)
  }

  const handleSave = useCallback(async () => {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/pricing-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const json = await res.json()
      if (!res.ok) {
        setStatus({ type: 'error', message: json.error ?? 'Failed to save' })
      } else {
        setStatus({ type: 'success', message: 'Pricing configuration saved. Changes are live for all sellers.' })
        setIsDirty(false)
      }
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Network error' })
    } finally {
      setSaving(false)
    }
  }, [config])

  // ── Deployment options helpers ─────────────────────────────────────────────

  function updateDeploymentOption(idx: number, field: keyof DeploymentOption, value: string | number | 'On Demand') {
    const next = config.deploymentOptions.map((opt, i) =>
      i === idx ? { ...opt, [field]: value } : opt
    )
    update('deploymentOptions', next)
  }

  function toggleOnDemand(idx: number, field: 'price' | 'weeks') {
    const opt = config.deploymentOptions[idx]
    const isOnDemand = opt[field] === 'On Demand'
    updateDeploymentOption(idx, field, isOnDemand ? 0 : 'On Demand')
  }

  // ── Week lookup table helpers ──────────────────────────────────────────────

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

  // ── Tier2 lookup helpers ────────────────────────────────────────────────────

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
    <div className="space-y-4">

      {/* Top action bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          {status && (
            <div
              className={`text-xs px-3 py-2 rounded-lg border ${
                status.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {status.message}
            </div>
          )}
        </div>
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
        description="Day rate and team headcount used across all calculations"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          <Field label="Day Rate ($/hr)">
            <NumInput
              value={config.dayRate}
              onChange={(v) => update('dayRate', v)}
              min={1}
              step={1}
            />
          </Field>
          <Field label="Core Headcount (R7)">
            <NumInput
              value={config.coreHeadcount}
              onChange={(v) => update('coreHeadcount', v)}
              min={1}
            />
          </Field>
          <Field label="Integration Headcount (S7)">
            <NumInput
              value={config.intHeadcount}
              onChange={(v) => update('intHeadcount', v)}
              min={1}
            />
          </Field>
          <Field label="Working Days / Week (S9)">
            <NumInput
              value={config.workingDaysPerWeek}
              onChange={(v) => update('workingDaysPerWeek', v)}
              min={1}
              step={1}
            />
          </Field>
          <Field label="Integration FTE">
            <NumInput
              value={config.integrationFte}
              onChange={(v) => update('integrationFte', v)}
              min={1}
            />
          </Field>
          <Field label="Deployment / Training Hrs / Week">
            <NumInput
              value={config.deploymentHoursPerWeek}
              onChange={(v) => update('deploymentHoursPerWeek', v)}
              min={1}
            />
          </Field>
        </div>
      </Section>

      {/* ── 2. Training ──────────────────────────────────────────────────── */}
      <Section title="Training" description="Fixed fee charged when training is included">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
          <Field label="Training List Price ($)">
            <NumInput
              value={config.trainingListPrice}
              onChange={(v) => update('trainingListPrice', v)}
              min={0}
            />
          </Field>
          <Field label="Training Duration (weeks)">
            <NumInput
              value={config.trainingWeeks}
              onChange={(v) => update('trainingWeeks', v)}
              min={1}
            />
          </Field>
        </div>
      </Section>

      {/* ── 3. Deployment Options ────────────────────────────────────────── */}
      <Section
        title="Deployment Options"
        description="List price and implementation weeks for each deployment type"
      >
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-2 text-gray-400 font-medium pr-4">Deployment Type</th>
                <th className="text-left pb-2 text-gray-400 font-medium w-32 pr-3">Price ($)</th>
                <th className="text-left pb-2 text-gray-400 font-medium w-24 pr-3">Weeks</th>
                <th className="text-left pb-2 text-gray-400 font-medium w-28">On Demand</th>
              </tr>
            </thead>
            <tbody>
              {config.deploymentOptions.map((opt, idx) => (
                <tr key={opt.name} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-4 text-gray-700 font-medium whitespace-nowrap">{opt.name}</td>
                  <td className="py-2 pr-3">
                    {opt.price === 'On Demand' ? (
                      <span className="text-gray-400 italic text-[11px]">On Demand</span>
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
                      <span className="text-gray-400 italic text-[11px]">On Demand</span>
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
                    <div className="flex gap-2">
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
        title="Integration Weights (Detailed Calculator)"
        description="Multipliers used in the H7 integration weeks formula"
      >
        <div className="mt-4 space-y-5">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-3">Base Weight</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <Field label="W3 — Base Integration Weight">
                <NumInput value={config.w3BaseWeight} onChange={(v) => update('w3BaseWeight', v)} step={0.1} />
              </Field>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-3">Integration Type Weights</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <Field label="W4 — REST / JSON">
                <NumInput value={config.w4Rest} onChange={(v) => update('w4Rest', v)} step={0.1} />
              </Field>
              <Field label="W5 — SOAP / XML">
                <NumInput value={config.w5Soap} onChange={(v) => update('w5Soap', v)} step={0.1} />
              </Field>
              <Field label="W6 — Database / Proprietary">
                <NumInput value={config.w6Db} onChange={(v) => update('w6Db', v)} step={0.1} />
              </Field>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-3">Integration Status Weights</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <Field label="W7 — Existing Opus Library">
                <NumInput value={config.w7Library} onChange={(v) => update('w7Library', v)} step={0.1} />
              </Field>
              <Field label="W8 — Modification">
                <NumInput value={config.w8Modification} onChange={(v) => update('w8Modification', v)} step={0.1} />
              </Field>
              <Field label="W9 — New Integration">
                <NumInput value={config.w9New} onChange={(v) => update('w9New', v)} step={0.1} />
              </Field>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-3">Simple Calculator — Integration Bases</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <Field label="M28 — Standard API Base Weeks">
                <NumInput value={config.m28StandardBase} onChange={(v) => update('m28StandardBase', v)} step={0.1} />
              </Field>
              <Field label="O28 — Custom Build Base Weeks">
                <NumInput value={config.o28CustomBase} onChange={(v) => update('o28CustomBase', v)} step={0.1} />
              </Field>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 5. Week Lookup Tables ────────────────────────────────────────── */}
      <Section
        title="Delivery Week Lookup Tables"
        description="VLOOKUP tables mapping use-case counts to delivery weeks (Excel L:O rows 5–22)"
        defaultOpen={false}
      >
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Tier 1 + shared table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-700">Combined Lookup Table <span className="text-gray-400">(Tier 1 + Tier 2 weeks)</span></p>
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
                    <th className="px-3 py-2 text-left text-gray-400 font-medium border-b border-gray-200">Count Floor</th>
                    <th className="px-3 py-2 text-left text-gray-400 font-medium border-b border-gray-200">Tier 1 Weeks</th>
                    <th className="px-3 py-2 text-left text-gray-400 font-medium border-b border-gray-200">Tier 2 Weeks</th>
                    <th className="px-3 py-2 border-b border-gray-200 w-8"></th>
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
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">Rows must be sorted by Count Floor ascending for VLOOKUP to work correctly.</p>
          </div>

          {/* Tier 2 dedicated lookup */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-700">Tier 2 Dedicated Lookup <span className="text-gray-400">(Excel N:O)</span></p>
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
                    <th className="px-3 py-2 text-left text-gray-400 font-medium border-b border-gray-200">Count Floor</th>
                    <th className="px-3 py-2 text-left text-gray-400 font-medium border-b border-gray-200">Weeks</th>
                    <th className="px-3 py-2 border-b border-gray-200 w-8"></th>
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
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">Rows must be sorted by Count Floor ascending for VLOOKUP to work correctly.</p>
          </div>
        </div>
      </Section>

      {/* Bottom save bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
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

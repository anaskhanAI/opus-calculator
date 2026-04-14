'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import type { GmConfig, GmInputs, GmSavedScenario } from '@/lib/types'
import type { GmQuote } from '@/app/admin/gm/page'
import { calculateGm, deriveGmDaysFromQuote, fmtCurrency } from '@/lib/gm-engine'
import GmRolesTable from './GmRolesTable'
import GmResultsPanel from './GmResultsPanel'
import GmSavedScenarios from './GmSavedScenarios'

interface Props {
  gmConfig: GmConfig
  initialScenarios: GmSavedScenario[]
  quotes: GmQuote[]
  initialLinkedQuote?: GmQuote | null
}

const inputCls =
  'w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400'
const numCls =
  inputCls +
  ' [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

function inputsFromQuote(quote: GmQuote, gmConfig: GmConfig): Partial<GmInputs> {
  const rolesWithDays = deriveGmDaysFromQuote(quote.outputs, gmConfig.defaultRoles)
  const rawListPrice = quote.outputs?.projectTotal?.listPrice
  const listPrice = typeof rawListPrice === 'number' ? rawListPrice : (typeof quote.totalPrice === 'number' ? quote.totalPrice : 0)
  const requestedDiscount = (quote.inputs as { requestedDiscount?: number }).requestedDiscount ?? 0
  return {
    roles: rolesWithDays,
    listPrice,
    requestedDiscount,
  }
}

function buildInitialInputs(gmConfig: GmConfig, initialLinkedQuote?: GmQuote | null): GmInputs {
  const base: GmInputs = {
    roles: gmConfig.defaultRoles.map((r) => ({ ...r })),
    listPrice: 0,
    requestedDiscount: 0,
    targetGm: gmConfig.targetGm,
    reviewBand: gmConfig.reviewBand,
    approvalBand: gmConfig.approvalBand,
  }
  if (!initialLinkedQuote) return base
  return { ...base, ...inputsFromQuote(initialLinkedQuote, gmConfig) }
}

export default function GmCalculatorClient({ gmConfig, initialScenarios, quotes, initialLinkedQuote }: Props) {
  const [inputs, setInputs] = useState<GmInputs>(() =>
    buildInitialInputs(gmConfig, initialLinkedQuote)
  )
  const [linkedQuote, setLinkedQuote] = useState<GmQuote | null>(initialLinkedQuote ?? null)

  // Track the last initialLinkedQuote id we've applied so that soft navigations
  // (same route, different ?quoteId) update state even without a remount.
  const appliedQuoteId = useRef<string | null>(initialLinkedQuote?.id ?? null)
  useEffect(() => {
    const incomingId = initialLinkedQuote?.id ?? null
    if (incomingId !== appliedQuoteId.current) {
      appliedQuoteId.current = incomingId
      if (initialLinkedQuote) {
        setLinkedQuote(initialLinkedQuote)
        setInputs((prev) => ({ ...prev, ...inputsFromQuote(initialLinkedQuote, gmConfig) }))
      } else {
        setLinkedQuote(null)
        setInputs(buildInitialInputs(gmConfig, null))
      }
    }
  }, [initialLinkedQuote, gmConfig])

  const [showQuoteDropdown, setShowQuoteDropdown] = useState(false)
  const [quoteSearch, setQuoteSearch] = useState('')
  const [saveNotes, setSaveNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [scenarios, setScenarios] = useState<GmSavedScenario[]>(initialScenarios)

  const outputs = useMemo(() => calculateGm(inputs), [inputs])

  function updateInput<K extends keyof GmInputs>(key: K, value: GmInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }))
  }

  // ── Quote link ─────────────────────────────────────────────────────────────

  const filteredQuotes = useMemo(() => {
    if (!quoteSearch.trim()) return quotes
    const q = quoteSearch.toLowerCase()
    return quotes.filter(
      (qt) =>
        qt.quoteRef.toLowerCase().includes(q) ||
        qt.clientName.toLowerCase().includes(q) ||
        qt.projectName.toLowerCase().includes(q)
    )
  }, [quotes, quoteSearch])

  function linkQuote(q: GmQuote) {
    setLinkedQuote(q)
    setShowQuoteDropdown(false)
    setQuoteSearch('')
    setInputs((prev) => ({ ...prev, ...inputsFromQuote(q, gmConfig) }))
  }

  function unlinkQuote() {
    setLinkedQuote(null)
    setInputs((prev) => ({
      ...prev,
      roles: gmConfig.defaultRoles.map((r) => ({ ...r })),
      listPrice: 0,
      requestedDiscount: 0,
    }))
  }

  // ── Save scenario ──────────────────────────────────────────────────────────

  const hasData = inputs.roles.some((r) => r.days > 0) || inputs.listPrice > 0

  const handleSave = useCallback(async () => {
    if (!hasData) return
    setSaving(true)
    setSaveStatus(null)
    try {
      const res = await fetch('/api/gm-scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: linkedQuote?.id ?? null,
          quoteRef: linkedQuote?.quoteRef ?? null,
          clientName: linkedQuote?.clientName ?? null,
          projectName: linkedQuote?.projectName ?? null,
          inputs,
          outputs,
          notes: saveNotes.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSaveStatus({ type: 'error', msg: json.error ?? 'Failed to save' })
      } else {
        setSaveStatus({ type: 'success', msg: 'Scenario saved.' })
        setSaveNotes('')
        setScenarios((prev) => [json.scenario as GmSavedScenario, ...prev])
      }
    } catch {
      setSaveStatus({ type: 'error', msg: 'Network error. Please try again.' })
    } finally {
      setSaving(false)
    }
  }, [hasData, inputs, outputs, linkedQuote, saveNotes])

  function loadScenario(s: GmSavedScenario) {
    setInputs(s.inputs)
    if (s.quoteId) {
      const q = quotes.find((qt) => qt.id === s.quoteId)
      setLinkedQuote(q ?? null)
    } else {
      setLinkedQuote(null)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteScenario(id: string) {
    const res = await fetch(`/api/gm-scenarios?id=${id}`, { method: 'DELETE' })
    if (res.ok) setScenarios((prev) => prev.filter((s) => s.id !== id))
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Quote link bar ──────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-gray-500">Linked quote:</span>

        {linkedQuote ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-800">{linkedQuote.quoteRef}</span>
            <span className="text-xs text-gray-500">{linkedQuote.clientName} — {linkedQuote.projectName}</span>
            <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full font-medium">
              {fmtCurrency(linkedQuote.totalPrice ?? 0)} list
            </span>
            <button
              type="button"
              onClick={unlinkQuote}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕ unlink
            </button>
          </div>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowQuoteDropdown((v) => !v)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              Link to a quote
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showQuoteDropdown && (
              <div className="absolute left-0 top-7 z-20 bg-white border border-gray-200 rounded-lg shadow-lg w-80">
                <div className="p-2 border-b border-gray-100">
                  <input
                    type="text"
                    placeholder="Search by ref, client, or project…"
                    className={inputCls}
                    value={quoteSearch}
                    onChange={(e) => setQuoteSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {filteredQuotes.length === 0 ? (
                    <p className="text-xs text-gray-400 px-3 py-3">No quotes found.</p>
                  ) : (
                    filteredQuotes.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => linkQuote(q)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-gray-800">{q.quoteRef}</span>
                          <span className="text-xs text-gray-500">{fmtCurrency(q.totalPrice ?? 0)}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">{q.clientName} — {q.projectName}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Main grid: controls left, results right ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-4 items-start">

        {/* ── Controls ──────────────────────────────────────────────────── */}
        <div className="space-y-3">

          {/* Guardrails */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Commercial Guardrails</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Gross Margin Target (%)
                </label>
                <input
                  type="number"
                  className={numCls}
                  value={inputs.targetGm}
                  min={0}
                  max={100}
                  step={0.1}
                  onChange={(e) => updateInput('targetGm', Number(e.target.value))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Review Band (pts)
                  </label>
                  <input
                    type="number"
                    className={numCls}
                    value={inputs.reviewBand}
                    min={0}
                    step={0.1}
                    onChange={(e) => updateInput('reviewBand', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Approval Band (pts)
                  </label>
                  <input
                    type="number"
                    className={numCls}
                    value={inputs.approvalBand}
                    min={0}
                    step={0.1}
                    onChange={(e) => updateInput('approvalBand', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Pricing</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                  List Price ($)
                </label>
                {linkedQuote ? (
                  <div className="flex items-center justify-between px-3 py-2 rounded-md bg-gray-50 border border-gray-100">
                    <span className="text-xs font-semibold text-gray-700">
                      {fmtCurrency(inputs.listPrice)}
                    </span>
                    <span className="text-[10px] text-indigo-500 font-medium">from quote</span>
                  </div>
                ) : (
                  <input
                    type="number"
                    className={numCls}
                    value={inputs.listPrice === 0 ? '' : inputs.listPrice}
                    placeholder="0"
                    min={0}
                    step={1000}
                    onChange={(e) =>
                      updateInput('listPrice', e.target.value === '' ? 0 : Number(e.target.value))
                    }
                  />
                )}
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Requested Discount ($)
                </label>
                <input
                  type="number"
                  className={numCls}
                  value={inputs.requestedDiscount === 0 ? '' : inputs.requestedDiscount}
                  placeholder="0"
                  min={0}
                  step={1000}
                  onChange={(e) =>
                    updateInput('requestedDiscount', e.target.value === '' ? 0 : Number(e.target.value))
                  }
                />
              </div>
            </div>
          </div>

          {/* Roles */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Team &amp; Effort</h3>
              {linkedQuote && (
                <span className="text-[10px] text-indigo-500 font-medium">
                  Derived from quote
                </span>
              )}
            </div>
            <GmRolesTable
              roles={inputs.roles}
              onChange={(roles) => updateInput('roles', roles)}
            />
          </div>

          {/* Save */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Save Scenario</h3>
            <textarea
              rows={2}
              placeholder="Optional notes…"
              value={saveNotes}
              onChange={(e) => setSaveNotes(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none mb-2"
            />
            {saveStatus && (
              <p className={`text-xs mb-2 ${saveStatus.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                {saveStatus.msg}
              </p>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasData}
              className="w-full text-xs font-medium py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving…' : 'Save Scenario'}
            </button>
            {!hasData && (
              <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                Link a quote or enter values to save.
              </p>
            )}
          </div>
        </div>

        {/* ── Results ─────────────────────────────────────────────────── */}
        <GmResultsPanel outputs={outputs} inputs={inputs} />
      </div>

      {/* ── Saved scenarios ─────────────────────────────────────────────── */}
      {scenarios.length > 0 && (
        <GmSavedScenarios
          scenarios={scenarios}
          onLoad={loadScenario}
          onDelete={deleteScenario}
        />
      )}
    </div>
  )
}

/**
 * GM Discount Engine
 *
 * Pure functions — no DOM, no side effects.
 * Logic ported from index.html (standalone GM Discount Calculator).
 */

import type {
  GmConfig,
  GmInputs,
  GmOutputs,
  GmRole,
  GmRoleResult,
  GmScenario,
  GmSignal,
  CalculatorOutputs,
} from './types'

// Re-export GmRole for convenience (used by GmCalculatorClient)
export type { GmRole }

// ─── DEFAULT CONFIG ───────────────────────────────────────────────────────────

// Allocation percentages derived from the distribution table:
//   Row        | SC     | WE     | PM     | CloudOps
//   Core Impl  | 33.3%  | 33.3%  | 33.3%  | —
//   Integrat.  | 25%    | 50%    | 25%    | —
//   Deployment | —      | —      | 25%    | 75%
//   Training   | 50%    | 25%    | 25%    | —
//   Complexity | 33.3%  | 33.3%  | 33.3%  | —

export const DEFAULT_GM_CONFIG: GmConfig = {
  targetGm: 50,
  reviewBand: 10,
  approvalBand: 20,
  defaultRoles: [
    {
      role: 'AI Solutions Consultant',
      days: 0, dailyCost: 400, standardRate: 1000,
      allocations: { coreImpl: 0.333, integrations: 0.25,  deployment: 0,    training: 0.50,  complexity: 0.333 },
    },
    {
      role: 'AI Workflow/Integration Engineer',
      days: 0, dailyCost: 300, standardRate: 1000,
      allocations: { coreImpl: 0.333, integrations: 0.50,  deployment: 0,    training: 0.25,  complexity: 0.333 },
    },
    {
      role: 'Project Manager',
      days: 0, dailyCost: 350, standardRate: 1000,
      allocations: { coreImpl: 0.333, integrations: 0.25,  deployment: 0.25, training: 0.25,  complexity: 0.333 },
    },
    {
      role: 'Cloud Ops Engineer',
      days: 0, dailyCost: 400, standardRate: 1000,
      allocations: { coreImpl: 0,     integrations: 0,     deployment: 0.75, training: 0,     complexity: 0 },
    },
    {
      role: 'AI Solutions Architect',
      days: 0, dailyCost: 450, standardRate: 1000,
      allocations: { coreImpl: 0,     integrations: 0,     deployment: 0,    training: 0,     complexity: 0 },
    },
  ],
}

export function resolveGmConfig(partial: Partial<GmConfig> | null | undefined): GmConfig {
  if (!partial) return DEFAULT_GM_CONFIG
  return {
    ...DEFAULT_GM_CONFIG,
    ...partial,
    defaultRoles: partial.defaultRoles ?? DEFAULT_GM_CONFIG.defaultRoles,
  }
}

// ─── QUOTE-DERIVED POPULATION ─────────────────────────────────────────────────

function toFiniteNum(v: number | 'On Demand'): number {
  return v === 'On Demand' || !isFinite(Number(v)) ? 0 : Number(v)
}

/**
 * Derives per-role working days from a saved quote's calculator outputs.
 * Each output category's hours are converted to days (÷8) then distributed
 * across roles using the `allocations` percentages stored on each role.
 */
export function deriveGmDaysFromQuote(
  outputs: CalculatorOutputs,
  roles: GmRole[]
): GmRole[] {
  const coreImplDays     = toFiniteNum(outputs.coreImplementation.hours) / 8
  const integrationsDays = toFiniteNum(outputs.integrations.hours) / 8
  const deploymentDays   = toFiniteNum(outputs.deployment.hours) / 8
  const trainingDays     = toFiniteNum(outputs.training.hours) / 8
  const complexityDays   = toFiniteNum(outputs.complexityFactor.hours) / 8

  return roles.map((r) => {
    if (!r.allocations) return { ...r }
    const a = r.allocations
    const days = Math.round(
      coreImplDays     * a.coreImpl     +
      integrationsDays * a.integrations +
      deploymentDays   * a.deployment   +
      trainingDays     * a.training     +
      complexityDays   * a.complexity
    )
    return { ...r, days }
  })
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function gmSignal(
  actualGm: number,
  targetGm: number,
  reviewBand: number,
  approvalBand: number
): GmSignal {
  const tgt = targetGm / 100
  const rev = reviewBand / 100
  const app = approvalBand / 100
  if (actualGm >= tgt) return 'SAFE'
  if (actualGm >= tgt - rev) return 'REVIEW'
  if (actualGm >= tgt - app) return 'APPROVAL'
  return 'ESCALATE'
}

function buildAdjustmentHint(
  actualGm: number,
  targetGm: number,
  discountedPrice: number,
  totalCost: number,
  requestedDiscount: number
): string {
  if (totalCost === 0 && discountedPrice === 0) return ''

  const tgt = targetGm / 100
  const gmGap = tgt - actualGm

  if (gmGap <= 0) return 'GM is at or above target.'

  const minPrice = totalCost > 0 ? totalCost / (1 - tgt) : 0
  const maxDiscount = (discountedPrice + requestedDiscount) - minPrice

  if (requestedDiscount > 0 && maxDiscount >= 0) {
    const reduceBy = minPrice - discountedPrice
    if (reduceBy > 0) {
      return `Reduce discount by ${fmtCurrency(reduceBy)} to reach the target GM of ${targetGm}%.`
    }
  }

  return `Minimum price to reach ${targetGm}% GM is ${fmtCurrency(minPrice)}.`
}

// ─── MAIN CALC ────────────────────────────────────────────────────────────────

export function calculateGm(inputs: GmInputs): GmOutputs {
  const { roles, listPrice, requestedDiscount, targetGm, reviewBand, approvalBand } = inputs

  const totalDays = roles.reduce((a, r) => a + r.days, 0)

  // Per-role economics: revenue is always days × standardRate
  let totalRevenue = 0
  let totalCost = 0

  const roleResults: GmRoleResult[] = roles.map((r) => {
    const revenue = r.days * r.standardRate
    const cost = r.days * r.dailyCost
    const effortPct = totalDays === 0 ? 0 : r.days / totalDays
    const gmPct = revenue === 0 ? 0 : (revenue - cost) / revenue

    totalRevenue += revenue
    totalCost += cost

    return { ...r, revenue, effortPct, cost, gmPct }
  })

  // Discounted price = list price minus requested discount
  const effectiveListPrice = listPrice > 0 ? listPrice : totalRevenue
  const discountedPrice = requestedDiscount > 0
    ? effectiveListPrice - requestedDiscount
    : effectiveListPrice

  // GM is driven by the discounted price (what the client actually pays)
  const actualGm = discountedPrice === 0 ? 0 : (discountedPrice - totalCost) / discountedPrice
  const grossProfit = discountedPrice - totalCost

  const signal = gmSignal(actualGm, targetGm, reviewBand, approvalBand)

  const tgt = targetGm / 100
  const buildScenarioGm = (price: number): number =>
    price === 0 ? 0 : (price - totalCost) / price

  const scenarios: GmScenario[] = [
    {
      name: 'At List Price',
      revenue: effectiveListPrice,
      gm: buildScenarioGm(effectiveListPrice),
      delta: 0,
      signal: gmSignal(buildScenarioGm(effectiveListPrice), targetGm, reviewBand, approvalBand),
    },
    {
      name: 'With Discount',
      revenue: discountedPrice,
      gm: actualGm,
      delta: -requestedDiscount,
      signal,
    },
  ]

  const adjustmentHint = buildAdjustmentHint(
    actualGm, targetGm, discountedPrice, totalCost, requestedDiscount
  )

  return {
    totalDays,
    totalRevenue,
    listPrice: effectiveListPrice,
    discountedPrice,
    totalCost,
    grossProfit,
    actualGm,
    signal,
    roles: roleResults,
    scenarios,
    adjustmentHint,
  }
}

// ─── FORMATTING HELPERS ───────────────────────────────────────────────────────

export function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(isFinite(n) ? n : 0)
}

export function fmtPct(n: number): string {
  return `${((isFinite(n) ? n : 0) * 100).toFixed(1)}%`
}

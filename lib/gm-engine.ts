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

/**
 * Derives per-role revenue from a saved quote's calculator output list prices.
 * The same allocation percentages used for days are applied to list prices so
 * revenue reflects the actual charged amount per category — not effort × rate.
 */
export function deriveGmRevenueFromQuote(
  outputs: CalculatorOutputs,
  roles: GmRole[]
): GmRole[] {
  const coreImplRev     = toFiniteNum(outputs.coreImplementation.listPrice)
  const integrationsRev = toFiniteNum(outputs.integrations.listPrice)
  const deploymentRev   = toFiniteNum(outputs.deployment.listPrice)
  const trainingRev     = toFiniteNum(outputs.training.listPrice)
  const complexityRev   = toFiniteNum(outputs.complexityFactor.listPrice)

  return roles.map((r) => {
    if (!r.allocations) return { ...r, quoteRevenue: undefined }
    const a = r.allocations
    const quoteRevenue = Math.round(
      coreImplRev     * a.coreImpl     +
      integrationsRev * a.integrations +
      deploymentRev   * a.deployment   +
      trainingRev     * a.training     +
      complexityRev   * a.complexity
    )
    return { ...r, quoteRevenue }
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
  dealPrice: number,
  listPrice: number,
  totalCost: number
): string {
  if (totalCost === 0 && dealPrice === 0) return ''

  const tgt = targetGm / 100
  const gmGap = tgt - actualGm

  if (gmGap <= 0) {
    if (dealPrice > listPrice && listPrice > 0) {
      const pct = ((dealPrice - listPrice) / listPrice) * 100
      return `Charging ${pct.toFixed(1)}% above list price. GM is at or above target.`
    }
    return 'GM is at or above target.'
  }

  const minPrice = totalCost > 0 ? totalCost / (1 - tgt) : 0

  if (dealPrice < listPrice && listPrice > 0) {
    const gap = minPrice - dealPrice
    if (gap > 0) {
      return `Deal price is below list and below the minimum needed. Increase deal price by ${fmtCurrency(gap)} to reach the target GM of ${targetGm}%.`
    }
    return `Deal price is below list but still above the minimum needed for ${targetGm}% GM.`
  }

  if (listPrice === 0) {
    const uplift = minPrice - dealPrice
    if (uplift > 0) {
      return `Increase deal price by ${fmtCurrency(uplift)} to reach the target GM of ${targetGm}%.`
    }
  }

  return `Minimum deal price to reach ${targetGm}% GM is ${fmtCurrency(minPrice)}.`
}

// ─── MAIN CALC ────────────────────────────────────────────────────────────────

export function calculateGm(inputs: GmInputs): GmOutputs {
  const { roles, dealPrice, listPrice, requestedDiscount, targetGm, reviewBand, approvalBand } = inputs

  const totalDays = roles.reduce((a, r) => a + r.days, 0)

  // Per-role revenue: use quoteRevenue if linked, else days × standardRate
  let totalListRevenue = 0
  let totalCost = 0

  const roleResults: GmRoleResult[] = roles.map((r) => {
    const standardRevenue = r.quoteRevenue ?? (r.days * r.standardRate)
    const cost = r.days * r.dailyCost
    const effortPct = totalDays === 0 ? 0 : r.days / totalDays

    const tgt = targetGm / 100
    const gmPct = standardRevenue === 0 ? 0 : (standardRevenue - cost) / standardRevenue
    const inputGmPct = gmPct // at list price (before deal price adjustment)
    const minRev = 1 - tgt === 0 ? 0 : cost / (1 - tgt)

    totalListRevenue += standardRevenue
    totalCost += cost

    return {
      ...r,
      standardRevenue,
      effortPct,
      cost,
      gmPct,
      inputGmPct,
      minRev,
    }
  })

  // Discounted price = list price minus requested discount (dollar amount)
  const discountedPrice = listPrice > 0 && requestedDiscount > 0
    ? listPrice - requestedDiscount
    : listPrice

  // Overall GM is driven by the deal price the admin controls
  const effectiveDealPrice = dealPrice > 0 ? dealPrice : totalListRevenue
  const actualGm =
    effectiveDealPrice === 0
      ? 0
      : (effectiveDealPrice - totalCost) / effectiveDealPrice

  const tgt = targetGm / 100
  const grossProfit = effectiveDealPrice - totalCost
  const minPriceAtTarget = 1 - tgt === 0 ? 0 : totalCost / (1 - tgt)

  // How far above list price you could go and still be at exactly target GM
  // (usually 0 or positive if list price already > minPrice)
  const maxPremiumAboveList = Math.max(0, totalListRevenue - minPriceAtTarget)

  const priceDelta = effectiveDealPrice - listPrice

  const signal = gmSignal(actualGm, targetGm, reviewBand, approvalBand)

  const buildScenarioGm = (revenue: number): number =>
    revenue === 0 ? 0 : (revenue - totalCost) / revenue

  const scenarios: GmScenario[] = [
    {
      name: 'At List Price',
      revenue: totalListRevenue,
      gm: buildScenarioGm(totalListRevenue),
      delta: totalListRevenue - listPrice,
      signal: gmSignal(buildScenarioGm(totalListRevenue), targetGm, reviewBand, approvalBand),
    },
    {
      name: 'Current Deal',
      revenue: effectiveDealPrice,
      gm: actualGm,
      delta: priceDelta,
      signal,
    },
    {
      name: 'Min @ Target GM',
      revenue: minPriceAtTarget,
      gm: tgt,
      delta: minPriceAtTarget - listPrice,
      signal: gmSignal(tgt, targetGm, reviewBand, approvalBand),
    },
  ]

  const adjustmentHint = buildAdjustmentHint(
    actualGm,
    targetGm,
    effectiveDealPrice,
    listPrice,
    totalCost
  )

  return {
    totalDays,
    totalListRevenue,
    dealPrice: effectiveDealPrice,
    listPrice,
    discountedPrice,
    priceDelta,
    totalCost,
    grossProfit,
    actualGm,
    minPriceAtTarget,
    maxPremiumAboveList,
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

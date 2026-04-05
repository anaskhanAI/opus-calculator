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
  GmRoleResult,
  GmScenario,
  GmSignal,
} from './types'

// ─── DEFAULT CONFIG ───────────────────────────────────────────────────────────

export const DEFAULT_GM_CONFIG: GmConfig = {
  targetGm: 50,
  reviewBand: 10,
  approvalBand: 20,
  defaultRoles: [
    { role: 'AI Solutions Consultant',          days: 0, dailyCost: 400, standardRate: 1000 },
    { role: 'AI Workflow/Integration Engineer', days: 0, dailyCost: 300, standardRate: 1000 },
    { role: 'Project Manager',                  days: 0, dailyCost: 350, standardRate: 1000 },
    { role: 'Cloud Ops Engineer',               days: 0, dailyCost: 400, standardRate: 1000 },
    { role: 'AI Solutions Architect',           days: 0, dailyCost: 450, standardRate: 1000 },
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

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

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
  totalDiscountedRevenue: number,
  totalCost: number,
  activeDiscount: number,
  totalStandardRevenue: number
): string {
  const tgt = targetGm / 100

  if (totalCost === 0 && totalDiscountedRevenue === 0) return ''

  const gmGap = tgt - actualGm

  if (gmGap <= 0) {
    return 'Already at or above target GM.'
  }

  if (totalStandardRevenue === 0) {
    return 'Add days and rates to see discount guidance.'
  }

  const requiredRev = totalCost > 0 ? totalCost / (1 - tgt) : 0
  const maxAllowedDiscount = Math.max(0, totalStandardRevenue - requiredRev)
  const discountReduction = activeDiscount - maxAllowedDiscount

  if (activeDiscount <= 0) {
    const revenueUplift = requiredRev - totalDiscountedRevenue
    const upliftPct =
      totalDiscountedRevenue > 0 ? (revenueUplift / totalDiscountedRevenue) * 100 : 0
    return `No discount applied. List price needs to increase by $${Math.round(revenueUplift).toLocaleString()} (+${upliftPct.toFixed(1)}%) to reach the target GM of ${targetGm}%.`
  }

  const newDiscPct =
    totalStandardRevenue > 0 ? (maxAllowedDiscount / totalStandardRevenue) * 100 : 0

  if (discountReduction > 0) {
    return `Discount too high. Reduce by $${Math.round(discountReduction).toLocaleString()} — maximum allowable discount is $${Math.round(maxAllowedDiscount).toLocaleString()} (${newDiscPct.toFixed(1)}% of list) to reach the target GM of ${targetGm}%.`
  }

  return 'Review deal inputs. Discount is within range but GM is still below target — check list rates and days.'
}

// ─── MAIN CALC ────────────────────────────────────────────────────────────────

export function calculateGm(inputs: GmInputs): GmOutputs {
  const { roles, discountType, discountPercent, discountAmount, targetGm, reviewBand, approvalBand } = inputs

  const totalDays = roles.reduce((a, r) => a + r.days, 0)
  const totalStandardRevenue = roles.reduce((a, r) => a + r.days * r.standardRate, 0)

  const activeDiscount =
    discountType === 'Percent'
      ? (discountPercent / 100) * totalStandardRevenue
      : discountAmount

  let totalDiscountedRevenue = 0
  let totalCost = 0

  const roleResults: GmRoleResult[] = roles.map((r) => {
    const standardRevenue = r.days * r.standardRate
    const effortPct = totalDays === 0 ? 0 : r.days / totalDays
    const discount = effortPct * activeDiscount
    const discountedRevenue = standardRevenue - discount
    const cost = r.days * r.dailyCost
    const gmPct = discountedRevenue === 0 ? 0 : (discountedRevenue - cost) / discountedRevenue
    const inputGmPct = standardRevenue === 0 ? 0 : (standardRevenue - cost) / standardRevenue
    const tgt = targetGm / 100
    const minRev = 1 - tgt === 0 ? 0 : cost / (1 - tgt)

    totalDiscountedRevenue += discountedRevenue
    totalCost += cost

    return {
      ...r,
      standardRevenue,
      effortPct,
      discount,
      discountedRevenue,
      cost,
      gmPct,
      inputGmPct,
      minRev,
    }
  })

  const actualGm =
    totalDiscountedRevenue === 0
      ? 0
      : (totalDiscountedRevenue - totalCost) / totalDiscountedRevenue

  const tgt = targetGm / 100
  const minPriceAtTarget = 1 - tgt === 0 ? 0 : totalCost / (1 - tgt)
  const maxDiscountAllowed = Math.max(0, totalStandardRevenue - minPriceAtTarget)
  const remainingHeadroom = Math.max(0, maxDiscountAllowed - activeDiscount)
  const grossProfit = totalDiscountedRevenue - totalCost

  const signal = gmSignal(actualGm, targetGm, reviewBand, approvalBand)

  const buildScenarioSignal = (revenue: number): GmSignal => {
    const gm = revenue === 0 ? 0 : (revenue - totalCost) / revenue
    return gmSignal(gm, targetGm, reviewBand, approvalBand)
  }

  const scenarios: GmScenario[] = [
    {
      name: 'No Discount',
      revenue: totalStandardRevenue,
      gm: totalStandardRevenue === 0 ? 0 : (totalStandardRevenue - totalCost) / totalStandardRevenue,
      discount: 0,
      signal: buildScenarioSignal(totalStandardRevenue),
    },
    {
      name: 'Current',
      revenue: totalDiscountedRevenue,
      gm: actualGm,
      discount: activeDiscount,
      signal,
    },
    {
      name: 'Max @ Target GM',
      revenue: totalStandardRevenue - maxDiscountAllowed,
      gm: tgt,
      discount: maxDiscountAllowed,
      signal: buildScenarioSignal(totalStandardRevenue - maxDiscountAllowed),
    },
  ]

  const adjustmentHint = buildAdjustmentHint(
    actualGm,
    targetGm,
    totalDiscountedRevenue,
    totalCost,
    activeDiscount,
    totalStandardRevenue
  )

  return {
    totalDays,
    totalStandardRevenue,
    totalDiscountedRevenue,
    activeDiscount,
    totalCost,
    grossProfit,
    actualGm,
    minPriceAtTarget,
    maxDiscountAllowed,
    remainingHeadroom,
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

export function clampPct(v: number): number {
  return clamp(v * 100, 0, 100)
}

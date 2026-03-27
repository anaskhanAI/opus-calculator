/**
 * Opus Pricing Engine — v1.2
 *
 * All formulas are pure functions with no side effects.
 * Every calculation traces back to a specific Excel cell in
 * "Opus Pricing Calculator v1.2" sheet.
 * Do not modify without cross-referencing the Excel formula documentation.
 */

import type {
  DetailedInputs,
  SimpleInputs,
  CalculatorOutputs,
  LineItem,
  DeploymentType,
} from './types'

// ─── RESOURCE TABLE (Excel columns Q–S) ──────────────────────────────────────
// R4=1 (AI Solution Architect), R5=1 (AI Implementation Engineer), R6=1 (PM)
// R7 = SUM(R4:R6) = 3
// S7 = 3 (same headcount when integrations present in v1.2)
// S9 = 5 (working days/week — introduced as variable in v1.2)
const R7 = 3   // headcount without integrations (Excel R7)
const S7 = 3   // headcount with integrations (Excel S7)
const S9 = 5   // working days per week (Excel S9)
const DAY_RATE = 125  // $125/hour = $1,000/day (Excel R8/S8)

// ─── INTEGRATION FACTOR TABLE (Excel columns U–W, rows 3–12) ─────────────────
// W3: Base integration weight
const W3 = 2.5

// W4–W6: Type weights (1. Type section)
const W4 = 1.0   // REST / JSON (Excel W4)
const W5 = 1.5   // SOAP / XML (Excel W5)
const W6 = 2.5   // Database / Proprietary (Excel W6)

// W7–W9: Status weights (2. Status section)
// NOTE: These are STATUS weights, not auth weights.
// W7=Library(0.2), W8=Modification(1.5), W9=NewIntegration(3.0)
const W7 = 0.2   // Part of existing Opus Library (Excel W7)
const W8 = 1.5   // Modification to existing (Excel W8)
const W9 = 3.0   // New Integration (Excel W9)

// W10–W12: Auth weights — present in factor table but NOT used in v1.2 formulas.
// Captured in inputs JSON for audit purposes only.
// const W10 = 1.0  // API Key / Basic
// const W11 = 1.5  // OAuth2
// const W12 = 3.0  // VPN / mTLS

// ─── DEPLOYMENT PRICING TABLE (Excel G8/H8 IFS formula) ──────────────────────
const DEPLOYMENT_PRICING: Record<
  DeploymentType,
  { price: number | 'On Demand'; weeks: number | 'On Demand' }
> = {
  'Multi Tenant - Opus Cloud - AWS':                    { price: 0,           weeks: 0 },
  'Multi Tenant - Opus Cloud - Azure':                  { price: 0,           weeks: 0 },
  'Single Tenant - Opus Cloud - AWS':                   { price: 70000,       weeks: 2 },
  'Single Tenant - Opus Cloud - Azure':                 { price: 70000,       weeks: 2 },
  'Single Tenant - Client Cloud - AWS':                 { price: 110000,      weeks: 3 },
  'Single Tenant - Client Cloud - Azure':               { price: 110000,      weeks: 3 },
  'Single Tenant - UAE Core42 Sovereign Cloud - Azure': { price: 110000,      weeks: 3 },
  'Single Tenant - Client On Premise':                  { price: 'On Demand', weeks: 'On Demand' },
}

// ─── WEEK LOOKUP TABLE (Excel L5:O22) ────────────────────────────────────────
// Shared by both Detailed and Simple calculators (H6/H25 formulas).
// Format: { count: floor_value, tier1: weeks, tier2: weeks }
// Tier 1 = Linear Automation (cols L:M), Tier 2 = Agentic AI (cols N:O)
// Values are exact — extracted directly from Excel cells.

const WEEK_LOOKUP_TABLE: { count: number; tier1: number; tier2: number }[] = [
  { count: 0,  tier1: 0,  tier2: 0  },  // L5/N5=0,  M5/O5=0
  { count: 1,  tier1: 3,  tier2: 4  },  // L6=1, M6=3, N6=1, O6=4
  { count: 2,  tier1: 4,  tier2: 6  },  // L7=2, M7=4, N7=2, O7=6
  { count: 5,  tier1: 5,  tier2: 7  },  // L8=5, M8=5, N8=4, O8=7  (Tier2 floor=4)
  { count: 8,  tier1: 6,  tier2: 8  },  // L9=8, M9=6, N9=6, O9=8  (Tier2 floor=6)
  { count: 11, tier1: 7,  tier2: 9  },  // L10=11,M10=7, N10=8, O10=9 (Tier2 floor=8)
  { count: 14, tier1: 8,  tier2: 10 },  // L11=14,M11=8, N11=10,O11=10 (Tier2 floor=10)
  { count: 17, tier1: 9,  tier2: 11 },  // L12=17,M12=9, N12=12,O12=11 (Tier2 floor=12)
  { count: 20, tier1: 10, tier2: 12 },  // L13=20,M13=10,N13=14,O13=12 (Tier2 floor=14)
  { count: 23, tier1: 11, tier2: 17 },  // L14=23,M14=11,N14=16,O14=17 (Tier2 floor=16)
  { count: 26, tier1: 12, tier2: 22 },  // L15=26,M15=12,N15=18,O15=22 (Tier2 floor=18)
  { count: 29, tier1: 13, tier2: 27 },  // L16=29,M16=13,N16=20,O16=27 (Tier2 floor=20)
  { count: 32, tier1: 14, tier2: 30 },  // L17=32,M17=14,N17=22,O17=30 (Tier2 floor=22)
  { count: 35, tier1: 15, tier2: 33 },  // L18=35,M18=15,N18=24,O18=33 (Tier2 floor=24)
  { count: 38, tier1: 16, tier2: 36 },  // L19=38,M19=16,N19=26,O19=36 (Tier2 floor=26)
  { count: 41, tier1: 17, tier2: 39 },  // L20=41,M20=17,N20=28,O20=39 (Tier2 floor=28)
  { count: 44, tier1: 18, tier2: 42 },  // L21=44,M21=18,N21=30,O21=42 (Tier2 floor=30)
  { count: 47, tier1: 19, tier2: 45 },  // L22=47,M22=19,N22=32,O22=45 (Tier2 floor=32)
]

// Tier 2 has different floor values than Tier 1 — requires a separate lookup table.
// Extracted from N5:O22 columns exactly.
const TIER2_LOOKUP: { count: number; weeks: number }[] = [
  { count: 0,  weeks: 0  },  // N5=0,  O5=0
  { count: 1,  weeks: 4  },  // N6=1,  O6=4
  { count: 2,  weeks: 6  },  // N7=2,  O7=6
  { count: 4,  weeks: 7  },  // N8=4,  O8=7
  { count: 6,  weeks: 8  },  // N9=6,  O9=8
  { count: 8,  weeks: 9  },  // N10=8, O10=9
  { count: 10, weeks: 10 },  // N11=10,O11=10
  { count: 12, weeks: 11 },  // N12=12,O12=11
  { count: 14, weeks: 12 },  // N13=14,O13=12
  { count: 16, weeks: 17 },  // N14=16,O14=17
  { count: 18, weeks: 22 },  // N15=18,O15=22
  { count: 20, weeks: 27 },  // N16=20,O16=27
  { count: 22, weeks: 30 },  // N17=22,O17=30
  { count: 24, weeks: 33 },  // N18=24,O18=33
  { count: 26, weeks: 36 },  // N19=26,O19=36
  { count: 28, weeks: 39 },  // N20=28,O20=39
  { count: 30, weeks: 42 },  // N21=30,O21=42
  { count: 32, weeks: 45 },  // N22=32,O22=45
]

const TIER1_LOOKUP: { count: number; weeks: number }[] = WEEK_LOOKUP_TABLE.map((r) => ({
  count: r.count,
  weeks: r.tier1,
}))

/**
 * VLOOKUP with approximate match (TRUE) — replicates Excel VLOOKUP(value, range, col, TRUE).
 * Finds the largest floor value <= input count and returns its associated weeks.
 * Returns 0 on error (IFERROR wrapper in H6/H25).
 */
function vlookup(count: number, table: { count: number; weeks: number }[]): number {
  let result = 0
  for (const row of table) {
    if (row.count <= count) {
      result = row.weeks
    } else {
      break
    }
  }
  return result
}

// ─── H6 / H25: DELIVERY WEEKS ────────────────────────────────────────────────
// Excel: =IFERROR(SUM(VLOOKUP(B6, L$5:M$22, 2, TRUE), VLOOKUP(C6, N$5:O$22, 2, TRUE)), 0)
function calcDeliveryWeeks(tier1: number, tier2: number): number {
  const t1Weeks = vlookup(tier1, TIER1_LOOKUP)
  const t2Weeks = vlookup(tier2, TIER2_LOOKUP)
  return t1Weeks + t2Weeks
}

// ─── I6: CORE HOURS (DETAILED) ───────────────────────────────────────────────
// Excel: =IF(H7>0, H6*S7*S9*8, H6*R7*40)
// v1.2 change: S9 (working days/week) now a variable; *8 converts days→hrs
function calcDetailedCoreHours(weeks: number, hasIntegrations: boolean): number {
  if (hasIntegrations) {
    return weeks * S7 * S9 * 8  // weeks × 3 people × 5 days × 8 hrs
  }
  return weeks * R7 * 40         // weeks × 3 people × 40 hrs
}

// ─── I25: CORE HOURS (SIMPLE) ────────────────────────────────────────────────
// Excel: =IF(H26>0, H25*S7*40, H25*R7*40)
// Simple mode always uses flat 40 hrs/week (unlike Detailed which uses S9*8)
function calcSimpleCoreHours(weeks: number, hasIntegrations: boolean): number {
  if (hasIntegrations) {
    return weeks * S7 * 40  // weeks × 3 people × 40 hrs
  }
  return weeks * R7 * 40    // weeks × 3 people × 40 hrs
}

// ─── CORE IMPLEMENTATION ─────────────────────────────────────────────────────
// Detailed: G6, H6, I6, J6
// Simple:   G25, H25, I25, J25

function calcCoreImplementation(
  tier1: number,
  tier2: number,
  hasIntegrations: boolean,
  mode: 'detailed' | 'simple'
): LineItem {
  const weeks = calcDeliveryWeeks(tier1, tier2)  // H6 / H25

  if (weeks === 0) {
    return { listPrice: 0, weeks: 0, hours: 0, fte: '-' }
  }

  const hours =
    mode === 'detailed'
      ? calcDetailedCoreHours(weeks, hasIntegrations)   // I6
      : calcSimpleCoreHours(weeks, hasIntegrations)      // I25

  const listPrice = hours * DAY_RATE                     // G6 / G25 = I6*125
  const fte = hours / 40 / weeks                         // J6 / J25 = IFERROR(I6/40/H6, "-")

  return { listPrice, weeks, hours, fte }
}

// ─── H7: INTEGRATION WEEKS (DETAILED) ────────────────────────────────────────
// Excel: =SUM(W3*B9*W4*W7, W3*B10*W4*W8, W3*B11*W4*W9,
//             W3*C9*W5*W7, W3*C10*W5*W8, W3*C11*W5*W9,
//             W3*D9*W6*W7, W3*D10*W6*W8, W3*D11*W6*W9) / 5
// W7/W8/W9 = STATUS weights (0.2/1.5/3.0), NOT auth weights.
function calcDetailedIntegrationWeeks(
  grid: DetailedInputs['integrations']
): number {
  const {
    restLibrary, restModification, restNew,
    soapLibrary, soapModification, soapNew,
    dbLibrary,   dbModification,   dbNew,
  } = grid

  const total =
    W3 * restLibrary     * W4 * W7 +
    W3 * restModification * W4 * W8 +
    W3 * restNew          * W4 * W9 +
    W3 * soapLibrary      * W5 * W7 +
    W3 * soapModification * W5 * W8 +
    W3 * soapNew          * W5 * W9 +
    W3 * dbLibrary        * W6 * W7 +
    W3 * dbModification   * W6 * W8 +
    W3 * dbNew            * W6 * W9

  return total / 5
}

// ─── G7, I7, J7: INTEGRATION LINE ITEM (DETAILED) ───────────────────────────
// J7: =IFS(H7=0,"-",TRUE,2)  — fixed at 2 FTE when integrations exist (v1.2)
// I7: =IF(H7>0, H7*J7*40, 0)
// G7: =I7*125
function calcDetailedIntegrations(grid: DetailedInputs['integrations']): LineItem {
  const weeks = calcDetailedIntegrationWeeks(grid)  // H7

  if (weeks === 0) {
    return { listPrice: 0, weeks: 0, hours: 0, fte: '-' }
  }

  const fte = 2                          // J7: fixed at 2 in v1.2
  const hours = weeks * fte * 40         // I7
  const listPrice = hours * DAY_RATE     // G7

  return { listPrice, weeks, hours, fte }
}

// ─── H26: INTEGRATION WEEKS (SIMPLE) ─────────────────────────────────────────
// Excel: =IFERROR(O28*C25*(1-0.1*LN(C25)),0) + IFERROR(M28*B25*(1-0.1*LN(B25)),0)
// M28=1 (standard base weeks), O28=4 (custom base weeks) — from Simple integration lookup table
const M28 = 1  // Standard: Modern API base weeks (Excel M28)
const O28 = 4  // Custom: High-Code Build base weeks (Excel O28)

function calcSimpleIntegrationWeeks(standard: number, custom: number): number {
  let weeks = 0

  // IFERROR(M28*B25*(1-0.1*LN(B25)),0) — standard APIs
  if (standard > 0) {
    weeks += M28 * standard * (1 - 0.1 * Math.log(standard))
  }

  // IFERROR(O28*C25*(1-0.1*LN(C25)),0) — custom integrations
  if (custom > 0) {
    weeks += O28 * custom * (1 - 0.1 * Math.log(custom))
  }

  return Math.max(0, weeks)
}

// ─── G26, I26, J26: INTEGRATION LINE ITEM (SIMPLE) ───────────────────────────
// J26: =IF((SUM(C25,B25)>0),2,0)
// I26: =IF(H26>0, H26*J26*40, 0)
// G26: =I26*125
function calcSimpleIntegrations(standard: number, custom: number): LineItem {
  const weeks = calcSimpleIntegrationWeeks(standard, custom)  // H26

  if (weeks === 0) {
    return { listPrice: 0, weeks: 0, hours: 0, fte: 0 }
  }

  const fte = standard + custom > 0 ? 2 : 0   // J26
  const hours = weeks * fte * 40               // I26
  const listPrice = hours * DAY_RATE           // G26

  return { listPrice, weeks, hours, fte }
}

// ─── G8/G27, H8/H27, I8/I27, J8/J27: DEPLOYMENT ─────────────────────────────
// G8: IFS lookup against deployment type
// H8: IFS lookup against deployment type
// I8: =IFERROR(H8*(40+20),"On Demand")  — 60 hrs/week (40 standard + 20 overhead)
// J8: =IFERROR(I8/40/H8,"-")
function calcDeployment(deployment: DeploymentType): LineItem {
  const { price, weeks } = DEPLOYMENT_PRICING[deployment]

  if (price === 'On Demand' || weeks === 'On Demand') {
    return { listPrice: 'On Demand', weeks: 'On Demand', hours: 'On Demand', fte: '-' }
  }

  if (weeks === 0) {
    return { listPrice: 0, weeks: 0, hours: 0, fte: '-' }
  }

  const hours = weeks * (40 + 20)                                  // I8: weeks × 60
  const fte = Math.round((hours / 40 / weeks) * 10) / 10           // J8
  return { listPrice: price, weeks, hours, fte }
}

// ─── G9/G28, H9/H28, I9/I28, J9/J28: TRAINING ───────────────────────────────
// G9: =IF(A15="Yes",20000,0)
// H9: =IF(A15="Yes",1,0)
// I9: =H9*(40+20)  — 60 hrs/week (40 standard + 20 overhead)
// J9: =IFERROR(I9/40/H9,"-")
function calcTraining(training: boolean): LineItem {
  if (!training) {
    return { listPrice: 0, weeks: 0, hours: 0, fte: '-' }
  }

  const weeks = 1
  const listPrice = 20000
  const hours = weeks * (40 + 20)                         // I9
  const fte = Math.round((hours / 40 / weeks) * 10) / 10  // J9

  return { listPrice, weeks, hours, fte }
}

// ─── G10/G29, H10/H29, I10/I29, J10/J29: COMPLEXITY FACTOR ──────────────────
// G10: =B16*SUM(G6,G7)
// I10: =G10/125
// H10: =IFERROR(I10/40/J10,0)
// J10: =IFS(B16=0,"-",TRUE,J6)  — same FTE as core if factor > 0
function calcComplexityFactor(
  factor: number,
  corePrice: number,
  integrationPrice: number,
  coreFte: number | string
): LineItem {
  if (factor === 0) {
    return { listPrice: 0, weeks: 0, hours: 0, fte: '-' }
  }

  const listPrice = factor * (corePrice + integrationPrice)  // G10
  const hours = listPrice / DAY_RATE                          // I10
  const fte = coreFte                                         // J10 = J6

  let weeks = 0
  if (typeof fte === 'number' && fte > 0) {
    weeks = hours / 40 / fte                                  // H10 = I10/40/J10
  }

  return { listPrice, weeks, hours, fte }
}

// ─── TOTAL ROW ────────────────────────────────────────────────────────────────
// G11: =SUM(G6:G10), H11: =SUM(H6:H10), I11: =SUM(I6:I10)
// Returns 'On Demand' if any line item is 'On Demand'
function sumLineItems(items: LineItem[]): {
  listPrice: number | 'On Demand'
  weeks: number | 'On Demand'
  hours: number | 'On Demand'
} {
  const hasOnDemand = items.some(
    (i) => i.listPrice === 'On Demand' || i.weeks === 'On Demand'
  )

  if (hasOnDemand) {
    return { listPrice: 'On Demand', weeks: 'On Demand', hours: 'On Demand' }
  }

  return {
    listPrice: items.reduce(
      (sum, i) => sum + (typeof i.listPrice === 'number' ? i.listPrice : 0),
      0
    ),
    weeks: items.reduce(
      (sum, i) => sum + (typeof i.weeks === 'number' ? i.weeks : 0),
      0
    ),
    hours: items.reduce(
      (sum, i) => sum + (typeof i.hours === 'number' ? i.hours : 0),
      0
    ),
  }
}

// ─── PUBLIC: calculateDetailed ────────────────────────────────────────────────
export function calculateDetailed(inputs: DetailedInputs): CalculatorOutputs {
  const integrationWeeks = calcDetailedIntegrationWeeks(inputs.integrations)
  const hasIntegrations = integrationWeeks > 0

  const core = calcCoreImplementation(
    inputs.tier1UseCases,
    inputs.tier2UseCases,
    hasIntegrations,
    'detailed'
  )
  const integrations = calcDetailedIntegrations(inputs.integrations)
  const deployment = calcDeployment(inputs.deployment)
  const training = calcTraining(inputs.training)
  const complexity = calcComplexityFactor(
    inputs.complexityFactor,
    typeof core.listPrice === 'number' ? core.listPrice : 0,
    typeof integrations.listPrice === 'number' ? integrations.listPrice : 0,
    core.fte
  )

  const projectTotal = sumLineItems([core, integrations, deployment, training, complexity])

  return { coreImplementation: core, integrations, deployment, training, complexityFactor: complexity, projectTotal }
}

// ─── PUBLIC: calculateSimple ──────────────────────────────────────────────────
export function calculateSimple(inputs: SimpleInputs): CalculatorOutputs {
  const integrationWeeks = calcSimpleIntegrationWeeks(
    inputs.standardApiIntegrations,
    inputs.customIntegrations
  )
  const hasIntegrations = integrationWeeks > 0

  const core = calcCoreImplementation(
    inputs.tier1UseCases,
    inputs.tier2UseCases,
    hasIntegrations,
    'simple'
  )
  const integrations = calcSimpleIntegrations(
    inputs.standardApiIntegrations,
    inputs.customIntegrations
  )
  const deployment = calcDeployment(inputs.deployment)
  const training = calcTraining(inputs.training)
  const complexity = calcComplexityFactor(
    inputs.complexityFactor,
    typeof core.listPrice === 'number' ? core.listPrice : 0,
    typeof integrations.listPrice === 'number' ? integrations.listPrice : 0,
    core.fte
  )

  const projectTotal = sumLineItems([core, integrations, deployment, training, complexity])

  return { coreImplementation: core, integrations, deployment, training, complexityFactor: complexity, projectTotal }
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────
export function formatPrice(value: number | 'On Demand'): string {
  if (value === 'On Demand') return 'On Demand'
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function formatWeeks(value: number | 'On Demand'): string {
  if (value === 'On Demand') return 'On Demand'
  return Math.ceil(value).toString()
}

export function formatHours(value: number | 'On Demand'): string {
  if (value === 'On Demand') return 'On Demand'
  return Math.ceil(value).toString()
}

export function formatFte(value: number | string): string {
  if (value === '-') return '—'
  if (typeof value === 'number') {
    return value % 1 === 0 ? value.toString() : value.toFixed(1)
  }
  return value
}

export const DEFAULT_DEPLOYMENT: import('./types').DeploymentType =
  'Single Tenant - Opus Cloud - AWS'

export const DEPLOYMENT_OPTIONS: import('./types').DeploymentType[] = [
  'Multi Tenant - Opus Cloud - AWS',
  'Single Tenant - Opus Cloud - AWS',
  'Single Tenant - Opus Cloud - Azure',
  'Single Tenant - Client Cloud - AWS',
  'Single Tenant - Client Cloud - Azure',
  'Single Tenant - UAE Core42 Sovereign Cloud - Azure',
  'Single Tenant - Client On Premise',
]

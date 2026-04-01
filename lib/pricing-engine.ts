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
  PricingConfig,
  WeekLookupRow,
  Tier2LookupRow,
  DeploymentOption,
} from './types'

// ─── DEFAULT PRICING CONFIG ───────────────────────────────────────────────────
// Exact values from the v1.2 Excel sheet. Used as fallback when no DB config
// is present, and as the "Reset to defaults" source in the admin panel.

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  dayRate: 125,
  coreHeadcount: 3,
  intHeadcount: 3,
  workingDaysPerWeek: 5,
  integrationFte: 2,
  deploymentHoursPerWeek: 60,
  trainingListPrice: 20000,
  trainingWeeks: 1,
  w3BaseWeight: 2.5,
  w4Rest: 1.0,
  w5Soap: 1.5,
  w6Db: 2.5,
  w7Library: 0.2,
  w8Modification: 1.5,
  w9New: 3.0,
  m28StandardBase: 1,
  o28CustomBase: 4,
  deploymentOptions: [
    { name: 'Multi Tenant - Opus Cloud - (For POVs only)',        price: 0,           weeks: 0 },
    { name: 'Multi Tenant - Opus Cloud - Azure',                  price: 0,           weeks: 0 },
    { name: 'Single Tenant - Opus Cloud - AWS',                   price: 70000,       weeks: 2 },
    { name: 'Single Tenant - Opus Cloud - Azure',                 price: 70000,       weeks: 2 },
    { name: 'Single Tenant - Client Cloud - AWS',                 price: 110000,      weeks: 3 },
    { name: 'Single Tenant - Client Cloud - Azure',               price: 110000,      weeks: 3 },
    { name: 'Single Tenant - UAE Core42 Sovereign Cloud - Azure', price: 110000,      weeks: 3 },
    { name: 'Single Tenant - Client On Premise',                  price: 'On Demand', weeks: 'On Demand' },
  ],
  weekLookupTable: [
    { count: 0,  tier1: 0,  tier2: 0  },
    { count: 1,  tier1: 3,  tier2: 4  },
    { count: 2,  tier1: 4,  tier2: 6  },
    { count: 5,  tier1: 5,  tier2: 7  },
    { count: 8,  tier1: 6,  tier2: 8  },
    { count: 11, tier1: 7,  tier2: 9  },
    { count: 14, tier1: 8,  tier2: 10 },
    { count: 17, tier1: 9,  tier2: 11 },
    { count: 20, tier1: 10, tier2: 12 },
    { count: 23, tier1: 11, tier2: 17 },
    { count: 26, tier1: 12, tier2: 22 },
    { count: 29, tier1: 13, tier2: 27 },
    { count: 32, tier1: 14, tier2: 30 },
    { count: 35, tier1: 15, tier2: 33 },
    { count: 38, tier1: 16, tier2: 36 },
    { count: 41, tier1: 17, tier2: 39 },
    { count: 44, tier1: 18, tier2: 42 },
    { count: 47, tier1: 19, tier2: 45 },
  ],
  tier2Lookup: [
    { count: 0,  weeks: 0  },
    { count: 1,  weeks: 4  },
    { count: 2,  weeks: 6  },
    { count: 4,  weeks: 7  },
    { count: 6,  weeks: 8  },
    { count: 8,  weeks: 9  },
    { count: 10, weeks: 10 },
    { count: 12, weeks: 11 },
    { count: 14, weeks: 12 },
    { count: 16, weeks: 17 },
    { count: 18, weeks: 22 },
    { count: 20, weeks: 27 },
    { count: 22, weeks: 30 },
    { count: 24, weeks: 33 },
    { count: 26, weeks: 36 },
    { count: 28, weeks: 39 },
    { count: 30, weeks: 42 },
    { count: 32, weeks: 45 },
  ],
}

// Merges a partial DB config over the defaults so missing fields always fall back
export function resolvePricingConfig(partial: Partial<PricingConfig> | null | undefined): PricingConfig {
  if (!partial) return DEFAULT_PRICING_CONFIG
  return { ...DEFAULT_PRICING_CONFIG, ...partial }
}

// ─── INTERNAL HELPERS ─────────────────────────────────────────────────────────

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

function tier1Lookup(weekLookupTable: WeekLookupRow[]): { count: number; weeks: number }[] {
  return weekLookupTable.map((r) => ({ count: r.count, weeks: r.tier1 }))
}

// ─── H6 / H25: DELIVERY WEEKS ────────────────────────────────────────────────
function calcDeliveryWeeks(
  tier1: number,
  tier2: number,
  cfg: PricingConfig
): number {
  const t1Weeks = vlookup(tier1, tier1Lookup(cfg.weekLookupTable))
  const t2Weeks = vlookup(tier2, cfg.tier2Lookup)
  return t1Weeks + t2Weeks
}

// ─── I6: CORE HOURS (DETAILED) ───────────────────────────────────────────────
function calcDetailedCoreHours(weeks: number, hasIntegrations: boolean, cfg: PricingConfig): number {
  if (hasIntegrations) {
    return weeks * cfg.intHeadcount * cfg.workingDaysPerWeek * 8
  }
  return weeks * cfg.coreHeadcount * 40
}

// ─── I25: CORE HOURS (SIMPLE) ────────────────────────────────────────────────
function calcSimpleCoreHours(weeks: number, hasIntegrations: boolean, cfg: PricingConfig): number {
  if (hasIntegrations) {
    return weeks * cfg.intHeadcount * 40
  }
  return weeks * cfg.coreHeadcount * 40
}

// ─── CORE IMPLEMENTATION ─────────────────────────────────────────────────────
function calcCoreImplementation(
  tier1: number,
  tier2: number,
  hasIntegrations: boolean,
  mode: 'detailed' | 'simple',
  cfg: PricingConfig
): LineItem {
  const weeks = calcDeliveryWeeks(tier1, tier2, cfg)

  if (weeks === 0) {
    return { listPrice: 0, weeks: 0, hours: 0, fte: '-' }
  }

  const hours =
    mode === 'detailed'
      ? calcDetailedCoreHours(weeks, hasIntegrations, cfg)
      : calcSimpleCoreHours(weeks, hasIntegrations, cfg)

  const listPrice = hours * cfg.dayRate
  const fte = hours / 40 / weeks

  return { listPrice, weeks, hours, fte }
}

// ─── H7: INTEGRATION WEEKS (DETAILED) ────────────────────────────────────────
function calcDetailedIntegrationWeeks(
  grid: DetailedInputs['integrations'],
  cfg: PricingConfig
): number {
  const {
    restLibrary, restModification, restNew,
    soapLibrary, soapModification, soapNew,
    dbLibrary,   dbModification,   dbNew,
  } = grid

  const total =
    cfg.w3BaseWeight * restLibrary      * cfg.w4Rest * cfg.w7Library     +
    cfg.w3BaseWeight * restModification * cfg.w4Rest * cfg.w8Modification +
    cfg.w3BaseWeight * restNew          * cfg.w4Rest * cfg.w9New          +
    cfg.w3BaseWeight * soapLibrary      * cfg.w5Soap * cfg.w7Library      +
    cfg.w3BaseWeight * soapModification * cfg.w5Soap * cfg.w8Modification +
    cfg.w3BaseWeight * soapNew          * cfg.w5Soap * cfg.w9New          +
    cfg.w3BaseWeight * dbLibrary        * cfg.w6Db   * cfg.w7Library      +
    cfg.w3BaseWeight * dbModification   * cfg.w6Db   * cfg.w8Modification +
    cfg.w3BaseWeight * dbNew            * cfg.w6Db   * cfg.w9New

  return total / 5
}

// ─── G7, I7, J7: INTEGRATION LINE ITEM (DETAILED) ───────────────────────────
function calcDetailedIntegrations(
  grid: DetailedInputs['integrations'],
  cfg: PricingConfig
): LineItem {
  const weeks = calcDetailedIntegrationWeeks(grid, cfg)

  if (weeks === 0) {
    return { listPrice: 0, weeks: 0, hours: 0, fte: '-' }
  }

  const fte = cfg.integrationFte
  const hours = weeks * fte * 40
  const listPrice = hours * cfg.dayRate

  return { listPrice, weeks, hours, fte }
}

// ─── H26: INTEGRATION WEEKS (SIMPLE) ─────────────────────────────────────────
function calcSimpleIntegrationWeeks(
  standard: number,
  custom: number,
  cfg: PricingConfig
): number {
  let weeks = 0

  if (standard > 0) {
    weeks += cfg.m28StandardBase * standard * (1 - 0.1 * Math.log(standard))
  }

  if (custom > 0) {
    weeks += cfg.o28CustomBase * custom * (1 - 0.1 * Math.log(custom))
  }

  return Math.max(0, weeks)
}

// ─── G26, I26, J26: INTEGRATION LINE ITEM (SIMPLE) ───────────────────────────
function calcSimpleIntegrations(
  standard: number,
  custom: number,
  cfg: PricingConfig
): LineItem {
  const weeks = calcSimpleIntegrationWeeks(standard, custom, cfg)

  if (weeks === 0) {
    return { listPrice: 0, weeks: 0, hours: 0, fte: 0 }
  }

  const fte = standard + custom > 0 ? cfg.integrationFte : 0
  const hours = weeks * fte * 40
  const listPrice = hours * cfg.dayRate

  return { listPrice, weeks, hours, fte }
}

// ─── G8/G27, H8/H27, I8/I27, J8/J27: DEPLOYMENT ─────────────────────────────
function calcDeployment(deployment: DeploymentType, cfg: PricingConfig): LineItem {
  const option: DeploymentOption | undefined = cfg.deploymentOptions.find(
    (o) => o.name === deployment
  )

  // Fall back to On Demand if the deployment type isn't found in config
  const price = option?.price ?? 'On Demand'
  const weeks = option?.weeks ?? 'On Demand'

  if (price === 'On Demand' || weeks === 'On Demand') {
    return { listPrice: 'On Demand', weeks: 'On Demand', hours: 'On Demand', fte: '-' }
  }

  if (weeks === 0) {
    return { listPrice: 0, weeks: 0, hours: 0, fte: '-' }
  }

  const hours = weeks * cfg.deploymentHoursPerWeek
  const fte = Math.round((hours / 40 / weeks) * 10) / 10
  return { listPrice: price, weeks, hours, fte }
}

// ─── G9/G28, H9/H28, I9/I28, J9/J28: TRAINING ───────────────────────────────
function calcTraining(training: boolean, cfg: PricingConfig): LineItem {
  if (!training) {
    return { listPrice: 0, weeks: 0, hours: 0, fte: '-' }
  }

  const weeks = cfg.trainingWeeks
  const listPrice = cfg.trainingListPrice
  const hours = weeks * cfg.deploymentHoursPerWeek
  const fte = Math.round((hours / 40 / weeks) * 10) / 10

  return { listPrice, weeks, hours, fte }
}

// ─── G10/G29, H10/H29, I10/I29, J10/J29: COMPLEXITY FACTOR ──────────────────
function calcComplexityFactor(
  factor: number,
  corePrice: number,
  integrationPrice: number,
  coreFte: number | string,
  cfg: PricingConfig
): LineItem {
  if (factor === 0) {
    return { listPrice: 0, weeks: 0, hours: 0, fte: '-' }
  }

  const listPrice = factor * (corePrice + integrationPrice)
  const hours = listPrice / cfg.dayRate
  const fte = coreFte

  let weeks = 0
  if (typeof fte === 'number' && fte > 0) {
    weeks = hours / 40 / fte
  }

  return { listPrice, weeks, hours, fte }
}

// ─── TOTAL ROW ────────────────────────────────────────────────────────────────
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
export function calculateDetailed(
  inputs: DetailedInputs,
  config?: PricingConfig | null
): CalculatorOutputs {
  const cfg = resolvePricingConfig(config)

  const integrationWeeks = calcDetailedIntegrationWeeks(inputs.integrations, cfg)
  const hasIntegrations = integrationWeeks > 0

  const core = calcCoreImplementation(inputs.tier1UseCases, inputs.tier2UseCases, hasIntegrations, 'detailed', cfg)
  const integrations = calcDetailedIntegrations(inputs.integrations, cfg)
  const deployment = calcDeployment(inputs.deployment, cfg)
  const training = calcTraining(inputs.training, cfg)
  const complexity = calcComplexityFactor(
    inputs.complexityFactor,
    typeof core.listPrice === 'number' ? core.listPrice : 0,
    typeof integrations.listPrice === 'number' ? integrations.listPrice : 0,
    core.fte,
    cfg
  )

  const projectTotal = sumLineItems([core, integrations, deployment, training, complexity])

  return { coreImplementation: core, integrations, deployment, training, complexityFactor: complexity, projectTotal }
}

// ─── PUBLIC: calculateSimple ──────────────────────────────────────────────────
export function calculateSimple(
  inputs: SimpleInputs,
  config?: PricingConfig | null
): CalculatorOutputs {
  const cfg = resolvePricingConfig(config)

  const integrationWeeks = calcSimpleIntegrationWeeks(
    inputs.standardApiIntegrations,
    inputs.customIntegrations,
    cfg
  )
  const hasIntegrations = integrationWeeks > 0

  const core = calcCoreImplementation(inputs.tier1UseCases, inputs.tier2UseCases, hasIntegrations, 'simple', cfg)
  const integrations = calcSimpleIntegrations(inputs.standardApiIntegrations, inputs.customIntegrations, cfg)
  const deployment = calcDeployment(inputs.deployment, cfg)
  const training = calcTraining(inputs.training, cfg)
  const complexity = calcComplexityFactor(
    inputs.complexityFactor,
    typeof core.listPrice === 'number' ? core.listPrice : 0,
    typeof integrations.listPrice === 'number' ? integrations.listPrice : 0,
    core.fte,
    cfg
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

export const DEFAULT_DEPLOYMENT: DeploymentType = 'Single Tenant - Opus Cloud - AWS'

export const DEPLOYMENT_OPTIONS: DeploymentType[] = [
  'Multi Tenant - Opus Cloud - (For POVs only)',
  'Single Tenant - Opus Cloud - AWS',
  'Single Tenant - Opus Cloud - Azure',
  'Single Tenant - Client Cloud - AWS',
  'Single Tenant - Client Cloud - Azure',
  'Single Tenant - UAE Core42 Sovereign Cloud - Azure',
  'Single Tenant - Client On Premise',
]

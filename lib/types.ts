export type CalculatorMode = 'detailed' | 'simple'

export type DeploymentType =
  | 'Multi Tenant - Opus Cloud - (For POVs only)'
  | 'Multi Tenant - Opus Cloud - Azure'
  | 'Single Tenant - Opus Cloud - AWS'
  | 'Single Tenant - Opus Cloud - Azure'
  | 'Single Tenant - Client Cloud - AWS'
  | 'Single Tenant - Client Cloud - Azure'
  | 'Single Tenant - Client On Premise'
  | 'Single Tenant - UAE Core42 Sovereign Cloud - Azure'

export type IntegrationType = 'REST/JSON' | 'SOAP/XML' | 'Database/Proprietary'
export type IntegrationStatus = 'Existing Opus Library' | 'Modification' | 'New Integration'
export type AuthMethod = 'API Key / Basic' | 'OAuth2' | 'VPN / mTLS'

/**
 * Detailed mode integration grid — matches Excel layout exactly.
 * Rows = Status (Library, Modification, New), Columns = Type (REST/JSON, SOAP/XML, DB/Proprietary)
 * Each value is the count of integrations with that type+status combination.
 * Auth method is captured per cell for audit purposes but is NOT part of the H7 formula.
 */
export interface DetailedIntegrationGrid {
  // REST/JSON column (Excel col B, rows 9-11)
  restLibrary: number         // B9
  restModification: number    // B10
  restNew: number             // B11
  // SOAP/XML column (Excel col C, rows 9-11)
  soapLibrary: number         // C9
  soapModification: number    // C10
  soapNew: number             // C11
  // Database/Proprietary column (Excel col D, rows 9-11)
  dbLibrary: number           // D9
  dbModification: number      // D10
  dbNew: number               // D11
  // Auth method per integration type — captured for audit context, not used in formula
  restAuth: AuthMethod
  soapAuth: AuthMethod
  dbAuth: AuthMethod
}

// Detailed calculator inputs
export interface DetailedInputs {
  tier1UseCases: number               // B6: Linear Automation count
  tier2UseCases: number               // C6: Agentic AI count
  integrations: DetailedIntegrationGrid  // Dimension B: 3x3 grid
  deployment: DeploymentType          // A13: Dimension C
  training: boolean                   // A15: Dimension D (Yes/No)
  complexityFactor: number            // B16: as decimal e.g. 0.4 for 40%
  requestedDiscount?: number          // Optional seller-applied discount in $
}

// Simple calculator inputs
export interface SimpleInputs {
  tier1UseCases: number               // B22
  tier2UseCases: number               // C22
  standardApiIntegrations: number     // B25: Standard Modern API count
  customIntegrations: number          // C25: Custom High-Code Build count
  deployment: DeploymentType          // A27: Dimension C
  training: boolean                   // A29: Dimension D
  complexityFactor: number            // B30: as decimal
  requestedDiscount?: number          // Optional seller-applied discount in $
}

// A single line item in the summary table
export interface LineItem {
  listPrice: number | 'On Demand'
  weeks: number | 'On Demand'
  hours: number | 'On Demand'
  fte: number | string                // string used for '-' cases
}

// Full calculator output — mirrors the Excel summary table (G:J rows 6-11 / 25-30)
export interface CalculatorOutputs {
  coreImplementation: LineItem        // Row 6 / 25
  integrations: LineItem              // Row 7 / 26
  deployment: LineItem                // Row 8 / 27
  training: LineItem                  // Row 9 / 28
  complexityFactor: LineItem          // Row 10 / 29
  projectTotal: {                     // Row 11 / 30
    listPrice: number | 'On Demand'
    weeks: number | 'On Demand'
    hours: number | 'On Demand'
  }
}

// Quote as stored in the database
export interface Quote {
  id: string
  quoteRef: string
  sellerId: string
  sellerName: string
  sellerEmail: string
  projectName: string
  clientName: string
  calculatorMode: CalculatorMode
  modelVersion: string
  inputs: DetailedInputs | SimpleInputs
  outputs: CalculatorOutputs
  totalPrice: number
  totalWeeks: number
  totalHours: number
  notes?: string
  status: 'draft' | 'submitted'
  createdAt: string
}

// User profile (extends Supabase auth.users)
export interface Profile {
  id: string
  email: string
  fullName: string | null
  role: 'seller' | 'admin'
  createdAt: string
}

// Admin filter params
export interface QuoteFilters {
  seller?: string
  dateFrom?: string
  dateTo?: string
  minPrice?: number
  maxPrice?: number
}

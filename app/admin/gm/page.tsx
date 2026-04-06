import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { DEFAULT_GM_CONFIG } from '@/lib/gm-engine'
import type { GmConfig, GmSavedScenario, Quote } from '@/lib/types'
import AdminNav from '@/components/admin/AdminNav'
import GmCalculatorClient from '@/components/admin/GmCalculatorClient'

// The subset of Quote data needed by GmCalculatorClient
export type GmQuote = Pick<
  Quote,
  'id' | 'quoteRef' | 'clientName' | 'projectName' | 'totalPrice' | 'totalHours' | 'createdAt' | 'inputs' | 'outputs'
>

async function fetchData(): Promise<{
  gmConfig: GmConfig
  savedScenarios: GmSavedScenario[]
  quotes: GmQuote[]
}> {
  try {
    const supabase = createServiceClient()

    const [configResult, scenariosResult, quotesResult] = await Promise.all([
      supabase.from('gm_config').select('config').eq('id', 1).single(),
      supabase.from('gm_scenarios').select('*').order('created_at', { ascending: false }),
      supabase
        .from('quotes')
        .select('id, quote_ref, client_name, project_name, total_price, total_hours, created_at, inputs, outputs')
        .order('created_at', { ascending: false }),
    ])

    const gmConfig: GmConfig = configResult.data
      ? {
          ...DEFAULT_GM_CONFIG,
          ...(configResult.data.config as Partial<GmConfig>),
          defaultRoles: (configResult.data.config as Partial<GmConfig>).defaultRoles ?? DEFAULT_GM_CONFIG.defaultRoles,
        }
      : DEFAULT_GM_CONFIG

    const savedScenarios: GmSavedScenario[] = (scenariosResult.data ?? []).map((r) => ({
      id: r.id as string,
      quoteId: r.quote_id as string | null,
      quoteRef: r.quote_ref as string | null,
      clientName: r.client_name as string | null,
      projectName: r.project_name as string | null,
      inputs: r.inputs as GmSavedScenario['inputs'],
      outputs: r.outputs as GmSavedScenario['outputs'],
      notes: r.notes as string | null,
      createdAt: r.created_at as string,
      createdBy: r.created_by as string | null,
    }))

    const quotes: GmQuote[] = (quotesResult.data ?? []).map((r) => ({
      id: r.id as string,
      quoteRef: r.quote_ref as string,
      clientName: r.client_name as string,
      projectName: r.project_name as string,
      totalPrice: r.total_price as number,
      totalHours: r.total_hours as number,
      createdAt: r.created_at as string,
      inputs: r.inputs as Quote['inputs'],
      outputs: r.outputs as Quote['outputs'],
    }))

    return { gmConfig, savedScenarios, quotes }
  } catch {
    return { gmConfig: DEFAULT_GM_CONFIG, savedScenarios: [], quotes: [] }
  }
}

export default async function AdminGmPage({
  searchParams,
}: {
  searchParams?: { quoteId?: string }
}) {
  const { gmConfig, savedScenarios, quotes } = await fetchData()

  const initialLinkedQuote = searchParams?.quoteId
    ? (quotes.find((q) => q.id === searchParams.quoteId) ?? null)
    : null

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 py-5">
      <div className="mb-3">
        <Link
          href="/calculator"
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2 transition-colors"
        >
          ← Back to Calculator
        </Link>
        <h1 className="text-lg font-bold text-gray-900">GM Discount Calculator</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Model discount scenarios and evaluate gross margin impact before approving a deal.
        </p>
      </div>

      <AdminNav active="gm" />

      <GmCalculatorClient
        gmConfig={gmConfig}
        initialScenarios={savedScenarios}
        quotes={quotes}
        initialLinkedQuote={initialLinkedQuote}
      />
    </div>
  )
}

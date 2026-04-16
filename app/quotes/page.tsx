import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Quote } from '@/lib/types'

function mapRow(row: Record<string, unknown>): Quote {
  return {
    id:             row.id as string,
    quoteRef:       row.quote_ref as string,
    sellerId:       row.seller_id as string,
    sellerName:     row.seller_name as string,
    sellerEmail:    row.seller_email as string,
    projectName:    row.project_name as string,
    clientName:     row.client_name as string,
    calculatorMode: row.calculator_mode as Quote['calculatorMode'],
    modelVersion:   row.model_version as string,
    inputs:         row.inputs as Quote['inputs'],
    outputs:        row.outputs as Quote['outputs'],
    totalPrice:     row.total_price as number,
    totalWeeks:     row.total_weeks as number,
    totalHours:     row.total_hours as number,
    notes:          row.notes as string | undefined,
    status:         row.status as Quote['status'],
    createdAt:      row.created_at as string,
  }
}

export default async function QuotesPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const { data: rows } = await supabase
    .from('quotes')
    .select('*')
    .eq('seller_id', session.user.id)
    .order('created_at', { ascending: false })

  const quotes: Quote[] = (rows ?? []).map(mapRow)

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 py-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link
            href="/calculator"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 mb-2 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Calculator
          </Link>
          <h1 className="text-lg font-bold text-gray-900">My Quotes</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {quotes.length} quote{quotes.length !== 1 ? 's' : ''} in your history
          </p>
        </div>
      </div>

      {quotes.length === 0 ? (
        <div className="border border-gray-200 bg-white px-6 py-16 text-center">
          <p className="text-sm text-gray-500">No quotes yet. Head to the calculator to generate your first quote.</p>
        </div>
      ) : (
        <QuoteListClient quotes={quotes} />
      )}
    </div>
  )
}

// Client island for interactivity (duplicate + re-download)
import QuoteListClient from './QuoteListClient'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import QuoteDetail from '@/components/quotes/QuoteDetail'
import type { Quote } from '@/lib/types'
import Link from 'next/link'

interface Props {
  params: { id: string }
}

export default async function QuoteDetailPage({ params }: Props) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const { data: row } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', params.id)
    .eq('seller_id', session.user.id)  // RLS also enforces this, but explicit is clearer
    .single()

  if (!row) notFound()

  const quote: Quote = {
    id:             row.id,
    quoteRef:       row.quote_ref,
    sellerId:       row.seller_id,
    sellerName:     row.seller_name,
    sellerEmail:    row.seller_email,
    projectName:    row.project_name,
    clientName:     row.client_name,
    calculatorMode: row.calculator_mode,
    modelVersion:   row.model_version,
    inputs:         row.inputs,
    outputs:        row.outputs,
    totalPrice:     row.total_price,
    totalWeeks:     row.total_weeks,
    totalHours:     row.total_hours,
    notes:          row.notes,
    status:         row.status,
    createdAt:      row.created_at,
  }

  return (
    <div className="mx-auto max-w-screen-lg px-4 sm:px-6 py-6">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/quotes" className="text-sm text-gray-500 hover:text-gray-700">
          ← My Quotes
        </Link>
      </div>
      <QuoteDetail quote={quote} />
    </div>
  )
}

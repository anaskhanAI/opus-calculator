import AdminDashboardClient from './AdminDashboardClient'
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

export default async function AdminPage() {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/quotes?admin=true`,
    { cache: 'no-store' }
  )

  let quotes: Quote[] = []
  if (response.ok) {
    const data = await response.json()
    quotes = (data.quotes ?? []).map(mapRow)
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 py-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Admin</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Quote Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">All quotes across all sellers</p>
        </div>
      </div>

      <AdminDashboardClient initialQuotes={quotes} />
    </div>
  )
}

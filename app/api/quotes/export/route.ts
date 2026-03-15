import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET /api/quotes/export — CSV export (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const serviceClient = createServiceClient()

    let query = serviceClient.from('quotes').select('*')

    const seller   = searchParams.get('seller')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo   = searchParams.get('dateTo')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')

    if (seller) {
      query = query.or(`seller_name.ilike.%${seller}%,seller_email.ilike.%${seller}%`)
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setDate(toDate.getDate() + 1)
      query = query.lt('created_at', toDate.toISOString())
    }
    if (minPrice) {
      query = query.gte('total_price', Number(minPrice))
    }
    if (maxPrice) {
      query = query.lte('total_price', Number(maxPrice))
    }

    const { data: quotes, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
    }

    // Build CSV
    const headers = [
      'Quote Ref',
      'Seller Name',
      'Seller Email',
      'Client Name',
      'Project Name',
      'Mode',
      'Model Version',
      'Total Price ($)',
      'Total Weeks',
      'Total Hours',
      'Deployment Type',
      'Training',
      'Complexity Factor (%)',
      'Status',
      'Created At',
    ]

    const escapeCsv = (val: unknown): string => {
      const str = val == null ? '' : String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const getDeployment = (inputs: Record<string, unknown>): string =>
      (inputs?.deployment as string) || ''

    const getTraining = (inputs: Record<string, unknown>): string =>
      inputs?.training ? 'Yes' : 'No'

    const getComplexity = (inputs: Record<string, unknown>): string => {
      const cf = inputs?.complexityFactor
      return cf != null ? String(Math.round((cf as number) * 100)) : '0'
    }

    const rows = (quotes ?? []).map((q) => {
      const inputs = (q.inputs || {}) as Record<string, unknown>
      return [
        q.quote_ref,
        q.seller_name,
        q.seller_email,
        q.client_name,
        q.project_name,
        q.calculator_mode,
        q.model_version,
        q.total_price ?? '',
        q.total_weeks ?? '',
        q.total_hours ?? '',
        getDeployment(inputs),
        getTraining(inputs),
        getComplexity(inputs),
        q.status,
        q.created_at,
      ].map(escapeCsv).join(',')
    })

    const csv = [headers.map(escapeCsv).join(','), ...rows].join('\r\n')

    const filename = `opus-quotes-export-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('GET /api/quotes/export error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST /api/quotes — save a new quote (seller only)
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      clientName,
      projectName,
      notes,
      calculatorMode,
      inputs,
      outputs,
      totalPrice,
      totalWeeks,
      totalHours,
    } = body

    if (!clientName || !projectName || !calculatorMode || !inputs || !outputs) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['detailed', 'simple'].includes(calculatorMode)) {
      return NextResponse.json({ error: 'Invalid calculator mode' }, { status: 400 })
    }

    // Fetch seller profile for denormalised fields
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', session.user.id)
      .single()

    const sellerName  = profile?.full_name || profile?.email || session.user.email || 'Unknown'
    const sellerEmail = profile?.email || session.user.email || 'Unknown'

    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        seller_id:       session.user.id,
        seller_name:     sellerName,
        seller_email:    sellerEmail,
        client_name:     clientName,
        project_name:    projectName,
        notes:           notes || null,
        calculator_mode: calculatorMode,
        model_version:   'v1.2',
        inputs,
        outputs,
        total_price:     totalPrice ?? null,
        total_weeks:     totalWeeks ?? null,
        total_hours:     totalHours ?? null,
        status:          'submitted',
      })
      .select()
      .single()

    if (error) {
      console.error('Quote insert error:', error)
      return NextResponse.json({ error: 'Failed to save quote' }, { status: 500 })
    }

    return NextResponse.json({ quote }, { status: 201 })
  } catch (err) {
    console.error('POST /api/quotes error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/quotes — list quotes
// Sellers see their own. Admins (via service role key) see all.
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const isAdminRequest = searchParams.get('admin') === 'true'

    // Check if this user is actually an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    let query
    if (isAdminRequest && isAdmin) {
      // Use service role client to bypass RLS for admin queries
      const serviceClient = createServiceClient()
      query = serviceClient.from('quotes').select('*')

      // Apply admin filters
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
        // Add one day to include the full dateTo day
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
    } else {
      // Sellers only see their own quotes (RLS also enforces this)
      query = supabase.from('quotes').select('*').eq('seller_id', session.user.id)
    }

    const { data: quotes, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('GET /api/quotes error:', error)
      return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
    }

    return NextResponse.json({ quotes: quotes ?? [] })
  } catch (err) {
    console.error('GET /api/quotes error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

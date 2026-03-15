import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET /api/quotes/[id] — fetch a single quote
// Sellers can only fetch their own; admins can fetch any.
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const isAdmin = profile?.role === 'admin'

    let data, error

    if (isAdmin) {
      // Admins can fetch any quote — use service role to bypass RLS
      const serviceClient = createServiceClient()
      ;({ data, error } = await serviceClient
        .from('quotes')
        .select('*')
        .eq('id', params.id)
        .single())
    } else {
      // Sellers can only fetch their own quotes (RLS enforces this too)
      ;({ data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', params.id)
        .eq('seller_id', session.user.id)
        .single())
    }

    if (error || !data) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    return NextResponse.json({ quote: data })
  } catch (err) {
    console.error('GET /api/quotes/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

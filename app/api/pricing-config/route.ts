import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { DEFAULT_PRICING_CONFIG } from '@/lib/pricing-engine'
import type { PricingConfig } from '@/lib/types'

// GET /api/pricing-config
// Returns the current pricing config. Falls back to DEFAULT_PRICING_CONFIG if
// no row exists in the DB. Accessible to any authenticated user.
export async function GET() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pricing_config')
      .select('config')
      .eq('id', 1)
      .single()

    if (error || !data) {
      return NextResponse.json(DEFAULT_PRICING_CONFIG)
    }

    // Merge DB config over defaults so any new fields added later have a value
    const merged: PricingConfig = { ...DEFAULT_PRICING_CONFIG, ...data.config }
    return NextResponse.json(merged)
  } catch {
    return NextResponse.json(DEFAULT_PRICING_CONFIG)
  }
}

// PUT /api/pricing-config
// Saves a new pricing config. Admin-only — verified server-side via profile role.
export async function PUT(request: Request) {
  try {
    // Auth check using the user's session
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

    const body = await request.json() as PricingConfig

    // Use service role to bypass RLS for the write
    const serviceClient = createServiceClient()
    const { error } = await serviceClient
      .from('pricing_config')
      .upsert({
        id: 1,
        config: body,
        updated_at: new Date().toISOString(),
        updated_by: session.user.email ?? session.user.id,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

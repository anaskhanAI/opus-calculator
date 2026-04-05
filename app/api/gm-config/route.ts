import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { DEFAULT_GM_CONFIG } from '@/lib/gm-engine'
import type { GmConfig } from '@/lib/types'

export async function GET() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('gm_config')
      .select('config')
      .eq('id', 1)
      .single()

    if (error || !data) return NextResponse.json(DEFAULT_GM_CONFIG)

    const merged: GmConfig = {
      ...DEFAULT_GM_CONFIG,
      ...data.config,
      defaultRoles: (data.config as Partial<GmConfig>).defaultRoles ?? DEFAULT_GM_CONFIG.defaultRoles,
    }
    return NextResponse.json(merged)
  } catch {
    return NextResponse.json(DEFAULT_GM_CONFIG)
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as GmConfig
    const serviceClient = createServiceClient()
    const { error } = await serviceClient.from('gm_config').upsert({
      id: 1,
      config: body,
      updated_at: new Date().toISOString(),
      updated_by: session.user.email ?? session.user.id,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return null
  return session
}

// GET /api/gm-scenarios — list all saved scenarios (admin)
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('gm_scenarios')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ scenarios: data ?? [] })
}

// POST /api/gm-scenarios — save a new scenario (admin)
export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('gm_scenarios')
    .insert({
      quote_id:     body.quoteId ?? null,
      quote_ref:    body.quoteRef ?? null,
      client_name:  body.clientName ?? null,
      project_name: body.projectName ?? null,
      inputs:       body.inputs,
      outputs:      body.outputs,
      notes:        body.notes ?? null,
      created_by:   session.user.email ?? session.user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ scenario: data }, { status: 201 })
}

// DELETE /api/gm-scenarios?id=<uuid> — delete a scenario (admin)
export async function DELETE(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const serviceClient = createServiceClient()
  const { error } = await serviceClient.from('gm_scenarios').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

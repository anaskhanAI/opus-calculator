import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  await supabase.auth.signOut()

  // Derive origin from the incoming request so this works on any domain
  // (localhost in dev, Vercel URL in production) without relying on env vars.
  const origin = new URL(request.url).origin
  return NextResponse.redirect(`${origin}/login`, { status: 303 })
}

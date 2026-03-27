import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Neutralises all dark-mode CSS and JS in the HTML so the pricing guide
 * always renders in light mode regardless of the visitor's system preference.
 */
function patchLightMode(html: string): string {
  // Disable all dark-mode media queries by targeting a media type no browser ever matches
  let patched = html.replaceAll(
    '@media (prefers-color-scheme: dark)',
    '@media (prefers-color-scheme: not-all)'
  )
  // Inject <meta name="color-scheme" content="light"> if not already present
  if (!patched.includes('color-scheme" content="light"')) {
    patched = patched.replace('<head>', '<head>\n  <meta name="color-scheme" content="light">')
  }
  return patched
}

// GET /api/pricing-guide — serves the current pricing guide as text/html
// The iframe in app/calculator/pricing-guide/page.tsx points here.
export async function GET() {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('pricing_guide_config')
      .select('html_content')
      .eq('id', 1)
      .single()

    let html: string

    if (data?.html_content) {
      html = data.html_content
    } else {
      // Fall back to the static file that ships with the repo
      const filePath = join(process.cwd(), 'public', 'pricing-guide.html')
      html = readFileSync(filePath, 'utf-8')
    }

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('GET /api/pricing-guide error:', err)
    return new NextResponse('Failed to load pricing guide', { status: 500 })
  }
}

// POST /api/pricing-guide — admin only; accepts a multipart upload of an HTML file,
// patches it for light-mode, and stores the content in pricing_guide_config.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.html')) {
      return NextResponse.json({ error: 'File must be an .html file' }, { status: 400 })
    }

    const rawHtml = await file.text()
    const patchedHtml = patchLightMode(rawHtml)

    const updatedBy =
      profile?.full_name || profile?.email || session.user.email || 'admin'

    const serviceClient = createServiceClient()
    const { error } = await serviceClient
      .from('pricing_guide_config')
      .upsert({
        id: 1,
        html_content: patchedHtml,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      })

    if (error) {
      console.error('pricing_guide_config upsert error:', error)
      return NextResponse.json({ error: 'Failed to save pricing guide' }, { status: 500 })
    }

    return NextResponse.json({ success: true, updatedBy })
  } catch (err) {
    console.error('POST /api/pricing-guide error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

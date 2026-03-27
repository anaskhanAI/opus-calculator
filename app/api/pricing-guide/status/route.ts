import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/pricing-guide/status — returns metadata about the current pricing guide.
// Used by the PricingGuideUpload admin component to display last-updated info.
export async function GET() {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('pricing_guide_config')
      .select('updated_at, updated_by, html_content')
      .eq('id', 1)
      .single()

    return NextResponse.json({
      hasCustomContent: !!(data?.html_content),
      updatedAt: data?.updated_at ?? null,
      updatedBy: data?.updated_by ?? null,
    })
  } catch (err) {
    console.error('GET /api/pricing-guide/status error:', err)
    return NextResponse.json({
      hasCustomContent: false,
      updatedAt: null,
      updatedBy: null,
    })
  }
}

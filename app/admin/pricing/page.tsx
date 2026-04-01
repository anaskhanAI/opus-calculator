import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { DEFAULT_PRICING_CONFIG } from '@/lib/pricing-engine'
import type { PricingConfig } from '@/lib/types'
import PricingConfigPanel from '@/components/admin/PricingConfigPanel'
import AdminNav from '@/components/admin/AdminNav'

async function fetchPricingConfig(): Promise<{ config: PricingConfig; updatedAt: string | null; updatedBy: string | null }> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('pricing_config')
      .select('config, updated_at, updated_by')
      .eq('id', 1)
      .single()

    if (error || !data) {
      return { config: DEFAULT_PRICING_CONFIG, updatedAt: null, updatedBy: null }
    }

    const merged: PricingConfig = { ...DEFAULT_PRICING_CONFIG, ...data.config }
    return {
      config: merged,
      updatedAt: data.updated_at as string | null,
      updatedBy: data.updated_by as string | null,
    }
  } catch {
    return { config: DEFAULT_PRICING_CONFIG, updatedAt: null, updatedBy: null }
  }
}

export default async function AdminPricingPage() {
  const { config, updatedAt, updatedBy } = await fetchPricingConfig()

  const lastSaved =
    updatedAt && updatedBy !== 'system'
      ? new Intl.DateTimeFormat('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(updatedAt)) + (updatedBy ? ` by ${updatedBy}` : '')
      : null

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 py-5">
      <div className="mb-3">
        <Link
          href="/calculator"
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2 transition-colors"
        >
          ← Back to Calculator
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Admin</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-lg font-bold text-gray-900 mt-0.5">Admin</h1>
        </div>
      </div>

      <AdminNav active="pricing" />

      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Pricing Configuration</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Edit calculator values. Changes take effect immediately for all sellers.
          </p>
        </div>
        {lastSaved && (
          <p className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">
            Last saved: {lastSaved}
          </p>
        )}
      </div>

      <PricingConfigPanel initialConfig={config} />
    </div>
  )
}

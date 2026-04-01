import { createClient } from '@/lib/supabase/server'
import { DEFAULT_PRICING_CONFIG } from '@/lib/pricing-engine'
import type { PricingConfig } from '@/lib/types'
import CalculatorClient from './CalculatorClient'

async function fetchPricingConfig(): Promise<PricingConfig> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pricing_config')
      .select('config')
      .eq('id', 1)
      .single()

    if (error || !data) return DEFAULT_PRICING_CONFIG

    return { ...DEFAULT_PRICING_CONFIG, ...data.config } as PricingConfig
  } catch {
    return DEFAULT_PRICING_CONFIG
  }
}

export default async function CalculatorPage() {
  const pricingConfig = await fetchPricingConfig()

  return <CalculatorClient pricingConfig={pricingConfig} />
}

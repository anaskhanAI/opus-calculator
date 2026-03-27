// Force dynamic rendering so every page load checks for the latest guide version.
export const dynamic = 'force-dynamic'

export default function PricingGuidePage() {
  // The iframe points to our own API route which serves the current HTML from the
  // database (if an admin has uploaded one) or falls back to the static file.
  // Same-origin means no X-Frame-Options issues; no-store ensures freshness.
  return (
    <iframe
      src="/api/pricing-guide"
      className="w-full border-0"
      style={{ height: 'calc(100vh - 48px)' }}
      title="Opus Pricing Guide"
    />
  )
}

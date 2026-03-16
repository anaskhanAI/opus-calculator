/**
 * Client-side PDF generation using jsPDF.
 * Produces a clean, client-facing delivery pricing quote.
 * Only import in browser context — never in Server Components or API routes.
 */

import type { CalculatorMode, DetailedInputs, SimpleInputs, CalculatorOutputs } from './types'
import { formatPrice, formatWeeks } from './pricing-engine'

export interface PdfQuoteData {
  quoteRef:    string
  sellerName:  string
  sellerEmail: string
  clientName:  string
  projectName: string
  mode:        CalculatorMode
  inputs:      DetailedInputs | SimpleInputs
  outputs:     CalculatorOutputs
  createdAt:   string
  notes?:      string
}

interface ScopeItem { label: string; value: string }

// ─── HELPERS ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function safe(val: unknown): string {
  return val == null ? '' : String(val)
}

/** Fetch the Opus logo and convert it to a base64 data URL for jsPDF. */
async function loadLogo(): Promise<string | null> {
  try {
    const res  = await fetch('/OpusLogo.png')
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Translate raw calculator inputs into client-friendly scope labels.
 * No internal terminology (Tier 1/2, REST/SOAP, FTE, auth methods, etc.).
 */
function buildScopeItems(data: PdfQuoteData): ScopeItem[] {
  const items: ScopeItem[] = []

  if (data.mode === 'detailed') {
    const d    = data.inputs as DetailedInputs
    const g    = d.integrations
    const useCases  = d.tier1UseCases + d.tier2UseCases
    const totalInts =
      g.restLibrary + g.restModification + g.restNew +
      g.soapLibrary + g.soapModification + g.soapNew +
      g.dbLibrary   + g.dbModification   + g.dbNew

    if (useCases > 0)  items.push({ label: 'AI Automation Use Cases',  value: String(useCases) })
    if (totalInts > 0) items.push({ label: 'System Integrations',       value: String(totalInts) })
    items.push({ label: 'Deployment Environment', value: safe(d.deployment) })
    items.push({ label: 'Training & Enablement',  value: d.training ? 'Included' : 'Not included' })
    if (d.complexityFactor > 0)
      items.push({ label: 'Scope Complexity',  value: `${Math.round(d.complexityFactor * 100)}% adjustment` })
  } else {
    const s = data.inputs as SimpleInputs
    const useCases  = s.tier1UseCases + s.tier2UseCases
    const totalInts = s.standardApiIntegrations + s.customIntegrations

    if (useCases > 0)  items.push({ label: 'AI Automation Use Cases',  value: String(useCases) })
    if (totalInts > 0) items.push({ label: 'System Integrations',       value: String(totalInts) })
    items.push({ label: 'Deployment Environment', value: safe(s.deployment) })
    items.push({ label: 'Training & Enablement',  value: s.training ? 'Included' : 'Not included' })
    if (s.complexityFactor > 0)
      items.push({ label: 'Scope Complexity',  value: `${Math.round(s.complexityFactor * 100)}% adjustment` })
  }

  return items
}

// ─── MAIN EXPORT ────────────────────────────────────────────────────────────

export async function generateQuotePDF(data: PdfQuoteData): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW  = 210
  const margin = 20
  const cW     = pageW - margin * 2   // 170 mm usable width
  let   y      = 0

  // ── PALETTE (matches Opus brand: clean black/grey, no indigo) ─────────────
  const INK    = [17,  24,  39]  as [number, number, number]  // near-black
  const BODY   = [55,  65,  81]  as [number, number, number]  // dark grey
  const MUTED  = [107, 114, 128] as [number, number, number]  // mid grey
  const SUBTLE = [156, 163, 175] as [number, number, number]  // light grey
  const RULE   = [229, 231, 235] as [number, number, number]  // divider
  const FILL   = [248, 249, 250] as [number, number, number]  // table header bg
  const WHITE  = [255, 255, 255] as [number, number, number]

  // ── LOGO ──────────────────────────────────────────────────────────────────
  const logoDataUrl = await loadLogo()
  y = 22

  if (logoDataUrl) {
    // Render at a fixed height; let jsPDF maintain width
    const imgProps = doc.getImageProperties(logoDataUrl)
    const logoH    = 10
    const logoW    = (imgProps.width / imgProps.height) * logoH
    doc.addImage(logoDataUrl, 'PNG', margin, y - logoH, logoW, logoH)
  } else {
    // Text fallback
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...INK)
    doc.text('OPUS', margin, y)
  }

  // Quote ref + date — top right
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(data.quoteRef,            pageW - margin, y - 6, { align: 'right' })
  doc.text(formatDate(data.createdAt), pageW - margin, y - 1, { align: 'right' })

  y += 5

  // ── RULE ──────────────────────────────────────────────────────────────────
  doc.setDrawColor(...RULE)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageW - margin, y)
  y += 9

  // ── QUOTE TITLE BLOCK ────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  doc.text('DELIVERY PRICING QUOTE', margin, y)
  y += 7

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...INK)
  // Truncate very long client names to avoid overflow
  const clientLabel = doc.splitTextToSize(safe(data.clientName), cW)[0] as string
  doc.text(clientLabel, margin, y)
  y += 9

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...BODY)
  doc.text(safe(data.projectName), margin, y)
  y += 6

  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(`Prepared by  ${safe(data.sellerName)}  ·  ${safe(data.sellerEmail)}`, margin, y)
  y += 11

  // ── RULE ──────────────────────────────────────────────────────────────────
  doc.setDrawColor(...RULE)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  y += 9

  // ── SCOPE OVERVIEW ───────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  doc.text('SCOPE OVERVIEW', margin, y)
  y += 7

  const scopeItems = buildScopeItems(data)
  const halfW      = cW / 2

  for (let i = 0; i < scopeItems.length; i += 2) {
    const left  = scopeItems[i]
    const right = scopeItems[i + 1]

    // Left item
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text(left.label.toUpperCase(), margin, y)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...INK)
    const leftLines = doc.splitTextToSize(left.value, halfW - 6)
    doc.text(leftLines, margin, y + 5)

    // Right item (if it exists)
    if (right) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...MUTED)
      doc.text(right.label.toUpperCase(), margin + halfW, y)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...INK)
      const rightLines = doc.splitTextToSize(right.value, halfW - 6)
      doc.text(rightLines, margin + halfW, y + 5)
    }

    // Row height: taller when values wrap
    const maxLines = Math.max(
      (leftLines as string[]).length,
      right ? (doc.splitTextToSize(right.value, halfW - 6) as string[]).length : 0
    )
    y += 5 + maxLines * 5 + 3
  }

  y += 3

  // ── NOTES ─────────────────────────────────────────────────────────────────
  if (data.notes) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text('NOTES', margin, y)
    y += 4

    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...BODY)
    const noteLines = doc.splitTextToSize(safe(data.notes), cW) as string[]
    doc.text(noteLines, margin, y)
    y += noteLines.length * 4.5 + 5
  }

  // ── RULE ──────────────────────────────────────────────────────────────────
  doc.setDrawColor(...RULE)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  y += 9

  // ── INVESTMENT SUMMARY TABLE ──────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  doc.text('INVESTMENT SUMMARY', margin, y)
  y += 6

  // Column x-positions (right-aligned)
  const PRICE_X = pageW - margin          // 190 mm
  const DUR_X   = pageW - margin - 32     // 158 mm

  // Table header background
  doc.setFillColor(...FILL)
  doc.rect(margin, y - 1, cW, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text('SERVICE',    margin + 3, y + 4)
  doc.text('DURATION',   DUR_X,      y + 4, { align: 'right' })
  doc.text('INVESTMENT', PRICE_X,    y + 4, { align: 'right' })
  y += 10

  const lineItems: { label: string; item: typeof data.outputs.coreImplementation }[] = [
    { label: 'Core Implementation',        item: data.outputs.coreImplementation },
    { label: 'System Integrations',         item: data.outputs.integrations },
    { label: 'Deployment & Infrastructure', item: data.outputs.deployment },
    { label: 'Training & Enablement',       item: data.outputs.training },
    { label: 'Scope Complexity Adjustment', item: data.outputs.complexityFactor },
  ]

  lineItems.forEach(({ label, item }) => {
    // Skip zero-value rows — clients only see what they're paying for
    const isZero = item.listPrice === 0 && item.weeks === 0 && item.hours === 0
    if (isZero) return

    const priceStr = item.listPrice === 'On Demand' ? 'On Request' : formatPrice(item.listPrice)
    const wksRaw   = item.weeks
    const durStr   = wksRaw === 'On Demand'
      ? 'On Request'
      : `${formatWeeks(wksRaw)} wk${Number(wksRaw) !== 1 ? 's' : ''}`

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...BODY)
    doc.text(label, margin + 3, y)

    doc.setTextColor(...MUTED)
    doc.setFontSize(8.5)
    doc.text(durStr, DUR_X, y, { align: 'right' })

    doc.setFont('helvetica', 'semibold')
    doc.setFontSize(9)
    doc.setTextColor(...INK)
    doc.text(priceStr, PRICE_X, y, { align: 'right' })

    doc.setDrawColor(...RULE)
    doc.setLineWidth(0.2)
    doc.line(margin, y + 3, pageW - margin, y + 3)
    y += 10
  })

  y += 2

  // ── TOTAL INVESTMENT BOX ──────────────────────────────────────────────────
  const totalIsOnDemand = data.outputs.projectTotal.listPrice === 'On Demand'
  const totalPriceStr   = totalIsOnDemand ? 'On Request' : formatPrice(data.outputs.projectTotal.listPrice)
  const totalWeeksNum   = data.outputs.projectTotal.weeks

  doc.setFillColor(...INK)
  doc.roundedRect(margin, y, cW, 16, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...WHITE)
  doc.text('TOTAL INVESTMENT', margin + 5, y + 7)

  doc.setFontSize(15)
  doc.text(totalPriceStr, PRICE_X, y + 7, { align: 'right' })

  if (typeof totalWeeksNum === 'number' && totalWeeksNum > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...SUBTLE)
    doc.text(
      `Estimated delivery: ${formatWeeks(totalWeeksNum)} weeks`,
      PRICE_X, y + 13, { align: 'right' }
    )
  }

  y += 22

  // ── TERMS NOTE ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  const termsLines = doc.splitTextToSize(
    'All investment figures are indicative list prices and subject to final scope confirmation. ' +
    'A detailed Statement of Work will be provided prior to project commencement.',
    cW
  ) as string[]
  doc.text(termsLines, margin, y)

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const footerY = 283
  doc.setDrawColor(...RULE)
  doc.setLineWidth(0.3)
  doc.line(margin, footerY, pageW - margin, footerY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...SUBTLE)
  doc.text(
    `Quote Reference: ${data.quoteRef}  ·  Prepared by Opus  ·  Valid for 30 days from ${formatDate(data.createdAt)}`,
    margin, footerY + 5
  )
  doc.text('opus.ai  ·  Confidential', pageW - margin, footerY + 5, { align: 'right' })

  // ── SAVE ──────────────────────────────────────────────────────────────────
  const clientSlug = data.clientName.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
  doc.save(`${data.quoteRef}-${clientSlug}.pdf`)
}

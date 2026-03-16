/**
 * Client-side PDF generation using jsPDF.
 * Clean, client-facing delivery pricing quote — Opus brand language.
 * Import only in browser context.
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

function buildScopeItems(data: PdfQuoteData): ScopeItem[] {
  const items: ScopeItem[] = []

  if (data.mode === 'detailed') {
    const d   = data.inputs as DetailedInputs
    const g   = d.integrations
    const uc  = d.tier1UseCases + d.tier2UseCases
    const int =
      g.restLibrary + g.restModification + g.restNew +
      g.soapLibrary + g.soapModification + g.soapNew +
      g.dbLibrary   + g.dbModification   + g.dbNew
    if (uc > 0)  items.push({ label: 'AI Automation Use Cases', value: String(uc) })
    if (int > 0) items.push({ label: 'System Integrations',      value: String(int) })
    items.push({ label: 'Deployment',         value: safe(d.deployment) })
    items.push({ label: 'Training Package',   value: d.training ? 'Included' : 'Not included' })
  } else {
    const s   = data.inputs as SimpleInputs
    const uc  = s.tier1UseCases + s.tier2UseCases
    const int = s.standardApiIntegrations + s.customIntegrations
    if (uc > 0)  items.push({ label: 'AI Automation Use Cases', value: String(uc) })
    if (int > 0) items.push({ label: 'System Integrations',      value: String(int) })
    items.push({ label: 'Deployment',         value: safe(s.deployment) })
    items.push({ label: 'Training Package',   value: s.training ? 'Included' : 'Not included' })
  }

  return items
}

// ─── PDF ────────────────────────────────────────────────────────────────────

export async function generateQuotePDF(data: PdfQuoteData): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = 210
  const mg    = 20           // margin
  const cW    = pageW - mg * 2   // 170 mm content width
  let   y     = 0

  // Palette — clean blacks/greys, brand-consistent
  const INK   = [17,  24,  39]  as [number, number, number]
  const BODY  = [55,  65,  81]  as [number, number, number]
  const MUTED = [107, 114, 128] as [number, number, number]
  const PALE  = [156, 163, 175] as [number, number, number]
  const RULE  = [229, 231, 235] as [number, number, number]
  const FAINT = [248, 249, 250] as [number, number, number]  // table header / total bg

  // ── TOP ACCENT STRIPE (2 mm branded edge) ─────────────────────────────────
  doc.setFillColor(...INK)
  doc.rect(0, 0, pageW, 2, 'F')

  // ── LOGO ──────────────────────────────────────────────────────────────────
  const logoDataUrl = await loadLogo()
  y = 18

  if (logoDataUrl) {
    const imgProps = doc.getImageProperties(logoDataUrl)
    const logoH    = 9
    const logoW    = (imgProps.width / imgProps.height) * logoH
    doc.addImage(logoDataUrl, 'PNG', mg, y - logoH, logoW, logoH)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...INK)
    doc.text('OPUS', mg, y)
  }

  // Date — right of logo
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(formatDate(data.createdAt), pageW - mg, y - 2, { align: 'right' })

  y += 6

  // ── RULE ──────────────────────────────────────────────────────────────────
  doc.setDrawColor(...RULE)
  doc.setLineWidth(0.4)
  doc.line(mg, y, pageW - mg, y)
  y += 8

  // ── TITLE BLOCK ───────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text('DELIVERY PRICING QUOTE', mg, y)
  y += 7

  // Client name — large and bold
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(...INK)
  const clientLabel = (doc.splitTextToSize(safe(data.clientName), cW) as string[])[0]
  doc.text(clientLabel, mg, y)
  y += 9

  // Project name
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...BODY)
  doc.text(safe(data.projectName), mg, y)
  y += 12

  // ── RULE ──────────────────────────────────────────────────────────────────
  doc.setDrawColor(...RULE)
  doc.setLineWidth(0.3)
  doc.line(mg, y, pageW - mg, y)
  y += 9

  // ── SCOPE OVERVIEW ───────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text('SCOPE OVERVIEW', mg, y)
  y += 7

  const scopeItems = buildScopeItems(data)
  const halfW      = cW / 2

  for (let i = 0; i < scopeItems.length; i += 2) {
    const left  = scopeItems[i]
    const right = scopeItems[i + 1]

    const leftLines  = doc.splitTextToSize(left.value, halfW - 8) as string[]
    const rightLines = right
      ? (doc.splitTextToSize(right.value, halfW - 8) as string[])
      : []

    // Label
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...MUTED)
    doc.text(left.label.toUpperCase(), mg, y)
    if (right) doc.text(right.label.toUpperCase(), mg + halfW, y)

    // Value
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...INK)
    doc.text(leftLines,  mg,          y + 5)
    if (right) doc.text(rightLines, mg + halfW, y + 5)

    const maxLines = Math.max(leftLines.length, rightLines.length)
    y += 5 + maxLines * 5.5 + 5
  }

  // Notes (if any)
  if (data.notes) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...MUTED)
    doc.text('NOTES', mg, y)
    y += 4

    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(...BODY)
    const noteLines = doc.splitTextToSize(safe(data.notes), cW) as string[]
    doc.text(noteLines, mg, y)
    y += noteLines.length * 4.5 + 4
  }

  y += 3

  // ── RULE ──────────────────────────────────────────────────────────────────
  doc.setDrawColor(...RULE)
  doc.setLineWidth(0.3)
  doc.line(mg, y, pageW - mg, y)
  y += 9

  // ── INVESTMENT SUMMARY ───────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text('INVESTMENT SUMMARY', mg, y)
  y += 6

  const PX = pageW - mg        // price right-align x
  const DX = pageW - mg - 28   // duration right-align x

  // Table header
  doc.setFillColor(...FAINT)
  doc.rect(mg, y - 1, cW, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...MUTED)
  doc.text('SERVICE',    mg + 3, y + 4)
  doc.text('DURATION',   DX,     y + 4, { align: 'right' })
  doc.text('INVESTMENT', PX,     y + 4, { align: 'right' })
  y += 10

  const rows: { label: string; item: typeof data.outputs.coreImplementation }[] = [
    { label: 'Core Implementation',        item: data.outputs.coreImplementation },
    { label: 'System Integrations',         item: data.outputs.integrations },
    { label: 'Deployment & Infrastructure', item: data.outputs.deployment },
    { label: 'Training & Enablement',       item: data.outputs.training },
    { label: 'Scope Adjustment',            item: data.outputs.complexityFactor },
  ]

  rows.forEach(({ label, item }) => {
    if (item.listPrice === 0 && item.weeks === 0 && item.hours === 0) return

    const price = item.listPrice === 'On Demand' ? 'On Request' : formatPrice(item.listPrice)
    const dur   = item.weeks    === 'On Demand' ? 'On Request' : `${formatWeeks(item.weeks)} wks`

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...BODY)
    doc.text(label, mg + 3, y)

    doc.setFontSize(8.5)
    doc.setTextColor(...PALE)
    doc.text(dur, DX, y, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...INK)
    doc.text(price, PX, y, { align: 'right' })

    doc.setDrawColor(...RULE)
    doc.setLineWidth(0.2)
    doc.line(mg, y + 3.5, pageW - mg, y + 3.5)
    y += 11
  })

  y += 3

  // ── TOTAL INVESTMENT (subtle light card — not a black box) ────────────────
  // Thin dark rule on top signals importance without a heavy fill
  doc.setDrawColor(...INK)
  doc.setLineWidth(1)
  doc.line(mg, y, pageW - mg, y)
  y += 1

  doc.setFillColor(...FAINT)
  doc.rect(mg, y, cW, 18, 'F')

  // Label
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text('TOTAL INVESTMENT', mg + 4, y + 8)

  // Price — large, bold, right-aligned
  const totalPrice = data.outputs.projectTotal.listPrice
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...INK)
  doc.text(
    totalPrice === 'On Demand' ? 'On Request' : formatPrice(totalPrice),
    PX, y + 10, { align: 'right' }
  )

  // Weeks sub-line
  const totalWks = data.outputs.projectTotal.weeks
  if (typeof totalWks === 'number' && totalWks > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...PALE)
    doc.text(`${formatWeeks(totalWks)} weeks estimated delivery`, PX, y + 16, { align: 'right' })
  }

  // Light rule underneath
  doc.setDrawColor(...RULE)
  doc.setLineWidth(0.3)
  doc.line(mg, y + 19, pageW - mg, y + 19)

  y += 26

  // ── NEXT STEPS ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text('NEXT STEPS', mg, y)
  y += 6

  const steps = doc.splitTextToSize(
    'Following acceptance of this proposal, the Opus team will prepare a detailed Statement of Work ' +
    'outlining project milestones, deliverables, and success criteria. Onboarding typically commences ' +
    'within 2–3 weeks of a signed agreement.\n\n' +
    'To move forward or for any questions regarding this proposal, please contact your Opus account manager.',
    cW
  ) as string[]

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BODY)
  doc.text(steps, mg, y)

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const footerY = 284
  doc.setDrawColor(...RULE)
  doc.setLineWidth(0.3)
  doc.line(mg, footerY, pageW - mg, footerY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...PALE)
  doc.text(
    'All figures are indicative list prices, subject to final scope confirmation and formal agreement.',
    mg, footerY + 5
  )
  doc.text(
    `Valid for 30 days from date of issue  ·  opus.ai`,
    pageW - mg, footerY + 5, { align: 'right' }
  )

  // ── SAVE ──────────────────────────────────────────────────────────────────
  const slug = data.clientName.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
  doc.save(`${data.quoteRef}-${slug}.pdf`)
}

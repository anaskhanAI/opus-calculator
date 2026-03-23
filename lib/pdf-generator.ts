/**
 * Client-side PDF generation using jsPDF.
 * Clean, client-facing solutions delivery quote — Opus brand language.
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
    const d  = data.inputs as DetailedInputs
    const g  = d.integrations
    const int =
      g.restLibrary + g.restModification + g.restNew +
      g.soapLibrary + g.soapModification + g.soapNew +
      g.dbLibrary   + g.dbModification   + g.dbNew

    items.push({ label: 'Simple Automation', value: String(d.tier1UseCases) })
    items.push({ label: 'Agentic AI Automation', value: String(d.tier2UseCases) })
    if (int > 0)
      items.push({ label: 'System Integrations', value: String(int) })
    items.push({ label: 'Deployment', value: safe(d.deployment) })
    if (d.training)
      items.push({ label: 'Training & Enablement', value: 'Included' })
  } else {
    const s   = data.inputs as SimpleInputs
    const int = s.standardApiIntegrations + s.customIntegrations

    items.push({ label: 'Simple Automation', value: String(s.tier1UseCases) })
    items.push({ label: 'Agentic AI Automation', value: String(s.tier2UseCases) })
    if (int > 0)
      items.push({ label: 'System Integrations', value: String(int) })
    items.push({ label: 'Deployment', value: safe(s.deployment) })
    if (s.training)
      items.push({ label: 'Training & Enablement', value: 'Included' })
  }

  return items
}

// ─── LAYOUT HELPERS ─────────────────────────────────────────────────────────

function rule(
  doc: InstanceType<Awaited<typeof import('jspdf')>['jsPDF']>,
  x: number, y: number, w: number,
  color: [number, number, number],
  weight = 0.3
) {
  doc.setDrawColor(...color)
  doc.setLineWidth(weight)
  doc.line(x, y, x + w, y)
}

function sectionLabel(
  doc: InstanceType<Awaited<typeof import('jspdf')>['jsPDF']>,
  text: string, x: number, y: number,
  muted: [number, number, number]
) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...muted)
  doc.text(text, x, y)
}

// ─── PDF ────────────────────────────────────────────────────────────────────

export async function generateQuotePDF(data: PdfQuoteData): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = 210
  const mg    = 20
  const cW    = pageW - mg * 2   // 170 mm

  const INK   = [17,  24,  39]  as [number, number, number]
  const BODY  = [55,  65,  81]  as [number, number, number]
  const MUTED = [107, 114, 128] as [number, number, number]
  const PALE  = [156, 163, 175] as [number, number, number]
  const RULE  = [229, 231, 235] as [number, number, number]
  const FAINT = [248, 249, 250] as [number, number, number]

  let y = 0

  // ── TOP ACCENT STRIPE ────────────────────────────────────────────────────
  doc.setFillColor(...INK)
  doc.rect(0, 0, pageW, 2, 'F')

  // ── LOGO ──────────────────────────────────────────────────────────────────
  const logoDataUrl = await loadLogo()
  y = 15

  if (logoDataUrl) {
    const imgProps = doc.getImageProperties(logoDataUrl)
    const logoH    = 8
    const logoW    = (imgProps.width / imgProps.height) * logoH
    doc.addImage(logoDataUrl, 'PNG', mg, y - logoH, logoW, logoH)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...INK)
    doc.text('OPUS', mg, y)
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(formatDate(data.createdAt), pageW - mg, y - 1, { align: 'right' })

  y += 4
  rule(doc, mg, y, cW, RULE, 0.4)
  y += 7

  // ── TITLE BLOCK ───────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text('SOLUTIONS DELIVERY QUOTE', mg, y)
  y += 7

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...INK)
  doc.text((doc.splitTextToSize(safe(data.clientName), cW) as string[])[0], mg, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...BODY)
  doc.text(safe(data.projectName), mg, y)
  y += 9

  // ── RULE ──────────────────────────────────────────────────────────────────
  rule(doc, mg, y, cW, RULE)
  y += 7

  // ── SCOPE OVERVIEW ────────────────────────────────────────────────────────
  sectionLabel(doc, 'SCOPE OVERVIEW', mg, y, MUTED)
  y += 6

  const scopeItems = buildScopeItems(data)
  const halfW      = cW / 2

  for (let i = 0; i < scopeItems.length; i += 2) {
    const left  = scopeItems[i]
    const right = scopeItems[i + 1]

    const leftLines  = doc.splitTextToSize(left.value, halfW - 8) as string[]
    const rightLines = right
      ? (doc.splitTextToSize(right.value, halfW - 8) as string[])
      : []

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...MUTED)
    doc.text(left.label.toUpperCase(), mg, y)
    if (right) doc.text(right.label.toUpperCase(), mg + halfW, y)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...INK)
    doc.text(leftLines, mg, y + 5)
    if (right) doc.text(rightLines, mg + halfW, y + 5)

    const maxLines = Math.max(leftLines.length, rightLines.length)
    y += 5 + maxLines * 5 + 4
  }

  // ── CLIENT NOTES ──────────────────────────────────────────────────────────
  if (data.notes) {
    y += 1
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...MUTED)
    doc.text('CLIENT NOTES', mg, y)
    y += 4

    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(...BODY)
    const noteLines = doc.splitTextToSize(safe(data.notes), cW) as string[]
    doc.text(noteLines, mg, y)
    y += noteLines.length * 4.5 + 2
  }

  y += 2
  rule(doc, mg, y, cW, RULE)
  y += 7

  // ── TOTAL INVESTMENT ──────────────────────────────────────────────────────
  doc.setDrawColor(...INK)
  doc.setLineWidth(0.8)
  doc.line(mg, y, pageW - mg, y)
  y += 1

  doc.setFillColor(...FAINT)
  doc.rect(mg, y, cW, 16, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text('TOTAL INVESTMENT', mg + 4, y + 7)

  const PX         = pageW - mg
  const totalPrice = data.outputs.projectTotal.listPrice
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  doc.setTextColor(...INK)
  doc.text(
    totalPrice === 'On Demand' ? 'On Request' : formatPrice(totalPrice),
    PX, y + 9, { align: 'right' }
  )

  const totalWks = data.outputs.projectTotal.weeks
  if (typeof totalWks === 'number' && totalWks > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...PALE)
    doc.text(`${formatWeeks(totalWks)} weeks estimated delivery`, PX, y + 14.5, { align: 'right' })
  }

  rule(doc, mg, y + 17, cW, RULE)
  y += 22

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const footerY = 284
  rule(doc, mg, footerY, cW, RULE)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...PALE)

  const footerText =
    "If you're happy with the quoted price, please reach out to your account executive " +
    "and they'll share the statement of work including detailed milestones and deliverables."
  const footerLines = doc.splitTextToSize(footerText, cW) as string[]
  doc.text(footerLines, mg, footerY + 5)

  // ── SAVE ──────────────────────────────────────────────────────────────────
  const slug = data.clientName.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
  doc.save(`${data.quoteRef}-${slug}.pdf`)
}

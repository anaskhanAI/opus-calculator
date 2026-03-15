/**
 * Client-side PDF generation using jsPDF.
 * Called only in the browser — never import this in Server Components or API routes.
 */

import type { CalculatorMode, DetailedInputs, SimpleInputs, CalculatorOutputs } from './types'
import { formatPrice, formatWeeks, formatHours, formatFte } from './pricing-engine'

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function safePdfStr(val: unknown): string {
  return val == null ? '' : String(val)
}

export async function generateQuotePDF(data: PdfQuoteData): Promise<void> {
  // Dynamic import so jsPDF is only loaded client-side
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW  = 210
  const margin = 18
  const col2   = 110
  let y = margin

  // ─── COLOR PALETTE ────────────────────────────────────────────────────────
  const INDIGO  = [63,  81, 181]  as [number, number, number]
  const DARK    = [17,  24,  39]  as [number, number, number]
  const MID     = [75,  85,  99]  as [number, number, number]
  const LIGHT   = [156, 163, 175] as [number, number, number]
  const BGLIGHT = [249, 250, 251] as [number, number, number]
  const LINE    = [229, 231, 235] as [number, number, number]

  // ─── HEADER BANNER ────────────────────────────────────────────────────────
  doc.setFillColor(...INDIGO)
  doc.rect(0, 0, pageW, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('OPUS', margin, 13)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Delivery Pricing Quote', margin, 20)

  doc.setFontSize(9)
  doc.text(data.quoteRef, pageW - margin, 13, { align: 'right' })
  doc.text(formatDate(data.createdAt), pageW - margin, 20, { align: 'right' })

  y = 36

  // ─── CLIENT / PROJECT SECTION ─────────────────────────────────────────────
  doc.setFillColor(...BGLIGHT)
  doc.roundedRect(margin, y, pageW - margin * 2, 28, 2, 2, 'F')

  doc.setTextColor(...DARK)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...LIGHT)
  doc.text('CLIENT', margin + 4, y + 7)
  doc.text('PROJECT', col2, y + 7)
  doc.text('PREPARED BY', margin + 4, y + 18)
  doc.text('CALCULATOR MODE', col2, y + 18)

  doc.setTextColor(...DARK)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(safePdfStr(data.clientName),  margin + 4, y + 13)
  doc.text(safePdfStr(data.projectName), col2,       y + 13)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MID)
  doc.text(`${safePdfStr(data.sellerName)} · ${safePdfStr(data.sellerEmail)}`, margin + 4, y + 24)
  doc.text(
    data.mode === 'detailed' ? 'Detailed Mode' : 'Simple Mode',
    col2,
    y + 24
  )

  y += 34

  // ─── PARAMETERS SECTION ───────────────────────────────────────────────────
  doc.setTextColor(...DARK)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Calculator Parameters', margin, y)
  y += 6

  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  y += 5

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')

  function paramRow(label: string, value: string, col: number = margin) {
    doc.setTextColor(...LIGHT)
    doc.text(label, col, y)
    doc.setTextColor(...DARK)
    doc.setFont('helvetica', 'bold')
    doc.text(value, col, y + 4)
    doc.setFont('helvetica', 'normal')
  }

  if (data.mode === 'detailed') {
    const d = data.inputs as DetailedInputs
    const g = d.integrations
    const totalInts =
      g.restLibrary + g.restModification + g.restNew +
      g.soapLibrary + g.soapModification + g.soapNew +
      g.dbLibrary   + g.dbModification   + g.dbNew

    paramRow('Tier 1 — Linear Automation',   `${d.tier1UseCases} use cases`)
    paramRow('Tier 2 — Agentic AI',           `${d.tier2UseCases} use cases`, col2)
    y += 10
    paramRow('Total Integrations',            `${totalInts}`)
    paramRow('Deployment',                    safePdfStr(d.deployment), col2)
    y += 10
    paramRow('Training',                      d.training ? 'Yes — 1 week, $20,000' : 'No')
    paramRow('Complexity Factor',             `${Math.round(d.complexityFactor * 100)}%`, col2)
    y += 10

    // Integration grid summary
    doc.setTextColor(...LIGHT)
    doc.text('Integration breakdown (Type × Status):', margin, y)
    y += 5
    doc.setTextColor(...MID)
    const gridLines = [
      `REST/JSON — Library: ${g.restLibrary}  ·  Modification: ${g.restModification}  ·  New: ${g.restNew}  (Auth: ${g.restAuth})`,
      `SOAP/XML  — Library: ${g.soapLibrary}  ·  Modification: ${g.soapModification}  ·  New: ${g.soapNew}  (Auth: ${g.soapAuth})`,
      `DB/Prop   — Library: ${g.dbLibrary}  ·  Modification: ${g.dbModification}  ·  New: ${g.dbNew}  (Auth: ${g.dbAuth})`,
    ]
    gridLines.forEach((line) => {
      doc.text(line, margin, y)
      y += 4.5
    })
    y += 2
  } else {
    const s = data.inputs as SimpleInputs
    paramRow('Tier 1 — Linear Automation',   `${s.tier1UseCases} use cases`)
    paramRow('Tier 2 — Agentic AI',           `${s.tier2UseCases} use cases`, col2)
    y += 10
    paramRow('Standard API Integrations',     `${s.standardApiIntegrations}`)
    paramRow('Custom High-Code Integrations', `${s.customIntegrations}`, col2)
    y += 10
    paramRow('Deployment',                    safePdfStr(s.deployment))
    paramRow('Training',                      s.training ? 'Yes — 1 week, $20,000' : 'No', col2)
    y += 10
    paramRow('Complexity Factor',             `${Math.round(s.complexityFactor * 100)}%`)
    y += 8
  }

  // ─── PRICING TABLE ────────────────────────────────────────────────────────
  doc.setTextColor(...DARK)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Pricing Breakdown', margin, y)
  y += 6

  doc.setDrawColor(...LINE)
  doc.line(margin, y, pageW - margin, y)
  y += 4

  // Table header
  const col = {
    label:  margin,
    price:  105,
    weeks:  138,
    hours:  160,
    fte:    183,
  }

  doc.setFillColor(...BGLIGHT)
  doc.rect(margin, y, pageW - margin * 2, 7, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...LIGHT)
  doc.text('LINE ITEM',   col.label, y + 5)
  doc.text('LIST PRICE',  col.price, y + 5, { align: 'right' })
  doc.text('WEEKS',       col.weeks, y + 5, { align: 'right' })
  doc.text('HOURS',       col.hours, y + 5, { align: 'right' })
  doc.text('FTE',         col.fte,   y + 5, { align: 'right' })
  y += 9

  const lineItems: { label: string; item: typeof data.outputs.coreImplementation }[] = [
    { label: 'Core Implementation', item: data.outputs.coreImplementation },
    { label: 'Integrations',        item: data.outputs.integrations },
    { label: 'Deployment',          item: data.outputs.deployment },
    { label: 'Training',            item: data.outputs.training },
    { label: 'Complexity Factor',   item: data.outputs.complexityFactor },
  ]

  lineItems.forEach(({ label, item }) => {
    const isZero = item.listPrice === 0 && item.weeks === 0 && item.hours === 0
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    if (isZero) { doc.setTextColor(...LIGHT) } else { doc.setTextColor(...DARK) }
    doc.text(label,                            col.label, y)
    doc.text(formatPrice(item.listPrice),      col.price, y, { align: 'right' })
    doc.text(formatWeeks(item.weeks),          col.weeks, y, { align: 'right' })
    doc.text(formatHours(item.hours),          col.hours, y, { align: 'right' })
    doc.text(formatFte(item.fte),              col.fte,   y, { align: 'right' })

    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.2)
    doc.line(margin, y + 2, pageW - margin, y + 2)
    y += 8
  })

  // Total row
  doc.setFillColor(...INDIGO)
  doc.rect(margin, y - 2, pageW - margin * 2, 9, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.text('PROJECT TOTAL',                                 col.label, y + 4)
  doc.text(formatPrice(data.outputs.projectTotal.listPrice), col.price, y + 4, { align: 'right' })
  doc.text(formatWeeks(data.outputs.projectTotal.weeks),     col.weeks, y + 4, { align: 'right' })
  doc.text(formatHours(data.outputs.projectTotal.hours),     col.hours, y + 4, { align: 'right' })
  y += 14

  // ─── NOTES ────────────────────────────────────────────────────────────────
  if (data.notes) {
    doc.setTextColor(...DARK)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Notes', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MID)
    const noteLines = doc.splitTextToSize(data.notes, pageW - margin * 2)
    doc.text(noteLines, margin, y)
    y += noteLines.length * 5 + 4
  }

  // ─── FOOTER ───────────────────────────────────────────────────────────────
  const footerY = 287
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)
  doc.line(margin, footerY, pageW - margin, footerY)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...LIGHT)
  doc.text(
    `This quote was generated by the Opus Pricing Calculator v1.2 on ${formatDate(data.createdAt)}. Quote ID: ${data.quoteRef}`,
    margin,
    footerY + 4
  )
  doc.text('All figures are indicative list prices. Subject to final scope and approval.', margin, footerY + 8)

  // ─── SAVE / DOWNLOAD ──────────────────────────────────────────────────────
  const clientSlug = data.clientName.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
  const filename = `${data.quoteRef}-${clientSlug}.pdf`
  doc.save(filename)
}

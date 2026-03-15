'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import type { CalculatorMode, DetailedInputs, SimpleInputs, CalculatorOutputs } from '@/lib/types'

interface GenerateQuoteButtonProps {
  mode: CalculatorMode
  inputs: DetailedInputs | SimpleInputs
  outputs: CalculatorOutputs
  clientName: string
  projectName: string
  notes: string
  disabled: boolean
  onSuccess: (quoteRef: string, quoteId: string) => void
  onError: (message: string) => void
}

export default function GenerateQuoteButton({
  mode,
  inputs,
  outputs,
  clientName,
  projectName,
  notes,
  disabled,
  onSuccess,
  onError,
}: GenerateQuoteButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    try {
      // 1. POST the quote to the API first to get the quote ref
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          projectName,
          notes,
          calculatorMode: mode,
          inputs,
          outputs,
          totalPrice:
            typeof outputs.projectTotal.listPrice === 'number'
              ? outputs.projectTotal.listPrice
              : null,
          totalWeeks:
            typeof outputs.projectTotal.weeks === 'number'
              ? outputs.projectTotal.weeks
              : null,
          totalHours:
            typeof outputs.projectTotal.hours === 'number'
              ? outputs.projectTotal.hours
              : null,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to save quote')
      }

      const { quote } = await response.json()

      // 2. Generate and download the PDF client-side
      const { generateQuotePDF } = await import('@/lib/pdf-generator')
      await generateQuotePDF({
        quoteRef: quote.quote_ref,
        sellerName: quote.seller_name,
        sellerEmail: quote.seller_email,
        clientName,
        projectName,
        mode,
        inputs,
        outputs,
        createdAt: quote.created_at,
        notes,
      })

      onSuccess(quote.quote_ref, quote.id)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="lg"
      onClick={handleGenerate}
      disabled={disabled || loading}
      loading={loading}
      className="w-full"
    >
      {loading ? 'Generating Quote...' : 'Generate Quote & Download PDF'}
    </Button>
  )
}

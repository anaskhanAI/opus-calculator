'use client'

import QuoteCard from '@/components/quotes/QuoteCard'
import type { Quote } from '@/lib/types'

interface QuoteListClientProps {
  quotes: Quote[]
}

export default function QuoteListClient({ quotes }: QuoteListClientProps) {
  async function handleRedownload(quote: Quote) {
    const { generateQuotePDF } = await import('@/lib/pdf-generator')
    await generateQuotePDF({
      quoteRef:    quote.quoteRef,
      sellerName:  quote.sellerName,
      sellerEmail: quote.sellerEmail,
      clientName:  quote.clientName,
      projectName: quote.projectName,
      mode:        quote.calculatorMode,
      inputs:      quote.inputs,
      outputs:     quote.outputs,
      createdAt:   quote.createdAt,
      notes:       quote.notes,
    })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {quotes.map((quote) => (
        <QuoteCard
          key={quote.id}
          quote={quote}
          onRedownload={handleRedownload}
        />
      ))}
    </div>
  )
}

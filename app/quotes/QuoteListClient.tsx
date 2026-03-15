'use client'

import { useRouter } from 'next/navigation'
import QuoteCard from '@/components/quotes/QuoteCard'
import type { Quote } from '@/lib/types'

interface QuoteListClientProps {
  quotes: Quote[]
}

export default function QuoteListClient({ quotes }: QuoteListClientProps) {
  const router = useRouter()

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

  function handleDuplicate(quote: Quote) {
    // Store the quote inputs in sessionStorage for the calculator to pick up
    sessionStorage.setItem('duplicateQuote', JSON.stringify({
      mode:   quote.calculatorMode,
      inputs: quote.inputs,
    }))
    router.push('/calculator?duplicate=1')
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {quotes.map((quote) => (
        <QuoteCard
          key={quote.id}
          quote={quote}
          onDuplicate={handleDuplicate}
          onRedownload={handleRedownload}
        />
      ))}
    </div>
  )
}

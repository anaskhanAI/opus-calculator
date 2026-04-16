'use client'

import { useState, useEffect, useRef } from 'react'

interface GuideStatus {
  hasCustomContent: boolean
  updatedAt: string | null
  updatedBy: string | null
}

export default function PricingGuideUpload() {
  const [status, setStatus] = useState<GuideStatus | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [expanded, setExpanded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/pricing-guide/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(console.error)
  }, [])

  function handleFileChange() {
    const file = fileInputRef.current?.files?.[0]
    setSelectedFileName(file?.name ?? null)
    setMessage(null)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setMessage({ type: 'error', text: 'Please select an HTML file first.' })
      return
    }

    setUploading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/pricing-guide', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Upload failed. Please try again.' })
      } else {
        setMessage({ type: 'success', text: 'Pricing guide published. All users will see the new version immediately.' })
        setStatus({
          hasCustomContent: true,
          updatedAt: new Date().toISOString(),
          updatedBy: data.updatedBy,
        })
        setSelectedFileName(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setUploading(false)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="bg-white border border-gray-200 overflow-hidden mb-4">
      {/* Header row — always visible, click to expand */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm font-medium text-gray-900">Pricing Guide</span>
          {status?.hasCustomContent ? (
            <span className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded">
              Custom version active
            </span>
          ) : (
            <span className="text-xs px-1.5 py-0.5 bg-gray-50 text-gray-500 border border-gray-200 rounded">
              Default
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {/* Current status */}
          {status?.hasCustomContent && status.updatedAt ? (
            <p className="text-xs text-gray-500">
              Last updated {formatDate(status.updatedAt)}
              {status.updatedBy ? ` by ${status.updatedBy}` : ''}
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              Currently showing the default pricing guide. Upload a new HTML file to replace it instantly for all users — no redeployment needed.
            </p>
          )}

          {/* Upload form */}
          <form onSubmit={handleUpload} className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors text-xs text-gray-700 font-medium">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {selectedFileName ? selectedFileName : 'Choose .html file'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".html"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            <button
              type="submit"
              disabled={uploading || !selectedFileName}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? 'Publishing…' : 'Upload & Publish'}
            </button>
          </form>

          {/* Feedback */}
          {message && (
            <p className={`text-xs ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.text}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

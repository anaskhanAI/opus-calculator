import Link from 'next/link'

export default function AdminNav({ active }: { active: 'quotes' | 'pricing' }) {
  return (
    <div className="flex items-center gap-1 mb-5 border-b border-gray-200">
      <Link
        href="/admin"
        className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
          active === 'quotes'
            ? 'border-indigo-600 text-indigo-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        Quote Dashboard
      </Link>
      <Link
        href="/admin/pricing"
        className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
          active === 'pricing'
            ? 'border-indigo-600 text-indigo-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        Pricing Configuration
      </Link>
    </div>
  )
}

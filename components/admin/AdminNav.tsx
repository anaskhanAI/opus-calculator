import Link from 'next/link'

const TABS: { id: 'quotes' | 'pricing' | 'gm'; label: string; href: string }[] = [
  { id: 'quotes',  label: 'Quote Dashboard',       href: '/admin' },
  { id: 'pricing', label: 'Pricing Configuration', href: '/admin/pricing' },
  { id: 'gm',      label: 'GM Calculator',         href: '/admin/gm' },
]

export default function AdminNav({ active }: { active: 'quotes' | 'pricing' | 'gm' }) {
  return (
    <div className="flex items-center gap-1 mb-5 border-b border-gray-200">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            active === tab.id
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}

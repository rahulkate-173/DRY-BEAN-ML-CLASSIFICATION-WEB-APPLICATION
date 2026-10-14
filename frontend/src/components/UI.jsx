import { AlertCircle, RefreshCw } from 'lucide-react'

export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={`${sizes[size]} border-2 border-forest-200 border-t-forest-600 rounded-full animate-spin ${className}`} />
  )
}

export function LoadingCard({ rows = 4, label = 'Loading…' }) {
  return (
    <div className="card p-6 space-y-3">
      <div className="flex items-center gap-3 mb-4">
        <Spinner size="sm" />
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 35}%` }} />
      ))}
    </div>
  )
}

export function ErrorCard({ message, onRetry }) {
  return (
    <div className="card p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-red-700">Failed to load data</p>
          <p className="text-sm text-red-600 mt-1 break-words">{message}</p>
          {onRetry && (
            <button onClick={onRetry} className="btn-secondary mt-3 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function EmptyCard({ message = 'No data available.' }) {
  return (
    <div className="card p-8 text-center">
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  )
}

export function StatCard({ label, value, icon: Icon, sub, color = 'forest' }) {
  return (
    <div className="stat-card flex items-start gap-4">
      {Icon && (
        <div className={`p-2.5 rounded-lg bg-${color}-100 shrink-0`}>
          <Icon className={`w-5 h-5 text-${color}-700`} />
        </div>
      )}
      <div className="min-w-0">
        <p className="stat-label truncate">{label}</p>
        <p className="stat-value">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function MetricBadge({ value, good = true }) {
  const pct = typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : value
  return (
    <span className={`font-mono text-sm font-semibold ${good ? 'text-forest-700' : 'text-amber-700'}`}>
      {pct}
    </span>
  )
}

export function Tooltip({ text, children }) {
  return (
    <span className="relative group">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg bg-gray-900 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
        {text}
      </span>
    </span>
  )
}

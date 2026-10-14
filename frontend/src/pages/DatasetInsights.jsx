import { useState, useMemo } from 'react'
import { Database, Download, TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, ScatterChart, Scatter,
  PieChart, Pie, RadialBarChart, RadialBar
} from 'recharts'
import api from '../api/client'
import { useFetch } from '../hooks/useFetch'
import { LoadingCard, ErrorCard, SectionHeader } from '../components/UI'
import {
  FEATURE_NAMES, FEATURE_METADATA, BEAN_CLASS_COLORS,
  BEAN_CLASS_LABELS, getFeatureLabel, formatValue
} from '../utils/features'

const PIE_COLORS = Object.values(BEAN_CLASS_COLORS)

function RangeBar({ min, max, globalMin, globalMax, color }) {
  const total = globalMax - globalMin || 1
  const left = ((min - globalMin) / total) * 100
  const width = ((max - min) / total) * 100
  return (
    <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="absolute top-0 h-full rounded-full opacity-70"
        style={{ left: `${left}%`, width: `${Math.max(width, 2)}%`, background: color }}
      />
    </div>
  )
}

export default function DatasetInsights() {
  const [selectedFeature, setSelectedFeature] = useState('Area')
  const overview = useFetch(() => api.statsOverview())
  const featStats = useFetch(() => api.statsFeatures())
  const classRanges = useFetch(() => api.statsClassRanges())
  const fi = useFetch(() => api.featureImportance())

  const classRangeData = classRanges.data || {}
  const globalStats = featStats.data?.feature_stats || {}

  // Pie chart data
  const pieData = overview.data
    ? Object.entries(overview.data.class_distribution).map(([name, value]) => ({
        name: BEAN_CLASS_LABELS[name] || name,
        value,
        key: name,
      }))
    : []

  // Per-feature range comparison across classes
  const rangeRows = useMemo(() => {
    const feat = selectedFeature
    const global = globalStats[feat]
    if (!global) return []
    return Object.entries(classRangeData).map(([cls, feats]) => ({
      cls,
      min: feats[feat]?.min,
      max: feats[feat]?.max,
      mean: feats[feat]?.mean,
      std: feats[feat]?.std,
      globalMin: global.min,
      globalMax: global.max,
    }))
  }, [selectedFeature, classRangeData, globalStats])

  // Feature spread chart (std dev per feature)
  const spreadData = FEATURE_NAMES.map((f) => {
    const s = globalStats[f]
    return {
      feature: (FEATURE_METADATA[f]?.label || f).replace(' ', '\n'),
      std: s ? +(s.std).toFixed(4) : 0,
      mean: s ? +(s.mean).toFixed(4) : 0,
    }
  })

  // Top features from importance
  const fiImportances = fi.data?.importances || {}
  const topFeatures = Object.entries(fiImportances)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([f, v]) => ({ feature: getFeatureLabel(f), value: +(v * 100).toFixed(2) }))

  const handleDownloadCSV = () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    window.open(`${baseUrl}/api/statistics/export/class-ranges.csv`, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-forest-700" />
            Dataset Insights
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Exploratory statistics from the UCI Dry Bean Dataset (Koklu &amp; Ozkan, 2020).
          </p>
        </div>
        <button onClick={handleDownloadCSV} className="btn-secondary text-xs">
          <Download className="w-3.5 h-3.5" />
          Download CSV
        </button>
      </div>

      {/* Overview stats */}
      {overview.loading ? (
        <LoadingCard rows={2} label="Loading overview…" />
      ) : overview.error ? (
        <ErrorCard message={overview.error} onRetry={overview.refetch} />
      ) : (
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="stat-label">Total Records</p>
            <p className="stat-value">{overview.data?.total_records?.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">After deduplication</p>
          </div>
          <div className="card p-5">
            <p className="stat-label">Features</p>
            <p className="stat-value">{overview.data?.feature_count}</p>
            <p className="text-xs text-gray-400 mt-1">All numerical</p>
          </div>
          <div className="card p-5">
            <p className="stat-label">Bean Classes</p>
            <p className="stat-value">{overview.data?.class_count}</p>
            <p className="text-xs text-gray-400 mt-1">7 varieties</p>
          </div>
        </div>
      )}

      {/* Class distribution */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <SectionHeader title="Class Distribution" subtitle="Sample count per variety" />
          </div>
          <div className="card-body">
            {overview.loading ? (
              <div className="skeleton h-52 rounded" />
            ) : pieData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
                    labelLine={true}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={BEAN_CLASS_COLORS[entry.key] || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v.toLocaleString(), 'Samples']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top important features */}
        <div className="card">
          <div className="card-header">
            <SectionHeader
              title="Top Important Features"
              subtitle={fi.data?.method || 'Feature importance ranking from best model'}
            />
          </div>
          <div className="card-body">
            {fi.loading ? (
              <div className="skeleton h-52 rounded" />
            ) : topFeatures.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">
                Train the model to see feature importance.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart
                  data={topFeatures}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 60, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} unit="%" />
                  <YAxis dataKey="feature" type="category" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip
                    formatter={(v) => [`${v}%`, 'Importance']}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="value" fill="#166534" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Feature range comparison */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <SectionHeader
              title="Class-wise Feature Ranges"
              subtitle="Observed min–max range per variety. Overlapping bars indicate similar values across classes."
            />
            <select
              value={selectedFeature}
              onChange={(e) => setSelectedFeature(e.target.value)}
              className="input-field w-48 shrink-0"
            >
              {FEATURE_NAMES.map((f) => (
                <option key={f} value={f}>{getFeatureLabel(f)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="card-body">
          {classRanges.loading ? (
            <LoadingCard rows={7} label="Loading ranges…" />
          ) : classRanges.error ? (
            <ErrorCard message={classRanges.error} />
          ) : rangeRows.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No range data.</p>
          ) : (
            <div className="space-y-3">
              {rangeRows.map(({ cls, min, max, mean, std, globalMin, globalMax }) => (
                <div key={cls} className="grid grid-cols-[120px_1fr_auto] items-center gap-3">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: BEAN_CLASS_COLORS[cls] || '#ccc' }}
                    />
                    {BEAN_CLASS_LABELS[cls] || cls}
                  </span>
                  <RangeBar
                    min={min ?? 0}
                    max={max ?? 0}
                    globalMin={globalMin ?? 0}
                    globalMax={globalMax ?? 1}
                    color={BEAN_CLASS_COLORS[cls] || '#166534'}
                  />
                  <span className="text-xs text-gray-500 whitespace-nowrap font-mono">
                    {formatValue(min, selectedFeature)} – {formatValue(max, selectedFeature)}
                  </span>
                </div>
              ))}
              <p className="text-xs text-gray-400 mt-2">
                Ranges show observed dataset min/max — not classification boundaries.
                Classification requires all 16 features together.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Global feature statistics table */}
      <div className="card">
        <div className="card-header">
          <SectionHeader
            title="Global Feature Statistics"
            subtitle="Across all 7 classes combined"
            action={
              <button onClick={handleDownloadCSV} className="btn-secondary text-xs">
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
            }
          />
        </div>
        <div className="table-wrapper">
          {featStats.loading ? (
            <LoadingCard rows={6} label="Loading statistics…" />
          ) : featStats.error ? (
            <ErrorCard message={featStats.error} />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Group</th>
                  <th>Min</th>
                  <th>Max</th>
                  <th>Mean</th>
                  <th>Median</th>
                  <th>Std Dev</th>
                  <th>IQR</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_NAMES.map((f) => {
                  const s = globalStats[f]
                  const meta = FEATURE_METADATA[f]
                  if (!s) return null
                  return (
                    <tr key={f}>
                      <td className="font-medium">{meta?.label || f}</td>
                      <td>
                        <span className="badge bg-gray-100 text-gray-600">{meta?.group}</span>
                      </td>
                      <td className="font-mono text-xs">{formatValue(s.min, f)}</td>
                      <td className="font-mono text-xs">{formatValue(s.max, f)}</td>
                      <td className="font-mono text-xs">{formatValue(s.mean, f)}</td>
                      <td className="font-mono text-xs">{formatValue(s.median, f)}</td>
                      <td className="font-mono text-xs">{formatValue(s.std, f)}</td>
                      <td className="font-mono text-xs">{formatValue(s.q75 - s.q25, f)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

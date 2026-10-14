import { useState, useMemo } from 'react'
import {
  BarChart3, Download, Info, AlertCircle
} from 'lucide-react'
import {
  BarChart, Bar, XCell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, Legend
} from 'recharts'
import api from '../api/client'
import { useFetch } from '../hooks/useFetch'
import { LoadingCard, ErrorCard, SectionHeader } from '../components/UI'
import {
  FEATURE_NAMES, FEATURE_METADATA, BEAN_CLASSES,
  BEAN_CLASS_COLORS, BEAN_CLASS_LABELS, getFeatureLabel, formatValue
} from '../utils/features'

const CHART_COLORS = Object.values(BEAN_CLASS_COLORS)

export default function FeatureExplorer() {
  const [selectedClass, setSelectedClass] = useState('ALL')
  const [selectedFeature, setSelectedFeature] = useState('Area')
  const [search, setSearch] = useState('')

  const classRanges = useFetch(() => api.statsClassRanges())

  const data = classRanges.data || {}
  const classes = Object.keys(data)

  // Chart data: value per class for selected feature
  const chartData = useMemo(() => {
    if (!data || !selectedFeature) return []
    return classes.map((cls) => ({
      name: BEAN_CLASS_LABELS[cls] || cls,
      key: cls,
      mean: data[cls]?.[selectedFeature]?.mean,
      min: data[cls]?.[selectedFeature]?.min,
      max: data[cls]?.[selectedFeature]?.max,
      q25: data[cls]?.[selectedFeature]?.q25,
      q75: data[cls]?.[selectedFeature]?.q75,
    }))
  }, [data, selectedFeature, classes])

  // Filtered rows for table
  const tableRows = useMemo(() => {
    const rows = []
    for (const cls of classes) {
      if (selectedClass !== 'ALL' && cls !== selectedClass) continue
      for (const feat of FEATURE_NAMES) {
        if (search && !feat.toLowerCase().includes(search.toLowerCase()) &&
            !getFeatureLabel(feat).toLowerCase().includes(search.toLowerCase())) continue
        if (selectedFeature !== 'ALL_FEATURES' && feat !== selectedFeature) continue
        const s = data[cls]?.[feat]
        if (s) rows.push({ cls, feat, ...s })
      }
    }
    return rows.slice(0, 200)
  }, [data, selectedClass, selectedFeature, search, classes])

  // Selected class stats for selected feature
  const focusStats = selectedClass !== 'ALL' && selectedFeature
    ? data[selectedClass]?.[selectedFeature]
    : null

  const handleDownloadCSV = () => {
    const url = api.exportClassRangesUrl
      ? api.exportClassRangesUrl()
      : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/statistics/export/class-ranges.csv`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-forest-700" />
            Feature Explorer
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Per-class descriptive statistics calculated from the actual dataset.
          </p>
        </div>
        <button onClick={handleDownloadCSV} className="btn-secondary text-xs">
          <Download className="w-3.5 h-3.5" />
          Download CSV
        </button>
      </div>

      {/* Disclaimer */}
      <div className="alert-info">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
        <p className="text-xs">
          Minimum and maximum values are <strong>observed dataset ranges</strong>, not guaranteed classification boundaries.
          Bean classes can have overlapping feature ranges — classification requires considering all 16 features together.
        </p>
      </div>

      {classRanges.loading ? (
        <LoadingCard label="Loading class statistics…" rows={6} />
      ) : classRanges.error ? (
        <ErrorCard message={classRanges.error} onRetry={classRanges.refetch} />
      ) : (
        <>
          {/* Controls */}
          <div className="card p-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Bean Variety</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="input-field"
                >
                  <option value="ALL">All Varieties</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>{BEAN_CLASS_LABELS[c] || c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Feature</label>
                <select
                  value={selectedFeature}
                  onChange={(e) => setSelectedFeature(e.target.value)}
                  className="input-field"
                >
                  {FEATURE_NAMES.map((f) => (
                    <option key={f} value={f}>{getFeatureLabel(f)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Search Features</label>
                <input
                  type="text"
                  placeholder="Search feature name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Focus stats cards */}
          {focusStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Min', val: focusStats.min },
                { label: 'Max', val: focusStats.max },
                { label: 'Mean', val: focusStats.mean },
                { label: 'Median', val: focusStats.median },
                { label: 'Std Dev', val: focusStats.std },
                { label: 'Q25', val: focusStats.q25 },
                { label: 'Q75 (IQR)', val: `${formatValue(focusStats.q75, selectedFeature)} (IQR: ${formatValue(focusStats.q75 - focusStats.q25, selectedFeature)})` },
                { label: 'Samples', val: focusStats.count?.toLocaleString() },
              ].map(({ label, val }) => (
                <div key={label} className="card p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">
                    {typeof val === 'number' ? formatValue(val, selectedFeature) : val}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Cross-class chart */}
          <div className="card">
            <div className="card-header">
              <SectionHeader
                title={`${getFeatureLabel(selectedFeature)} — Mean per Class`}
                subtitle="Comparing class averages. Overlapping ranges are normal — classification uses all features."
              />
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => [formatValue(v, selectedFeature), getFeatureLabel(selectedFeature)]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Bar dataKey="mean" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.key} fill={BEAN_CLASS_COLORS[entry.key] || '#166534'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparison table */}
          <div className="card">
            <div className="card-header">
              <SectionHeader
                title="Statistics Table"
                subtitle={`Showing ${tableRows.length} rows`}
                action={
                  <button onClick={handleDownloadCSV} className="btn-secondary text-xs">
                    <Download className="w-3.5 h-3.5" />
                    CSV
                  </button>
                }
              />
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Feature</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>Mean</th>
                    <th>Median</th>
                    <th>Std</th>
                    <th>Q25</th>
                    <th>Q75</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center text-gray-400 py-8">No matching rows.</td>
                    </tr>
                  ) : (
                    tableRows.map((row, i) => (
                      <tr key={i}>
                        <td>
                          <span className="flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ background: BEAN_CLASS_COLORS[row.cls] || '#ccc' }}
                            />
                            {BEAN_CLASS_LABELS[row.cls] || row.cls}
                          </span>
                        </td>
                        <td className="font-mono text-xs">{row.feat}</td>
                        <td>{formatValue(row.min, row.feat)}</td>
                        <td>{formatValue(row.max, row.feat)}</td>
                        <td>{formatValue(row.mean, row.feat)}</td>
                        <td>{formatValue(row.median, row.feat)}</td>
                        <td>{formatValue(row.std, row.feat)}</td>
                        <td>{formatValue(row.q25, row.feat)}</td>
                        <td>{formatValue(row.q75, row.feat)}</td>
                        <td>{row.count?.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

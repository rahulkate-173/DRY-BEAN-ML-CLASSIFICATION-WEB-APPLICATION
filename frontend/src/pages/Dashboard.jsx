import { Link } from 'react-router-dom'
import {
  Database, Layers, Tag, BarChart2, CheckCircle,
  ArrowRight, Microscope, BarChart3, Activity, Info
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, PolarGrid,
  PolarAngleAxis, Radar, Legend
} from 'recharts'
import { useFetch } from '../hooks/useFetch'
import api from '../api/client'
import { LoadingCard, ErrorCard, StatCard, SectionHeader } from '../components/UI'
import { BEAN_CLASS_COLORS, BEAN_CLASS_LABELS } from '../utils/features'

const MODEL_COLORS = [
  '#166534', '#15803d', '#16a34a', '#4ade80', '#86efac', '#3d6e44',
]

export default function Dashboard() {
  const overview = useFetch(() => api.statsOverview())
  const modelInfo = useFetch(() => api.modelInfo())
  const evaluation = useFetch(() => api.evaluation())

  const classDistData = overview.data
    ? Object.entries(overview.data.class_distribution).map(([name, count]) => ({
        name: BEAN_CLASS_LABELS[name] || name,
        count,
        key: name,
      }))
    : []

  const modelComparisonData = evaluation.data?.model_comparison?.slice(0, 6).map((m) => ({
    name: m.model?.replace('_Calibrated', '').replace('HistGradientBoosting', 'HGB') || m.model,
    'CV F1': +(m.cv_f1_macro_mean * 100).toFixed(1),
    'CV Acc': +(m.cv_accuracy_mean * 100).toFixed(1),
  })) || []

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-forest-800 to-forest-950 rounded-2xl p-7 text-white">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge bg-forest-600 text-forest-100 text-xs">UCI Dry Bean Dataset</span>
            <span className="badge bg-forest-600 text-forest-100 text-xs">Traditional ML</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            BeanVision AI
          </h1>
          <p className="text-forest-200 text-sm leading-relaxed mb-5">
            Classify dry bean varieties using 16 morphological features from the UCI Dry Bean Dataset
            (Koklu &amp; Ozkan, 2020). Seven bean types · 13,611 samples · Traditional ML only.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/classify" className="inline-flex items-center gap-2 px-4 py-2 bg-white text-forest-800
              text-sm font-semibold rounded-lg hover:bg-forest-50 transition-colors">
              <Microscope className="w-4 h-4" />
              Classify a Bean
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/features" className="inline-flex items-center gap-2 px-4 py-2 bg-forest-700 text-white
              text-sm font-medium rounded-lg hover:bg-forest-600 transition-colors border border-forest-600">
              <BarChart3 className="w-4 h-4" />
              Feature Explorer
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {overview.loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))
        ) : overview.error ? (
          <div className="col-span-4">
            <ErrorCard message={overview.error} onRetry={overview.refetch} />
          </div>
        ) : (
          <>
            <StatCard label="Dataset Records" value={overview.data?.total_records?.toLocaleString() || '—'} icon={Database} />
            <StatCard label="Input Features" value={overview.data?.feature_count || '—'} icon={Layers} />
            <StatCard label="Bean Varieties" value={overview.data?.class_count || '—'} icon={Tag} />
            <StatCard
              label="Best Model"
              value={modelInfo.data?.model_name?.replace('_Calibrated', '') || (modelInfo.loading ? '…' : '—')}
              icon={CheckCircle}
            />
          </>
        )}
      </div>

      {/* Performance summary */}
      {!modelInfo.loading && !modelInfo.error && modelInfo.data?.test_metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="stat-card bg-forest-50 border-forest-200">
            <p className="stat-label text-forest-700">Test Accuracy</p>
            <p className="stat-value text-forest-900">
              {((modelInfo.data.test_metrics.accuracy || 0) * 100).toFixed(2)}%
            </p>
            <p className="text-xs text-forest-600 mt-0.5">Held-out test set</p>
          </div>
          <div className="stat-card bg-forest-50 border-forest-200">
            <p className="stat-label text-forest-700">Macro F1</p>
            <p className="stat-value text-forest-900">
              {((modelInfo.data.test_metrics.f1_macro || 0) * 100).toFixed(2)}%
            </p>
            <p className="text-xs text-forest-600 mt-0.5">Primary metric</p>
          </div>
          <div className="stat-card bg-forest-50 border-forest-200">
            <p className="stat-label text-forest-700">Precision</p>
            <p className="stat-value text-forest-900">
              {((modelInfo.data.test_metrics.precision_macro || 0) * 100).toFixed(2)}%
            </p>
            <p className="text-xs text-forest-600 mt-0.5">Macro average</p>
          </div>
          <div className="stat-card bg-forest-50 border-forest-200">
            <p className="stat-label text-forest-700">Recall</p>
            <p className="stat-value text-forest-900">
              {((modelInfo.data.test_metrics.recall_macro || 0) * 100).toFixed(2)}%
            </p>
            <p className="text-xs text-forest-600 mt-0.5">Macro average</p>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Class distribution */}
        <div className="card">
          <div className="card-header">
            <SectionHeader
              title="Class Distribution"
              subtitle="Number of samples per bean variety"
            />
          </div>
          <div className="card-body">
            {overview.loading ? (
              <div className="h-52 flex items-center justify-center">
                <div className="skeleton w-full h-full rounded" />
              </div>
            ) : overview.error ? (
              <ErrorCard message={overview.error} />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={classDistData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => [v.toLocaleString(), 'Samples']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {classDistData.map((entry) => (
                      <Cell key={entry.key} fill={BEAN_CLASS_COLORS[entry.key] || '#166534'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Model comparison */}
        <div className="card">
          <div className="card-header">
            <SectionHeader
              title="Model Comparison"
              subtitle="Cross-validation F1 & Accuracy (%) on training data"
            />
          </div>
          <div className="card-body">
            {evaluation.loading ? (
              <div className="h-52 flex items-center justify-center">
                <div className="skeleton w-full h-full rounded" />
              </div>
            ) : evaluation.error ? (
              <ErrorCard message={evaluation.error} onRetry={evaluation.refetch} />
            ) : modelComparisonData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No comparison data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={modelComparisonData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[80, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    formatter={(v) => [`${v}%`]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="CV F1" fill="#166534" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="CV Acc" fill="#86efac" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { to: '/classify', icon: Microscope, label: 'Classify a Bean',
              desc: 'Enter 16 measurements and get a prediction' },
            { to: '/features', icon: BarChart3, label: 'Feature Explorer',
              desc: 'Explore per-class feature statistics' },
            { to: '/performance', icon: Activity, label: 'Model Performance',
              desc: 'Confusion matrix, CV scores, and more' },
          ].map(({ to, icon: Icon, label, desc }) => (
            <Link
              key={to}
              to={to}
              className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-forest-300
                hover:bg-forest-50 transition-colors group"
            >
              <div className="p-2 bg-forest-100 rounded-lg shrink-0 group-hover:bg-forest-200 transition-colors">
                <Icon className="w-4 h-4 text-forest-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 ml-auto self-center group-hover:text-forest-500 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Info note */}
      <div className="alert-info">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
        <p className="text-xs">
          All metrics are calculated from the actual UCI Dry Bean Dataset.
          Model selection uses macro-F1 on stratified cross-validation to ensure fair evaluation across all 7 classes.
          The best model is evaluated <strong>once</strong> on a held-out test set (20% split, seed 42).
        </p>
      </div>
    </div>
  )
}

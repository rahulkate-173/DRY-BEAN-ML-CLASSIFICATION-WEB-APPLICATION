import { useState } from 'react'
import { Activity, Info, HelpCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts'
import api from '../api/client'
import { useFetch } from '../hooks/useFetch'
import { LoadingCard, ErrorCard, SectionHeader, MetricBadge } from '../components/UI'
import { BEAN_CLASS_LABELS, BEAN_CLASS_COLORS } from '../utils/features'

const COLORS = ['#166534','#15803d','#16a34a','#4ade80','#86efac','#3d6e44','#518a58']

// Heatmap cell helper
function HeatCell({ value, max }) {
  const pct = max > 0 ? value / max : 0
  const bg = pct > 0.7 ? '#166534' : pct > 0.3 ? '#4ade80' : pct > 0 ? '#dcfce7' : '#f9fafb'
  const fg = pct > 0.5 ? '#fff' : '#111'
  return (
    <td
      className="text-center text-xs font-mono px-1 py-1.5 border border-gray-100 min-w-[42px]"
      style={{ background: bg, color: fg }}
    >
      {value}
    </td>
  )
}

export default function ModelPerformance() {
  const evaluation = useFetch(() => api.evaluation())
  const cm = useFetch(() => api.confusionMatrix())
  const fi = useFetch(() => api.featureImportance())

  const evalData = evaluation.data
  const cmData = cm.data
  const fiData = fi.data

  // Model comparison chart data
  const compChartData = evalData?.model_comparison?.map((m) => ({
    name: (m.model || '').replace('_Calibrated', '').replace('HistGradientBoosting', 'HGB'),
    'F1': +(m.cv_f1_macro_mean * 100).toFixed(1),
    'Accuracy': +(m.cv_accuracy_mean * 100).toFixed(1),
    isBest: m.model === evalData?.best_model,
  })) || []

  // Per-class report
  const perClass = evalData?.test_metrics?.per_class_report || {}
  const classRows = Object.entries(perClass).filter(
    ([k]) => !['accuracy', 'macro avg', 'weighted avg'].includes(k)
  )

  // Feature importance
  const fiImportances = fiData?.importances || {}
  const fiSorted = Object.entries(fiImportances)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 16)
  const fiChartData = fiSorted.map(([feat, val]) => ({
    feature: feat,
    importance: +(val * 100).toFixed(3),
  }))

  // Confusion matrix max (for heat coloring)
  const cmMatrix = cmData?.matrix || []
  const cmLabels = cmData?.class_labels || []
  const cmMax = cmMatrix.flat ? Math.max(...(cmMatrix.flat() || [1]), 1) : 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-forest-700" />
          Model Performance
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          All metrics are from the held-out test set (20% stratified split, seed 42).
        </p>
      </div>

      {/* Macro-F1 explanation */}
      <div className="alert-info">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
        <p className="text-xs">
          <strong>Why Macro-F1?</strong> With 7 bean classes of unequal size, accuracy alone can be misleading.
          Macro-F1 averages the F1 score per class equally — giving minority classes the same weight as majority ones.
          This makes it the primary model selection metric here.
        </p>
      </div>

      {/* ---- Test set summary ---- */}
      {evaluation.loading ? (
        <LoadingCard rows={3} label="Loading evaluation metrics…" />
      ) : evaluation.error ? (
        <ErrorCard message={evaluation.error} onRetry={evaluation.refetch} />
      ) : (
        <>
          <div className="card">
            <div className="card-header">
              <SectionHeader
                title={`Best Model: ${evalData?.best_model?.replace('_Calibrated', '') || '—'}`}
                subtitle="Held-out test set results (not used for model selection)"
              />
            </div>
            <div className="card-body grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { label: 'Accuracy', val: evalData?.test_metrics?.accuracy },
                { label: 'Macro F1', val: evalData?.test_metrics?.f1_macro },
                { label: 'Weighted F1', val: evalData?.test_metrics?.f1_weighted },
                { label: 'Precision (macro)', val: evalData?.test_metrics?.precision_macro },
                { label: 'Recall (macro)', val: evalData?.test_metrics?.recall_macro },
              ].map(({ label, val }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <MetricBadge value={val} />
                </div>
              ))}
            </div>
          </div>

          {/* Training/test split */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <p className="text-xs text-gray-500">Training Samples</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {evalData?.training_samples?.toLocaleString() || '—'}
              </p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-gray-500">Test Samples</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {evalData?.test_samples?.toLocaleString() || '—'}
              </p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-gray-500">CV Folds</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {evalData?.cv_folds || '—'}
              </p>
            </div>
          </div>

          {/* Model comparison chart */}
          <div className="card">
            <div className="card-header">
              <SectionHeader
                title="Model Comparison (Cross-Validation)"
                subtitle="Trained on 80% split. Best model selected by Macro-F1."
              />
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={compChartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[80, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => [`${v}%`]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="F1" fill="#166534" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Accuracy" fill="#86efac" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Full comparison table */}
          <div className="card">
            <div className="card-header">
              <SectionHeader title="Full Model Comparison Table" />
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>CV F1 (macro)</th>
                    <th>CV Accuracy</th>
                    <th>CV Precision</th>
                    <th>CV Recall</th>
                  </tr>
                </thead>
                <tbody>
                  {evalData?.model_comparison?.map((m, i) => (
                    <tr key={i} className={m.model === evalData?.best_model ? 'bg-forest-50' : ''}>
                      <td className="font-medium">
                        {m.model?.replace('_Calibrated', '') || '—'}
                        {m.model === evalData?.best_model && (
                          <span className="ml-2 badge-green text-xs">Best</span>
                        )}
                      </td>
                      <td><MetricBadge value={m.cv_f1_macro_mean} /></td>
                      <td><MetricBadge value={m.cv_accuracy_mean} /></td>
                      <td><MetricBadge value={m.cv_precision_macro_mean} /></td>
                      <td><MetricBadge value={m.cv_recall_macro_mean} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-class metrics */}
          {classRows.length > 0 && (
            <div className="card">
              <div className="card-header">
                <SectionHeader
                  title="Per-Class Metrics (Test Set)"
                  subtitle="Precision, Recall, and F1 for each bean variety"
                />
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Precision</th>
                      <th>Recall</th>
                      <th>F1-Score</th>
                      <th>Support</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classRows.map(([cls, metrics]) => (
                      <tr key={cls}>
                        <td>
                          <span className="flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ background: BEAN_CLASS_COLORS[cls] || '#ccc' }}
                            />
                            {BEAN_CLASS_LABELS[cls] || cls}
                          </span>
                        </td>
                        <td><MetricBadge value={metrics.precision} /></td>
                        <td><MetricBadge value={metrics.recall} /></td>
                        <td><MetricBadge value={metrics['f1-score']} /></td>
                        <td className="font-mono text-sm">{metrics.support?.toLocaleString()}</td>
                      </tr>
                    ))}
                    {/* averages */}
                    {['macro avg', 'weighted avg'].map((k) => perClass[k] ? (
                      <tr key={k} className="bg-gray-50 font-medium">
                        <td className="text-gray-600 capitalize">{k}</td>
                        <td><MetricBadge value={perClass[k].precision} /></td>
                        <td><MetricBadge value={perClass[k].recall} /></td>
                        <td><MetricBadge value={perClass[k]['f1-score']} /></td>
                        <td className="font-mono text-sm">{perClass[k].support?.toLocaleString()}</td>
                      </tr>
                    ) : null)}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ---- Confusion Matrix ---- */}
      <div className="card">
        <div className="card-header">
          <SectionHeader
            title="Confusion Matrix"
            subtitle="Predicted (columns) vs Actual (rows) — test set only"
          />
        </div>
        <div className="card-body">
          {cm.loading ? (
            <LoadingCard rows={4} label="Loading confusion matrix…" />
          ) : cm.error ? (
            <ErrorCard message={cm.error} />
          ) : cmMatrix.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No confusion matrix data.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse mx-auto">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-gray-500 text-left">Actual ↓ / Predicted →</th>
                    {cmLabels.map((l) => (
                      <th key={l} className="px-1 py-1 text-gray-600 text-center min-w-[42px]">
                        {BEAN_CLASS_LABELS[l] || l}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cmMatrix.map((row, ri) => (
                    <tr key={ri}>
                      <td className="px-2 py-1 font-medium text-gray-700 whitespace-nowrap pr-3">
                        {BEAN_CLASS_LABELS[cmLabels[ri]] || cmLabels[ri]}
                      </td>
                      {row.map((val, ci) => (
                        <HeatCell key={ci} value={val} max={cmMax} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-3 text-center">
                Darker green = more predictions. Diagonal = correct classifications.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ---- Feature Importance ---- */}
      {fiSorted.length > 0 && (
        <div className="card">
          <div className="card-header">
            <SectionHeader
              title="Feature Importance"
              subtitle={fiData?.method || 'Feature importance ranking'}
            />
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={Math.max(300, fiSorted.length * 24)}>
              <BarChart
                data={fiChartData}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 80, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} unit="%" />
                <YAxis dataKey="feature" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Importance']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Bar dataKey="importance" fill="#166534" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-400 mt-2">
              Method: {fiData?.method || 'N/A'}. Importance values are relative within the model.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

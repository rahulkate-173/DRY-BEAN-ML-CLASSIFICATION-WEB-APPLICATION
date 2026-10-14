import { useState, useCallback } from 'react'
import {
  Microscope, RefreshCw, Zap, AlertTriangle, CheckCircle, Info
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import api from '../api/client'
import { useFetch } from '../hooks/useFetch'
import { LoadingCard, ErrorCard, Spinner, Tooltip as UITooltip } from '../components/UI'
import {
  FEATURE_GROUPS, FEATURE_METADATA, FEATURE_NAMES,
  BEAN_CLASS_COLORS, BEAN_CLASS_LABELS, getFeatureLabel, formatValue
} from '../utils/features'

const DEFAULT_VALUES = Object.fromEntries(FEATURE_NAMES.map((f) => [f, '']))

function FeatureInput({ name, value, onChange, featureStats, errors }) {
  const meta = FEATURE_METADATA[name]
  const stats = featureStats?.[name]
  const hasError = !!errors[name]

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <label htmlFor={`feat-${name}`} className="label mb-0">
          {meta?.label || name}
        </label>
        {meta?.description && (
          <UITooltip text={`${meta.description}${meta.unit ? ` (${meta.unit})` : ''}`}>
            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
          </UITooltip>
        )}
      </div>
      <input
        id={`feat-${name}`}
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={stats ? `e.g. ${stats.mean?.toFixed(2)}` : ''}
        className={`input-field text-sm ${hasError ? 'error' : ''}`}
      />
      {stats && (
        <p className="text-xs text-gray-400">
          Range: {formatValue(stats.min, name)} – {formatValue(stats.max, name)} {meta?.unit ? `(${meta.unit})` : ''}
        </p>
      )}
      {hasError && (
        <p className="text-xs text-red-500">{errors[name]}</p>
      )}
    </div>
  )
}

function validate(values) {
  const errs = {}
  for (const name of FEATURE_NAMES) {
    const raw = values[name]
    if (raw === '' || raw === null || raw === undefined) {
      errs[name] = 'Required'
      continue
    }
    const num = parseFloat(raw)
    if (isNaN(num) || !isFinite(num)) {
      errs[name] = 'Must be a finite number'
    }
  }
  return errs
}

export default function Classify() {
  const [values, setValues] = useState(DEFAULT_VALUES)
  const [errors, setErrors] = useState({})
  const [result, setResult] = useState(null)
  const [predicting, setPredicting] = useState(false)
  const [predError, setPredError] = useState(null)
  const [loadingExample, setLoadingExample] = useState(false)

  const featStats = useFetch(() => api.statsFeatures())

  const handleChange = useCallback((name, val) => {
    setValues((v) => ({ ...v, [name]: val }))
    setErrors((e) => ({ ...e, [name]: undefined }))
  }, [])

  const handleReset = () => {
    setValues(DEFAULT_VALUES)
    setErrors({})
    setResult(null)
    setPredError(null)
  }

  const handleFillExample = async () => {
    setLoadingExample(true)
    try {
      const sample = await api.datasetSample()
      const mapped = {}
      for (const name of FEATURE_NAMES) {
        mapped[name] = sample[name] !== undefined ? String(sample[name]) : ''
      }
      setValues(mapped)
      setErrors({})
      setResult(null)
      setPredError(null)
    } catch (err) {
      setPredError(err.message)
    } finally {
      setLoadingExample(false)
    }
  }

  const handlePredict = async () => {
    const errs = validate(values)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setPredicting(true)
    setPredError(null)
    setResult(null)
    try {
      const payload = {}
      for (const name of FEATURE_NAMES) payload[name] = parseFloat(values[name])
      const res = await api.predict(payload)
      setResult(res)
    } catch (err) {
      setPredError(err.message)
    } finally {
      setPredicting(false)
    }
  }

  const probaData = result?.probabilities
    ? Object.entries(result.probabilities).map(([cls, prob]) => ({
        name: BEAN_CLASS_LABELS[cls] || cls,
        key: cls,
        probability: +(prob * 100).toFixed(2),
      })).sort((a, b) => b.probability - a.probability)
    : []

  const globalStats = featStats.data?.feature_stats || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Microscope className="w-5 h-5 text-forest-700" />
          Bean Classification
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter all 16 morphological measurements to classify the bean variety.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-3 space-y-6">
          {featStats.loading ? (
            <LoadingCard label="Loading feature ranges…" />
          ) : (
            Object.entries(FEATURE_GROUPS).map(([group, fields]) => (
              <div key={group} className="card">
                <div className="card-header">
                  <h2 className="text-sm font-semibold text-gray-700">{group} Features</h2>
                </div>
                <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {fields.map((name) => (
                    <FeatureInput
                      key={name}
                      name={name}
                      value={values[name]}
                      onChange={handleChange}
                      featureStats={globalStats}
                      errors={errors}
                    />
                  ))}
                </div>
              </div>
            ))
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button onClick={handlePredict} disabled={predicting} className="btn-primary">
              {predicting ? <Spinner size="sm" /> : <Zap className="w-4 h-4" />}
              {predicting ? 'Predicting…' : 'Predict'}
            </button>
            <button
              onClick={handleFillExample}
              disabled={loadingExample}
              className="btn-accent"
            >
              {loadingExample ? <Spinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
              Fill Example
            </button>
            <button onClick={handleReset} className="btn-secondary">
              Reset
            </button>
          </div>

          {Object.keys(errors).some((k) => errors[k]) && (
            <div className="alert-error">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Please fix the highlighted fields before predicting.</span>
            </div>
          )}

          {predError && (
            <div className="alert-error">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{predError}</span>
            </div>
          )}
        </div>

        {/* Results panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Prediction result */}
          {result ? (
            <>
              <div className="card p-5 border-l-4 border-forest-500">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-forest-100 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-forest-700" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Predicted Class</p>
                    <p className="text-2xl font-bold text-forest-800 mt-0.5">
                      {BEAN_CLASS_LABELS[result.predicted_class] || result.predicted_class}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Confidence: <span className="font-semibold text-forest-700">
                        {(result.confidence * 100).toFixed(1)}%
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Model v{result.model_version}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-3 leading-relaxed border-t border-gray-100 pt-3">
                  {result.interpretation}
                </p>
              </div>

              {/* Range warnings */}
              {result.range_warnings?.length > 0 && (
                <div className="alert-warning">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-xs mb-1">Input Range Warnings</p>
                    <ul className="text-xs space-y-0.5">
                      {result.range_warnings.map((w, i) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                    <p className="text-xs mt-1 opacity-80">
                      Prediction was still made. Inputs outside training range may reduce confidence.
                    </p>
                  </div>
                </div>
              )}

              {/* Probability chart */}
              {probaData.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <p className="text-sm font-semibold text-gray-700">Class Probabilities</p>
                  </div>
                  <div className="card-body">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={probaData}
                        layout="vertical"
                        margin={{ top: 0, right: 16, left: 4, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" width={68} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(v) => [`${v}%`, 'Probability']}
                          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                        />
                        <Bar dataKey="probability" radius={[0, 4, 4, 0]}>
                          {probaData.map((entry) => (
                            <Cell
                              key={entry.key}
                              fill={entry.key === result.predicted_class
                                ? '#166534'
                                : BEAN_CLASS_COLORS[entry.key] || '#86efac'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="alert-info">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                <p className="text-xs">
                  This is a statistical estimate based on machine learning.
                  It is not a definitive agricultural classification.
                </p>
              </div>
            </>
          ) : (
            <div className="card p-8 text-center border-dashed">
              <Microscope className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">
                Fill in the measurements and click <strong>Predict</strong>.
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Or use <strong>Fill Example</strong> for a sample from the dataset.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

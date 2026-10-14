/**
 * Centralized API client for BeanVision AI.
 * All backend calls go through this module.
 * The base URL is configured via VITE_API_BASE_URL environment variable.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    })
    if (!res.ok) {
      let detail = `HTTP ${res.status}`
      try {
        const body = await res.json()
        detail = body.detail || body.message || detail
      } catch {
        // ignore parse errors
      }
      throw new ApiError(detail, res.status)
    }
    return res.json()
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError(
      `Cannot reach the BeanVision AI backend at ${BASE_URL}. ` +
      'Make sure the backend server is running.',
      0
    )
  }
}

// ---- Endpoints ----

export const api = {
  /** GET /health */
  health: () => request('/health'),

  /** GET /api/model-info */
  modelInfo: () => request('/api/model-info'),

  /** POST /api/predict */
  predict: (features) => request('/api/predict', {
    method: 'POST',
    body: JSON.stringify(features),
  }),

  /** GET /api/statistics/overview */
  statsOverview: () => request('/api/statistics/overview'),

  /** GET /api/statistics/classes */
  statsClasses: () => request('/api/statistics/classes'),

  /** GET /api/statistics/features */
  statsFeatures: () => request('/api/statistics/features'),

  /** GET /api/statistics/class-ranges */
  statsClassRanges: () => request('/api/statistics/class-ranges'),

  /** GET /api/statistics/class-ranges/:className */
  statsClassRange: (className) => request(`/api/statistics/class-ranges/${encodeURIComponent(className)}`),

  /** GET /api/evaluation */
  evaluation: () => request('/api/evaluation'),

  /** GET /api/evaluation/confusion-matrix */
  confusionMatrix: () => request('/api/evaluation/confusion-matrix'),

  /** GET /api/evaluation/feature-importance */
  featureImportance: () => request('/api/evaluation/feature-importance'),

  /** GET /api/dataset/sample */
  datasetSample: () => request('/api/dataset/sample'),

  /** CSV export URL (direct link) */
  exportClassRangesUrl: () => `${BASE_URL}/api/statistics/export/class-ranges.csv`,
}

export { ApiError }
export default api

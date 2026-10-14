import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Classify from './pages/Classify'
import FeatureExplorer from './pages/FeatureExplorer'
import ModelPerformance from './pages/ModelPerformance'
import DatasetInsights from './pages/DatasetInsights'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"            element={<Dashboard />} />
        <Route path="/classify"    element={<Classify />} />
        <Route path="/features"    element={<FeatureExplorer />} />
        <Route path="/performance" element={<ModelPerformance />} />
        <Route path="/insights"    element={<DatasetInsights />} />
        <Route path="*"            element={<NotFound />} />
      </Routes>
    </Layout>
  )
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
      <p className="text-lg font-semibold text-gray-700">Page not found</p>
      <a href="/" className="btn-primary mt-6">Go to Dashboard</a>
    </div>
  )
}

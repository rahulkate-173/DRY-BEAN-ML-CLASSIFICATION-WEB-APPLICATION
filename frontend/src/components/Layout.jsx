import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import {
  LayoutDashboard, Microscope, BarChart3, Activity,
  Database, Menu, X, Leaf, ChevronRight
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/',           label: 'Dashboard',        icon: LayoutDashboard },
  { to: '/classify',   label: 'Classify Bean',     icon: Microscope },
  { to: '/features',   label: 'Feature Explorer',  icon: BarChart3 },
  { to: '/performance',label: 'Model Performance', icon: Activity },
  { to: '/insights',   label: 'Dataset Insights',  icon: Database },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-[#faf9f7]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-30
        flex flex-col transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:relative lg:flex
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <div className="w-9 h-9 bg-forest-700 rounded-xl flex items-center justify-center shrink-0">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">BeanVision AI</p>
            <p className="text-xs text-gray-400">Dry Bean Classifier</p>
          </div>
          <button
            className="ml-auto lg:hidden p-1 rounded-md hover:bg-gray-100"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Application
          </p>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 leading-relaxed">
            UCI Dry Bean Dataset<br />
            Koklu &amp; Ozkan (2020)
          </p>
          <a
            href="https://doi.org/10.1016/j.compag.2020.105507"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-forest-600 hover:text-forest-800 mt-1 block"
          >
            View paper →
          </a>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 bg-white border-b border-gray-200 z-10 flex items-center gap-3 px-4 py-3">
          <button
            className="p-1.5 rounded-md hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-forest-700" />
            <span className="font-semibold text-gray-900 text-sm">BeanVision AI</span>
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

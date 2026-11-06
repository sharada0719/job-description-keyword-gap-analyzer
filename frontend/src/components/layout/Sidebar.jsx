import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/dashboard',    label: 'Dashboard',       icon: '⊞' },
  { to: '/resumes',      label: 'My Resumes',      icon: '📄' },
  { to: '/jobs',         label: 'Job Listings',    icon: '💼' },
  { to: '/jobs/search',  label: 'Job Search',       icon: '🔍' },
  { to: '/applications', label: 'Application Tracker', icon: '📋' },
  { to: '/analysis/new', label: 'New Analysis',    icon: '⚡' },
  { to: '/analysis',     label: 'History',         icon: '📊' },
  { to: '/profile',      label: 'Profile',         icon: '👤' },
]

function NavItem({ to, label, icon, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === '/analysis' || to === '/jobs'}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
          isActive ? 'nav-active' : 'nav-idle'
        }`
      }
    >
      <span className="text-base w-5 text-center" aria-hidden="true">{icon}</span>
      {label}
    </NavLink>
  )
}

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-navy-800 border-r border-white/[0.06]">
        <SidebarContent />
      </aside>
      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col w-64 bg-navy-800 border-r border-white/[0.06]
          transform transition-transform duration-200 lg:hidden
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Sidebar navigation"
      >
        <SidebarContent onNavClick={onClose} />
      </aside>
    </>
  )
}

function SidebarContent({ onNavClick }) {
  return (
    <>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
        <div className="w-9 h-9 rounded-xl bg-gradient-purple flex items-center justify-center text-lg shadow-purple flex-shrink-0">
          📄
        </div>
        <div className="min-w-0">
          <span className="text-white font-bold text-xs leading-tight block truncate">JD Keyword Gap</span>
          <span className="block text-[10px] text-primary-400 font-medium mt-0.5">Analyzer</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} onClick={onNavClick} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/[0.06]">
        <p className="text-[10px] text-slate-600 leading-tight">
          © 2026 CareerLens AI<br />AI-Powered Career Platform
        </p>
      </div>
    </>
  )
}

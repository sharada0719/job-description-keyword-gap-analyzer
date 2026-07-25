import React from 'react'
import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/dashboard',   label: 'Dashboard',    icon: '🏠' },
  { to: '/resumes',     label: 'My Resumes',   icon: '📄' },
  { to: '/jobs',        label: 'Job Listings', icon: '💼' },
  { to: '/analysis/new', label: 'New Analysis', icon: '⚡' },
  { to: '/analysis',    label: 'History',      icon: '📊' },
  { to: '/profile',     label: 'Profile',      icon: '👤' },
]

function NavItem({ to, label, icon, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
          isActive
            ? 'bg-primary-600 text-white'
            : 'text-gray-700 hover:bg-gray-100'
        }`
      }
    >
      <span className="text-base" aria-hidden="true">{icon}</span>
      {label}
    </NavLink>
  )
}

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-gray-200 bg-white">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col w-64 bg-white border-r border-gray-200
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
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
        <span className="text-2xl" aria-hidden="true">🔍</span>
        <span className="text-lg font-bold text-gray-900">Job Gap AI</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} onClick={onNavClick} />
        ))}
      </nav>
    </>
  )
}

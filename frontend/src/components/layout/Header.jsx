import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-navy-800 border-b border-white/[0.06] flex-shrink-0">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-navy-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label="Open sidebar"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile brand */}
      <div className="flex lg:hidden items-center gap-2">
        <span className="text-white font-bold text-sm">JD Gap Analyzer</span>
      </div>

      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-purple flex items-center justify-center text-white text-xs font-bold">
              {user.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span className="text-sm text-slate-300 font-medium">{user.full_name}</span>
          </div>
        )}
        <Link
          to="/profile"
          className="text-sm text-slate-400 hover:text-primary-400 font-medium transition-colors"
        >
          Profile
        </Link>
        <button
          onClick={logout}
          className="text-sm text-slate-500 hover:text-coral-400 font-medium transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}

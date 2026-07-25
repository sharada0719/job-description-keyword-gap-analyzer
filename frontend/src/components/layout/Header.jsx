import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label="Open sidebar"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex-1 lg:flex-none" />

      <div className="flex items-center gap-4">
        {user && (
          <span className="hidden sm:block text-sm text-gray-600">
            {user.full_name}
          </span>
        )}
        <Link
          to="/profile"
          className="text-sm text-gray-600 hover:text-primary-600 font-medium"
        >
          Profile
        </Link>
        <button
          onClick={logout}
          className="text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}

import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4">
      <div className="text-center">
        <p className="text-8xl font-bold text-gradient">404</p>
        <h1 className="mt-4 text-2xl font-bold text-white">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The page you're looking for doesn't exist.
        </p>
        <Link to="/dashboard" className="btn-gradient mt-8 inline-flex">
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}

import React from 'react'

const variants = {
  error:   'bg-red-50   border-red-300   text-red-800',
  success: 'bg-green-50 border-green-300 text-green-800',
  warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
  info:    'bg-blue-50  border-blue-300  text-blue-800',
}

export default function Alert({ variant = 'error', message, className = '' }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className={`rounded-lg border px-4 py-3 text-sm ${variants[variant]} ${className}`}
    >
      {message}
    </div>
  )
}

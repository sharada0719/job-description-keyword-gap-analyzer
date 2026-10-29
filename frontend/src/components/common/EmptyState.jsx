export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="mb-4 w-16 h-16 rounded-2xl bg-navy-500 border border-white/[0.07] flex items-center justify-center text-3xl">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 mb-6 max-w-xs">{description}</p>
      )}
      {action}
    </div>
  )
}

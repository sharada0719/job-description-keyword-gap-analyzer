export default function SuggestionList({ suggestions }) {
  if (!suggestions?.length) return null

  return (
    <div className="space-y-2.5">
      {suggestions.map((s, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-navy-500 border border-white/[0.06] text-sm">
          <span className="flex-shrink-0 mt-0.5 text-primary-400" aria-hidden="true">💡</span>
          <span className="text-slate-300">{s}</span>
        </div>
      ))}
    </div>
  )
}

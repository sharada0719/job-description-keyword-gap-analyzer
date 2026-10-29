import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function KeywordBarChart({ matchedKeywords, maxItems = 10 }) {
  const top = [...matchedKeywords]
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems)

  const data = {
    labels: top.map((k) => k.keyword),
    datasets: [
      {
        label: 'Match Score',
        data: top.map((k) => Math.round(k.score * 100)),
        backgroundColor: top.map((k) =>
          k.score >= 0.75 ? 'rgba(34,197,94,0.7)' : 'rgba(124,58,237,0.65)'
        ),
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  }

  const options = {
    indexAxis: 'y',
    responsive: true,
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        ticks: { color: '#64748B', callback: (v) => `${v}%` },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
      y: {
        ticks: { color: '#94A3B8', font: { size: 11 } },
        grid: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111F33',
        borderColor: 'rgba(124,58,237,0.4)',
        borderWidth: 1,
        titleColor: '#E2E8F0',
        bodyColor: '#94A3B8',
        callbacks: { label: (ctx) => ` ${ctx.parsed.x}% match` },
      },
    },
  }

  if (!top.length) {
    return <p className="text-sm text-slate-500 py-4">No matched keywords to display.</p>
  }

  return <Bar data={data} options={options} />
}

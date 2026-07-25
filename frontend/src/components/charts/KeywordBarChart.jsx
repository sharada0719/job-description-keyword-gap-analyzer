import React from 'react'
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

/**
 * Horizontal bar chart showing the top N matched keywords with their
 * semantic similarity scores.
 */
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
          k.score >= 0.75 ? 'rgba(34,197,94,0.7)' : 'rgba(59,130,246,0.7)'
        ),
        borderRadius: 4,
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
        ticks: { callback: (v) => `${v}%` },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.parsed.x}% match`,
        },
      },
    },
  }

  if (!top.length) {
    return <p className="text-sm text-gray-500 py-4">No matched keywords to display.</p>
  }

  return <Bar data={data} options={options} />
}

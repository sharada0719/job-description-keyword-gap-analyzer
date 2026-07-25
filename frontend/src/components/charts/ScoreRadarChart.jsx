import React from 'react'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Radar } from 'react-chartjs-2'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

export default function ScoreRadarChart({ analysis }) {
  const data = {
    labels: ['Overall Score', 'Semantic Similarity', 'Keyword Match'],
    datasets: [
      {
        label: 'Your Resume',
        data: [
          Math.round(analysis.overall_score * 100),
          Math.round(analysis.semantic_similarity_score * 100),
          Math.round(analysis.keyword_match_score * 100),
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor:     'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
      },
    ],
  }

  const options = {
    responsive: true,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 25, font: { size: 11 } },
        pointLabels: { font: { size: 12 } },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.parsed.r}%`,
        },
      },
    },
  }

  return <Radar data={data} options={options} />
}

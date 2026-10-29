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
  const hasAts = Boolean(analysis.ats_report)
  const labels = hasAts
    ? ['Overall', 'Semantic Sim.', 'Keyword Match', 'ATS']
    : ['Overall', 'Semantic Sim.', 'Keyword Match']

  const dataValues = [
    Math.round(analysis.overall_score * 100),
    Math.round(analysis.semantic_similarity_score * 100),
    Math.round(analysis.keyword_match_score * 100),
  ]
  if (hasAts) dataValues.push(Math.round(analysis.ats_report.score * 100))

  const data = {
    labels,
    datasets: [
      {
        label: 'Your Resume',
        data: dataValues,
        backgroundColor: 'rgba(124,58,237,0.15)',
        borderColor:     'rgba(139,92,246,0.9)',
        borderWidth: 2,
        pointBackgroundColor: '#7C3AED',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#A78BFA',
        pointRadius: 4,
      },
    ],
  }

  const options = {
    responsive: true,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 25,
          font: { size: 10 },
          color: 'rgba(148,163,184,0.5)',
          backdropColor: 'transparent',
        },
        pointLabels: { font: { size: 11 }, color: '#94A3B8' },
        grid:    { color: 'rgba(255,255,255,0.06)' },
        angleLines: { color: 'rgba(255,255,255,0.06)' },
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
        callbacks: { label: (ctx) => ` ${ctx.parsed.r}%` },
      },
    },
  }

  return <Radar data={data} options={options} />
}

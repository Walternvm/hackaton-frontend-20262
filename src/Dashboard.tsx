import { useEffect, useState } from 'react'
import { getDashboardData } from './api'
import type { DashboardData } from './api'

interface DashboardProps {
  onLogout: () => void
}

const numberFormat = new Intl.NumberFormat('es-PE')

export default function Dashboard({ onLogout }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const result = await getDashboardData(controller.signal)

        if (controller.signal.aborted) return

        if (!result) {
          onLogout()
          return
        }

        setData(result)
      } catch (error: unknown) {
        if (controller.signal.aborted) return

        setError(
          error instanceof Error
            ? error.message
            : 'No se pudo conectar con el servidor.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => controller.abort()
  }, [attempt, onLogout])

  if (loading) {
    return <p role="status">Cargando dashboard…</p>
  }

  if (error) {
    return (
      <div>
        <p role="alert" className="text-red-400">
          {error}
        </p>
        <button
          type="button"
          onClick={() => setAttempt((previous) => previous + 1)}
          className="mt-4 rounded-lg bg-amber-400 px-4 py-2 font-bold text-slate-950"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!data) {
    return <p>No hay información disponible.</p>
  }

  const { summary, logPose } = data

  const metrics = [
    { label: 'Carteles', value: summary.wanted.total },
    { label: 'Tripulaciones', value: summary.crews.total },
    { label: 'Recompensa total', value: summary.wanted.totalBounty },
    { label: 'Recompensa promedio', value: summary.wanted.averageBounty },
  ]

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{summary.team.name}</h1>
          <p className="mt-1 text-slate-400">{summary.team.code}</p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg bg-slate-700 px-4 py-2 hover:bg-slate-600"
        >
          Cerrar sesión
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-xl border border-slate-700 bg-slate-800 p-5"
          >
            <h2 className="text-sm text-slate-400">{metric.label}</h2>
            <p className="mt-2 break-words text-2xl font-bold">
              {numberFormat.format(metric.value)}
            </p>
          </article>
        ))}
      </div>

      {summary.wanted.total === 0 && (
        <p>No hay carteles registrados en esta tripulación.</p>
      )}

      <section className="rounded-xl border border-slate-700 p-5">
        <h2 className="font-bold">Estado de los carteles</h2>
        <ul className="mt-3 space-y-2 text-slate-300">
          <li>Prófugos: {summary.wanted.byStatus.AT_LARGE}</li>
          <li>Capturados: {summary.wanted.byStatus.CAPTURED}</li>
          <li>Desaparecidos: {summary.wanted.byStatus.MISSING}</li>
        </ul>
      </section>

      <section className="rounded-xl border border-slate-700 p-5">
        <h2 className="font-bold">
          Log Pose: {logPose.grandLineUnlocked ? 'Desbloqueado' : 'Bloqueado'}
        </h2>
        <p className="mt-2 text-slate-300">{logPose.message}</p>
        <button
          type="button"
          onClick={() => setAttempt((previous) => previous + 1)}
          className="mt-4 rounded-lg bg-slate-700 px-4 py-2 hover:bg-slate-600"
        >
          Actualizar datos
        </button>
      </section>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getWantedDetail } from './api'
import type { WantedDetailData } from './api'

const numbers = new Intl.NumberFormat('es-PE')
function date(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('es-PE')
}

export default function WantedDetail({ onLogout }: { onLogout: () => void }) {
  const { id = '' } = useParams()
  const location = useLocation()
  const [attempt, setAttempt] = useState(0)
  const key = id + '|' + attempt
  const [result, setResult] = useState<{ key: string; data: WantedDetailData } | null>(null)
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const data = await getWantedDetail(id, controller.signal)
        if (controller.signal.aborted) return
        if (data === null) { onLogout(); return }
        setResult({ key, data })
        setFailure(null)
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setFailure({ key, message: error instanceof Error ? error.message : 'Error de conexión.' })
        }
      }
    }
    void load()
    return () => controller.abort()
  }, [id, key, onLogout])

  const data = result?.key === key ? result.data : null
  const error = failure?.key === key ? failure.message : ''

  return <div className="space-y-5">
    <Link to={'/wanted' + location.search} className="text-amber-400 underline">Volver al listado</Link>
    {error ? <div>
      <p role="alert" className="text-red-400">{error}</p>
      <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-3 rounded-lg bg-slate-700 px-4 py-2">Reintentar</button>
    </div> : !data ? <p role="status">Cargando detalle…</p> : <>
      <header>
        <p className="font-bold tracking-widest text-amber-400">SE BUSCA</p>
        <h1 className="mt-2 text-3xl font-bold">{data.name}</h1>
        <p className="text-slate-400">“{data.epithet}”</p>
        <p className="mt-4 text-3xl font-bold text-amber-400">฿ {numbers.format(data.bounty)}</p>
      </header>
      <p className="leading-relaxed text-slate-300">{data.bio}</p>
      <dl className="grid gap-4 rounded-xl bg-slate-800 p-5 sm:grid-cols-2">
        {[
          ['Tripulación', data.crew.name], ['Rol', data.role],
          ['Estado', data.status], ['Edad', data.age + ' años'],
          ['Altura', data.heightCm + ' cm'], ['Amenaza', data.threatLevel + '/5'],
          ['Fruta', data.devilFruit?.name ?? 'Sin fruta'],
          ['Última ubicación', data.lastSeen.island + ' · ' + date(data.lastSeen.seenAt)],
        ].map(([label, value]) => <div key={label}><dt className="text-sm text-slate-400">{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <section>
        <h2 className="mb-3 text-xl font-bold">Historial de recompensas</h2>
        {data.bountyHistory.length === 0 ? <p>No hay historial disponible.</p> :
          <ul className="space-y-2">{data.bountyHistory.map((entry, index) =>
            <li key={entry.issuedAt + '-' + index} className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-800 p-3">
              <span>{date(entry.issuedAt)}</span><strong>฿ {numbers.format(entry.amount)}</strong>
            </li>)}
          </ul>}
      </section>
    </>}
  </div>
}


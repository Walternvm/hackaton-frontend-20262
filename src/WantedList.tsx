import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Outlet, useMatch, useSearchParams } from 'react-router-dom'
import { getCrews, getWantedPage } from './api'
import type { Crew, WantedPage } from './api'

const numbers = new Intl.NumberFormat('es-PE')
const statuses = ['AT_LARGE', 'CAPTURED', 'MISSING']
const fruits = ['PARAMECIA', 'ZOAN', 'LOGIA', 'NONE']
const sorts = ['bounty,desc', 'name,asc', 'updatedAt,desc']
const labels: Record<string, string> = {
  AT_LARGE: 'Prófugo', CAPTURED: 'Capturado', MISSING: 'Desaparecido',
  NONE: 'Sin fruta', PARAMECIA: 'Paramecia', ZOAN: 'Zoan', LOGIA: 'Logia',
  'bounty,desc': 'Mayor recompensa', 'name,asc': 'Nombre A–Z',
  'updatedAt,desc': 'Actualización reciente',
}
const control = 'w-full rounded-lg border border-slate-600 bg-slate-800 p-3'
const button = 'rounded-lg bg-slate-700 px-4 py-2 disabled:opacity-40'

export default function WantedList({ onLogout }: { onLogout: () => void }) {
  const [params, setParams] = useSearchParams()
  const isDetail = useMatch('/wanted/:id') !== null
  const [attempt, setAttempt] = useState(0)
  const [crewAttempt, setCrewAttempt] = useState(0)
  const [crews, setCrews] = useState<Crew[] | null>(null)
  const [crewError, setCrewError] = useState('')
  const [result, setResult] = useState<{ key: string; data: WantedPage } | null>(null)
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null)

  const rawPage = params.get('page') ?? '0'
  const numberPage = Number(rawPage)
  const page = /^\d+$/.test(rawPage) && Number.isSafeInteger(numberPage) && numberPage <= 100000
    ? numberPage : 0
  const size = ['10', '20', '50'].includes(params.get('size') ?? '') ? params.get('size')! : '10'
  const status = statuses.includes(params.get('status') ?? '') ? params.get('status')! : ''
  const fruit = fruits.includes(params.get('fruit') ?? '') ? params.get('fruit')! : ''
  const sort = sorts.includes(params.get('sort') ?? '') ? params.get('sort')! : 'bounty,desc'
  const q = (params.get('q') ?? '').trim()
  const rawCrew = params.get('crewId') ?? ''
  const crewId = /^crw_[a-zA-Z0-9_-]+$/.test(rawCrew) &&
    (crews === null || crews.some((crew) => crew.id === rawCrew)) ? rawCrew : ''
  const normalized = new URLSearchParams({ page: String(page), size, sort })
  if (status) normalized.set('status', status)
  if (fruit) normalized.set('fruit', fruit)
  if (crewId) normalized.set('crewId', crewId)
  if (q) normalized.set('q', q)
  const query = normalized.toString()
  const rawQuery = params.toString()
  const requestKey = query + '|' + attempt
  const waitingForCrew = Boolean(rawCrew && crews === null && !crewError)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setCrewError('')
      try {
        const data = await getCrews(controller.signal)
        if (controller.signal.aborted) return
        if (data === null) { onLogout(); return }
        setCrews(data)
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setCrewError(error instanceof Error ? error.message : 'Error al cargar tripulaciones.')
        }
      }
    }
    void load()
    return () => controller.abort()
  }, [onLogout, crewAttempt])

  useEffect(() => {
    if (!waitingForCrew && rawQuery !== query) setParams(query, { replace: true })
  }, [waitingForCrew, rawQuery, query, setParams])

  useEffect(() => {
    if (waitingForCrew) return
    const controller = new AbortController()
    async function load() {
      try {
        const data = await getWantedPage(query, controller.signal)
        if (controller.signal.aborted) return
        if (data === null) { onLogout(); return }
        const lastPage = Math.max(0, data.totalPages - 1)
        if (page > lastPage) {
          const corrected = new URLSearchParams(query)
          corrected.set('page', String(lastPage))
          setParams(corrected, { replace: true })
          return
        }
        setResult({ key: requestKey, data })
        setFailure(null)
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setFailure({ key: requestKey, message: error instanceof Error ? error.message : 'Error de conexión.' })
        }
      }
    }
    void load()
    return () => controller.abort()
  }, [waitingForCrew, query, requestKey, page, onLogout, setParams])

  function change(name: string, value: string) {
    const next = new URLSearchParams(query)
    if (value) next.set(name, value)
    else next.delete(name)
    if (name !== 'page') next.set('page', '0')
    setParams(next)
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    change('q', String(new FormData(event.currentTarget).get('q') ?? '').trim())
  }

  const data = result?.key === requestKey ? result.data : null
  const error = failure?.key === requestKey ? failure.message : ''
  const loading = waitingForCrew || (!data && !error)

  return (
    <>
      <div hidden={isDetail} className="space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/dashboard" className="text-amber-400 underline">Volver al dashboard</Link>
            <h1 className="mt-2 text-3xl font-bold">Se busca</h1>
          </div>
          <button type="button" onClick={onLogout} className={button}>Cerrar sesión</button>
        </header>

        <form key={q} onSubmit={search} className="flex gap-2">
          <input name="q" defaultValue={q} aria-label="Buscar por nombre o epíteto"
            placeholder="Nombre o epíteto…" className={control} />
          <button className="rounded-lg bg-amber-400 px-4 font-bold text-slate-950">Buscar</button>
        </form>
        <p className="text-sm text-slate-400">Escribe y pulsa Buscar o Enter.</p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 text-sm">Estado
            <select aria-label="Estado" value={status} onChange={(e) => change('status', e.target.value)} className={control}>
              <option value="">Todos</option>
              {statuses.map((value) => <option key={value} value={value}>{labels[value]}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">Tripulación
            <select aria-label="Tripulación" value={crewId} disabled={crews === null}
              onChange={(e) => change('crewId', e.target.value)} className={control}>
              <option value="">{crews === null ? 'Cargando…' : 'Todas'}</option>
              {crews?.map((crew) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">Tipo de fruta
            <select aria-label="Tipo de fruta" value={fruit} onChange={(e) => change('fruit', e.target.value)} className={control}>
              <option value="">Todas</option>
              {fruits.map((value) => <option key={value} value={value}>{labels[value]}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">Orden
            <select aria-label="Orden" value={sort} onChange={(e) => change('sort', e.target.value)} className={control}>
              {sorts.map((value) => <option key={value} value={value}>{labels[value]}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">Por página
            <select aria-label="Por página" value={size} onChange={(e) => change('size', e.target.value)} className={control}>
              {[10, 20, 50].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setParams({ page: '0', size, sort: 'bounty,desc' })} className={button}>Limpiar filtros</button>
        </div>

        {crewError && <div role="alert" className="text-red-400">{crewError}{' '}
          <button type="button" onClick={() => setCrewAttempt((value) => value + 1)} className="underline">Reintentar tripulaciones</button>
        </div>}
        <p className="h-6 text-slate-400" role="status">{data ? data.totalElements + ' carteles encontrados' : loading ? 'Cargando carteles…' : 'Error al cargar'}</p>

        <div className="h-[36rem] overflow-y-auto rounded-xl border border-slate-700 p-3" aria-busy={loading}>
          {loading ? <p role="status">Cargando…</p> : error ? <div>
            <p role="alert" className="text-red-400">{error}</p>
            <button type="button" onClick={() => setAttempt((value) => value + 1)} className={button + ' mt-3'}>Reintentar</button>
          </div> : data?.content.length === 0 ? <p>No hay carteles con estos filtros.</p> :
            <div className="grid gap-4 sm:grid-cols-2">
              {data?.content.map((wanted) => <article key={wanted.id} className="rounded-xl bg-slate-800 p-5">
                <p className="text-xs font-bold tracking-widest text-amber-400">SE BUSCA</p>
                <h2 className="mt-2 text-xl font-bold">{wanted.name}</h2>
                <p className="text-slate-400">“{wanted.epithet}”</p>
                <p className="my-3 text-2xl font-bold text-amber-400">฿ {numbers.format(wanted.bounty)}</p>
                <p>{wanted.crew.name}</p>
                <p className="text-sm text-slate-400">{labels[wanted.status] ?? wanted.status}</p>
                <p className="text-sm text-slate-400">Fruta: {wanted.devilFruit?.name ?? 'Sin fruta'}</p>
                <Link to={{ pathname: '/wanted/' + wanted.id, search: '?' + query }}
                  className="mt-4 inline-block text-amber-400 underline">Ver detalle</Link>
              </article>)}
            </div>}
        </div>

        <nav aria-label="Paginación" className="flex items-center justify-between gap-2">
          <button type="button" disabled={loading || page === 0} onClick={() => change('page', String(page - 1))} className={button}>Anterior</button>
          <span>Página {page + 1}{data ? ' de ' + Math.max(1, data.totalPages) : ''}</span>
          <button type="button" disabled={loading || !data || page + 1 >= data.totalPages}
            onClick={() => change('page', String(page + 1))} className={button}>Siguiente</button>
        </nav>
      </div>
      <Outlet />
    </>
  )
}


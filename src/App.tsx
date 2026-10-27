import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { getSession, login } from './api'
import type { SessionResponse } from './api'
import Dashboard from './Dashboard'
import Register from './Register'

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

function PrivateRoute({ authenticated }: { authenticated: boolean }) {
  const location = useLocation()

  if (!authenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname + location.search + location.hash,
        }}
      />
    )
  }

  return <Outlet />
}

function AppContent() {
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [session, setSession] = useState<SessionResponse | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [restoreError, setRestoreError] = useState('')

  const state: unknown = location.state
  let returnTo = '/dashboard'

  if (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    typeof state.from === 'string' &&
    state.from.startsWith('/dashboard') &&
    state.from.split(/[?#]/)[0] === '/dashboard'
  ) {
    returnTo = state.from
  }

  useEffect(() => {
    const token = localStorage.getItem('logpose_token')

    if (!token) {
      setCheckingSession(false)
      return
    }

    const controller = new AbortController()

    async function restoreSession(savedToken: string) {
      try {
        const restored = await getSession(savedToken, controller.signal)

        if (controller.signal.aborted) return

        if (restored) {
          setSession(restored)
        } else {
          localStorage.removeItem('logpose_token')
          setSession(null)
        }
      } catch (error: unknown) {
        if (controller.signal.aborted) return

        setRestoreError(
          error instanceof Error
            ? error.message
            : 'No se pudo conectar con el servidor.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setCheckingSession(false)
        }
      }
    }

    void restoreSession(token)

    return () => controller.abort()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setLoading(true)
    setError('')

    try {
      const result = await login(email.trim(), password)

      localStorage.setItem('logpose_token', result.token)
      setSession(result)
      setPassword('')
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : 'No se pudo iniciar sesión. Intenta nuevamente.',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = useCallback(() => {
    localStorage.removeItem('logpose_token')
    setSession(null)
    setPassword('')
    setError('')
    setRestoreError('')
  }, [])

  if (checkingSession || restoreError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
        <div className="text-center">
          {checkingSession ? (
            <p role="status">Verificando sesión…</p>
          ) : (
            <>
              <p role="alert">{restoreError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-lg bg-amber-400 px-6 py-3 font-bold text-slate-950"
              >
                Reintentar
              </button>
            </>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <section
        className={`w-full rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl ${
          session ? 'max-w-5xl' : 'max-w-md'
        }`}
      >
        <p className="mb-4 text-sm font-bold tracking-widest text-amber-400">
          LOG POSE CONSOLE
        </p>

        <Routes>
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          <Route
            path="/register"
            element={
              session ? (
                <Navigate to={returnTo} replace />
              ) : (
                <Register onRegistered={setSession} />
              )
            } 
          />

          <Route
            path="/login"
            element={
              session ? (
                <Navigate to={returnTo} replace />
              ) : (
                <>
                  <h1 className="mb-6 text-2xl font-bold">
                    Inicia tu travesía
                  </h1>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="email"
                        className="mb-1 block text-sm"
                      >
                        Correo electrónico
                      </label>
                      <input
                        id="email"
                        type="email"
                        autoComplete="username"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        disabled={loading}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 focus:outline-2 focus:outline-amber-400"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="password"
                        className="mb-1 block text-sm"
                      >
                        Contraseña
                      </label>
                      <input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        disabled={loading}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 focus:outline-2 focus:outline-amber-400"
                      />
                    </div>

                    {error && (
                      <p role="alert" className="text-sm text-red-400">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-lg bg-amber-400 p-3 font-bold text-slate-950 hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60"
                    >
                      {loading ? 'Ingresando…' : 'Iniciar sesión'}
                    </button>
                  </form>
                  <p className="mt-5 text-sm text-slate-400">
                    ¿Primera vez aquí?{' '}
                    <Link
                      to="/register"
                      state={location.state}
                      className="text-amber-400 underline"
                    >
                      Registrar tripulación
                    </Link>
                  </p>
                </>
              )
            }
          />

          <Route
            element={<PrivateRoute authenticated={session !== null} />}
          >
            <Route
              path="/dashboard"
              element={<Dashboard onLogout={handleLogout} />}
            />
          </Route>

          <Route
            path="*"
            element={
              <div className="space-y-4">
                <h1 className="text-3xl font-bold">
                  404 — Página no encontrada
                </h1>
                <p className="text-slate-400">
                  Esta ruta no existe.
                </p>
                <Link
                  to="/dashboard"
                  className="inline-block rounded-lg bg-amber-400 px-4 py-2 font-bold text-slate-950"
                >
                  Volver al inicio
                </Link>
              </div>
            }
          />
        </Routes>
      </section>
    </main>
  )
}
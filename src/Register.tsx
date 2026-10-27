import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { register } from './api'
import type { SessionResponse } from './api'

interface RegisterProps {
  onRegistered: (session: SessionResponse) => void
}

interface FieldErrors {
  teamName?: string
  email?: string
  password?: string
}

export default function Register({ onRegistered }: RegisterProps) {
  const location = useLocation()
  const [teamName, setTeamName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setLoading(true)
    setError('')
    setFieldErrors({})

    try {
      const result = await register(
        teamName.trim(),
        email.trim(),
        password,
      )

      localStorage.setItem('logpose_token', result.token)
      setPassword('')
      onRegistered(result)
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo completar el registro. Intenta nuevamente.'

      if (/email|correo/i.test(message)) {
        setFieldErrors({ email: message })
      } else if (/password|contraseña/i.test(message)) {
        setFieldErrors({ password: message })
      } else if (/nombre|teamName/i.test(message)) {
        setFieldErrors({ teamName: message })
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-600 bg-slate-800 p-3 focus:outline-2 focus:outline-amber-400'

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">
        Registra tu tripulación
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="teamName" className="mb-1 block text-sm">
            Nombre de la tripulación
          </label>
          <input
            id="teamName"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            required
            disabled={loading}
            aria-invalid={Boolean(fieldErrors.teamName)}
            aria-describedby={
              fieldErrors.teamName ? 'teamName-error' : undefined
            }
            className={inputClass}
          />
          {fieldErrors.teamName && (
            <p
              id="teamName-error"
              role="alert"
              className="mt-1 text-sm text-red-400"
            >
              {fieldErrors.teamName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="registerEmail" className="mb-1 block text-sm">
            Correo electrónico
          </label>
          <input
            id="registerEmail"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={loading}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={
              fieldErrors.email ? 'registerEmail-error' : undefined
            }
            className={inputClass}
          />
          {fieldErrors.email && (
            <p
              id="registerEmail-error"
              role="alert"
              className="mt-1 text-sm text-red-400"
            >
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="registerPassword" className="mb-1 block text-sm">
            Contraseña
          </label>
          <input
            id="registerPassword"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={loading}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? 'registerPassword-error' : undefined
            }
            className={inputClass}
          />
          {fieldErrors.password && (
            <p
              id="registerPassword-error"
              role="alert"
              className="mt-1 text-sm text-red-400"
            >
              {fieldErrors.password}
            </p>
          )}
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
          {loading ? 'Registrando…' : 'Crear tripulación'}
        </button>
      </form>

      <p className="mt-5 text-sm text-slate-400">
        ¿Ya tienes cuenta?{' '}
        <Link
          to="/login"
          state={location.state}
          className="text-amber-400 underline"
        >
          Iniciar sesión
        </Link>
      </p>
    </>
  )
}
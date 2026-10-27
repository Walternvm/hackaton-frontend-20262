const API_URL = import.meta.env.VITE_API_BASE_URL

export interface AuthResponse {
  token: string
  tokenType: string
  expiresAt: string
  user: {
    id: string
    name: string
    email: string
  }
  team: {
    code: string
    name: string
  }
}

async function authenticate(
  endpoint: 'login' | 'register',
  data: {
    email: string
    password: string
    teamName?: string
  },
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: unknown = await response.json().catch(() => null)

    const message =
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string'
        ? error.message
        : `No se pudo completar la solicitud (${response.status})`

    throw new Error(message)
  }

  const result: AuthResponse = await response.json()
  return result
}

export function login(email: string, password: string) {
  return authenticate('login', { email, password })
}

export function register(
  teamName: string,
  email: string,
  password: string,
) {
  return authenticate('register', { teamName, email, password })
}

export type SessionResponse = Pick<
  AuthResponse,
  'user' | 'team' | 'expiresAt'
>

export async function getSession(
  token: string,
  signal: AbortSignal,
): Promise<SessionResponse | null> {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  })

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error('No se pudo verificar la sesión. Intenta nuevamente.')
  }

  const result: SessionResponse = await response.json()
  return result
}

export interface DashboardSummary {
  team: {
    code: string
    name: string
  }
  wanted: {
    total: number
    totalBounty: number
    averageBounty: number
    byStatus: {
      AT_LARGE: number
      CAPTURED: number
      MISSING: number
    }
  }
  crews: {
    total: number
  }
}

export interface LogPose {
  status: string
  grandLineUnlocked: boolean
  unlockedAt: string | null
  message: string
}

export interface DashboardData {
  summary: DashboardSummary
  logPose: LogPose
}

export async function getDashboardData(
  signal: AbortSignal,
): Promise<DashboardData | null> {
  const token = localStorage.getItem('logpose_token')

  if (!token) return null

  const headers = {
    Authorization: `Bearer ${token}`,
  }

  const [summaryResponse, logPoseResponse] = await Promise.all([
    fetch(`${API_URL}/dashboard/summary`, { headers, signal }),
    fetch(`${API_URL}/log-pose`, { headers, signal }),
  ])

  if (summaryResponse.status === 401 || logPoseResponse.status === 401) {
    return null
  }

  if (!summaryResponse.ok || !logPoseResponse.ok) {
    throw new Error('No se pudo cargar el dashboard. Intenta nuevamente.')
  }

  const summary: DashboardSummary = await summaryResponse.json()
  const logPose: LogPose = await logPoseResponse.json()

  return { summary, logPose }
}
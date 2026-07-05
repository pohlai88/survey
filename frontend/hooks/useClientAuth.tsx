import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { invokeBackend } from '../lib/backend/runtime'
import {
  clearStoredClientSessionToken,
  getStoredClientSessionToken,
  storeClientSessionToken,
} from '../lib/backend/clientSession'

export type ClientUser = {
  id: number
  full_name: string
  email: string
  created_at: string
  onboarding_status?: string | null
}

type ClientAuthSession = {
  session_token: string
  client: ClientUser
}

type ClientAuthContextType = {
  client: ClientUser | null
  login: (session: ClientAuthSession) => void
  logout: () => void
  isAuthenticated: boolean
  ready: boolean
}

function isClientUser(value: unknown): value is ClientUser {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === 'number' &&
    typeof candidate.full_name === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.created_at === 'string' &&
    (candidate.onboarding_status === undefined || candidate.onboarding_status === null || typeof candidate.onboarding_status === 'string')
  )
}

const ClientAuthContext = createContext<ClientAuthContextType>({
  client: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  ready: false,
})

export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ClientUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sessionToken = getStoredClientSessionToken()
    if (!sessionToken) {
      setReady(true)
      return
    }

    let cancelled = false

    invokeBackend<{ client: ClientUser | null }>('auth.getClientSession')
      .then(result => {
        if (cancelled) return
        setClient(isClientUser(result?.client) ? result.client : null)
        if (!isClientUser(result?.client)) {
          clearStoredClientSessionToken()
        }
      })
      .catch(() => {
        if (cancelled) return
        clearStoredClientSessionToken()
        setClient(null)
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function login(session: ClientAuthSession) {
    storeClientSessionToken(session.session_token)
    setClient(session.client)
    setReady(true)
  }

  function logout() {
    const sessionToken = getStoredClientSessionToken()
    if (sessionToken) {
      void invokeBackend('auth.logoutClient', { __session: sessionToken }).catch(() => {
        // Ignore logout transport failures after local session teardown.
      })
    }

    setClient(null)
    clearStoredClientSessionToken()
    setReady(true)
  }

  return (
    <ClientAuthContext.Provider value={{ client, login, logout, isAuthenticated: client !== null, ready }}>
      {children}
    </ClientAuthContext.Provider>
  )
}

export function useClientAuth() {
  return useContext(ClientAuthContext)
}

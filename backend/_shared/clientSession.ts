import { createHash, randomBytes } from 'crypto'
import { logAuditEvent } from './audit'

const SESSION_TTL_DAYS = 7

type SessionClient = {
  id: number
  full_name: string
  email: string
  created_at: string
  onboarding_status: string | null
}

type SessionLookupResult = {
  client_id: number
  full_name: string
  email: string
  created_at: string
  onboarding_status: string | null
}

function hashSessionToken(sessionToken: string) {
  return createHash('sha256').update(sessionToken).digest('hex')
}

async function ensureClientSessionTable() {
  await retoolDb.query(`
    CREATE TABLE IF NOT EXISTS client_sessions (
      token_hash TEXT PRIMARY KEY,
      client_id INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMPTZ
    )
  `)
}

function getSessionTokenFromParams(params: unknown) {
  if (!params || typeof params !== 'object') return null

  const candidate = (params as Record<string, unknown>).__session
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : null
}

export function getClientSessionToken(req: { params?: unknown }) {
  return getSessionTokenFromParams(req.params)
}

export async function createClientSession(client: SessionClient) {
  await ensureClientSessionTable()

  const sessionToken = randomBytes(32).toString('hex')
  const tokenHash = hashSessionToken(sessionToken)

  await retoolDb.query(
    `INSERT INTO client_sessions (token_hash, client_id, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' days')::interval)`,
    [tokenHash, client.id, String(SESSION_TTL_DAYS)]
  )

  await logAuditEvent({
    actorType: 'client',
    actorId: client.id,
    eventType: 'client_session.created',
    resourceType: 'client_session',
    resourceId: tokenHash,
  })

  return {
    session_token: sessionToken,
    client,
  }
}

export async function revokeClientSession(sessionToken: string | null) {
  if (!sessionToken) return

  await ensureClientSessionTable()
  const tokenHash = hashSessionToken(sessionToken)

  await retoolDb.query(
    `UPDATE client_sessions
     SET revoked_at = NOW()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash]
  )

  await logAuditEvent({
    actorType: 'client',
    eventType: 'client_session.revoked',
    resourceType: 'client_session',
    resourceId: tokenHash,
  })
}

export async function requireClientSession(req: { params?: unknown }) {
  const sessionToken = getClientSessionToken(req)
  if (!sessionToken) {
    throw new Error('You must be signed in to continue.')
  }

  await ensureClientSessionTable()

  const tokenHash = hashSessionToken(sessionToken)
  const result = await retoolDb.query<SessionLookupResult>(
    `SELECT c.id AS client_id, c.full_name, c.email, c.created_at, c.onboarding_status
     FROM client_sessions s
     JOIN clients c ON c.id = s.client_id
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW()`,
    [tokenHash]
  )

  const sessionClient = result.data[0]
  if (!sessionClient) {
    throw new Error('Your session is no longer valid. Please sign in again.')
  }

  await retoolDb.query(
    `UPDATE client_sessions
     SET last_seen_at = NOW()
     WHERE token_hash = $1`,
    [tokenHash]
  )

  return {
    client: {
      id: sessionClient.client_id,
      full_name: sessionClient.full_name,
      email: sessionClient.email,
      created_at: sessionClient.created_at,
      onboarding_status: sessionClient.onboarding_status,
    },
    tokenHash,
  }
}

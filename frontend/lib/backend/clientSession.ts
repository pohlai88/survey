const SESSION_TOKEN_KEY = 'portal_client_session'
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

function readCookie(name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function getStoredClientSessionToken() {
  try {
    return readCookie(SESSION_TOKEN_KEY)
  } catch {
    return null
  }
}

export function storeClientSessionToken(sessionToken: string) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${SESSION_TOKEN_KEY}=${encodeURIComponent(sessionToken)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`
}

export function clearStoredClientSessionToken() {
  try {
    document.cookie = `${SESSION_TOKEN_KEY}=; Path=/; Max-Age=0; SameSite=Lax`
  } catch {
    // Ignore storage failures during logout/reset.
  }
}

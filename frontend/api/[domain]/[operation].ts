import { adapterReadiness } from '../_adapters.js'
import { operationContracts, resourceEnv, type ResourceRequirement } from '../_contracts.js'
import { dispatchOperation, type DispatchContext } from '../_dispatcher.js'
import { recordApiBoundaryEvent } from '../_observability.js'

type ApiRequest = {
  method?: string
  headers?: Record<string, string | string[] | undefined>
  query?: Record<string, string | string[] | undefined>
  body?: unknown
}

type ApiResponse = {
  setHeader(name: string, value: string): void
  status(code: number): ApiResponse
  json(payload: unknown): void
  end(): void
}

function getHeader(req: ApiRequest, name: string) {
  const value = req.headers?.[name] ?? req.headers?.[name.toLowerCase()]
  if (value === undefined) {
    const matchingKey = Object.keys(req.headers ?? {}).find(key => key.toLowerCase() === name.toLowerCase())
    const matchingValue = matchingKey ? req.headers?.[matchingKey] : undefined
    return Array.isArray(matchingValue) ? matchingValue[0] : matchingValue
  }

  return Array.isArray(value) ? value[0] : value
}

function createRequestId(req: ApiRequest) {
  const incoming = getHeader(req, 'x-request-id')
  if (typeof incoming === 'string' && incoming.trim()) return incoming.trim()
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function setApiHeaders(res: ApiResponse, requestId: string) {
  res.setHeader('X-Request-Id', requestId)
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('X-Content-Type-Options', 'nosniff')
}

function sendJson(
  res: ApiResponse,
  status: number,
  requestId: string,
  payload: Record<string, unknown>,
  operation: string | null = null
) {
  setApiHeaders(res, requestId)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  const responsePayload = { ...payload, request_id: requestId }
  recordApiBoundaryEvent({ requestId, status, operation, payload: responsePayload })
  res.status(status).json(responsePayload)
}

function sendApiError(
  res: ApiResponse,
  status: number,
  requestId: string,
  code: string,
  message: string,
  details: Record<string, unknown> = {},
  operation: string | null = null
) {
  sendJson(res, status, requestId, {
    data: null,
    error: { code, message, details },
  }, operation)
}

function normalizeQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getOperation(req: ApiRequest) {
  const domain = normalizeQueryValue(req.query?.domain)
  const operation = normalizeQueryValue(req.query?.operation)
  return typeof domain === 'string' && typeof operation === 'string' ? `${domain}.${operation}` : null
}

function getRequestParams(req: ApiRequest) {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    return req.body.trim() ? JSON.parse(req.body) : {}
  }
  return typeof req.body === 'object' ? req.body as Record<string, unknown> : {}
}

function getCookieValue(req: ApiRequest, name: string) {
  const cookie = getHeader(req, 'cookie')
  if (typeof cookie !== 'string') return null

  for (const part of cookie.split(';')) {
    const [rawName, ...rawValueParts] = part.trim().split('=')
    if (rawName === name) return decodeURIComponent(rawValueParts.join('='))
  }

  return null
}

function getBearerToken(req: ApiRequest) {
  const value = getHeader(req, 'authorization')
  if (typeof value !== 'string') return null

  const match = /^Bearer\s+(.+)$/i.exec(value.trim())
  return match?.[1]?.trim() || null
}

function getClientSessionToken(req: ApiRequest, params: Record<string, unknown>) {
  const cookieToken = getCookieValue(req, 'portal_client_session')
  if (cookieToken?.trim()) return cookieToken.trim()

  const bearerToken = getBearerToken(req)
  if (bearerToken?.trim()) return bearerToken.trim()

  return typeof params.__session === 'string' && params.__session.trim()
    ? params.__session.trim()
    : null
}

function getDispatchActor(
  req: ApiRequest,
  params: Record<string, unknown>,
  actor: 'public' | 'client' | 'admin'
): DispatchContext['actor'] {
  if (actor === 'client') {
    const sessionToken = getClientSessionToken(req, params)
    if (!sessionToken) throw new Error('Client session token is required before dispatch.')
    return { type: 'client', sessionToken }
  }

  if (actor === 'admin') return { type: 'admin' }

  return { type: 'public' }
}

function getAdminToken(req: ApiRequest) {
  const headerToken = getHeader(req, 'x-portal-admin-token')
  if (typeof headerToken === 'string' && headerToken.trim()) return headerToken.trim()
  return getBearerToken(req)
}

function getAdminAuthError(req: ApiRequest) {
  const configuredToken = process.env.PORTAL_ADMIN_API_TOKEN?.trim()
  if (!configuredToken) {
    return {
      status: 503,
      code: 'ADMIN_AUTH_UNCONFIGURED',
      message: 'Admin authentication is not configured for this environment.',
    }
  }

  const suppliedToken = getAdminToken(req)
  if (!suppliedToken) {
    return {
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Admin authentication is required.',
    }
  }

  if (suppliedToken !== configuredToken) {
    return {
      status: 403,
      code: 'FORBIDDEN',
      message: 'The authenticated actor is not allowed to perform this operation.',
    }
  }

  return null
}

function getMissingResources(resources: ResourceRequirement[]) {
  return resources.filter(resource =>
    resourceEnv[resource].some(envName => !process.env[envName]?.trim())
  )
}

function getResourceReadiness() {
  return Object.fromEntries(
    Object.keys(resourceEnv).map(resource => [
      resource,
      getMissingResources([resource as ResourceRequirement]).length === 0,
    ])
  ) as Record<ResourceRequirement, boolean>
}

function getMissingAdapters(resources: ResourceRequirement[]) {
  return resources.filter(resource => !adapterReadiness[resource])
}

function sendReadiness(res: ApiResponse, requestId: string) {
  const resources = getResourceReadiness()
  const missingResources = Object.entries(resources)
    .filter(([, configured]) => !configured)
    .map(([resource]) => resource)
  const missingAdapters = Object.entries(adapterReadiness)
    .filter(([, implemented]) => !implemented)
    .map(([resource]) => resource)

  sendJson(res, 200, requestId, {
    data: {
      status: missingResources.length === 0 && missingAdapters.length === 0 ? 'ready' : 'degraded',
      api_boundary: true,
      admin_auth_configured: Boolean(process.env.PORTAL_ADMIN_API_TOKEN?.trim()),
      resources,
      missing_resources: missingResources,
      adapters: adapterReadiness,
      missing_adapters: missingAdapters,
    },
    error: null,
  }, 'health.readiness')
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const requestId = createRequestId(req)

  if (req.method === 'OPTIONS') {
    setApiHeaders(res, requestId)
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    sendApiError(res, 405, requestId, 'METHOD_NOT_ALLOWED', 'Use POST for portal API operations.')
    return
  }

  const operation = getOperation(req)
  const operationContract = operation ? operationContracts[operation as keyof typeof operationContracts] : undefined
  if (!operation || !operationContract) {
    sendApiError(
      res,
      404,
      requestId,
      'OPERATION_NOT_FOUND',
      'The requested portal API operation does not exist.',
      { operation },
      operation
    )
    return
  }

  let params: Record<string, unknown>
  try {
    params = getRequestParams(req)
  } catch {
    sendApiError(res, 400, requestId, 'INVALID_JSON', 'Request body must be valid JSON.')
    return
  }

  if (operation === 'health.readiness') {
    sendReadiness(res, requestId)
    return
  }

  if (operationContract.actor === 'client' && !getClientSessionToken(req, params)) {
    sendApiError(res, 401, requestId, 'UNAUTHORIZED', 'Authentication is required.')
    return
  }

  if (operationContract.actor === 'admin') {
    const authError = getAdminAuthError(req)
    if (authError) {
      sendApiError(res, authError.status, requestId, authError.code, authError.message)
      return
    }
  }

  const missingResources = getMissingResources(operationContract.resources)
  if (missingResources.length > 0) {
    sendApiError(
      res,
      503,
      requestId,
      'BACKEND_RESOURCE_UNAVAILABLE',
      'The production API boundary is active, but required backend resources are not configured for this operation.',
      { operation, missing_resources: missingResources },
      operation
    )
    return
  }

  const missingAdapters = getMissingAdapters(operationContract.resources)
  if (missingAdapters.length > 0) {
    sendApiError(
      res,
      501,
      requestId,
      'BACKEND_ADAPTER_NOT_IMPLEMENTED',
      'Required backend adapters are not implemented for this operation.',
      { operation, missing_adapters: missingAdapters },
      operation
    )
    return
  }

  try {
    const actor = getDispatchActor(req, params, operationContract.actor)
    const result = await dispatchOperation(operation, { actor, operation, params, requestId })
    sendJson(res, 200, requestId, { data: result, error: null }, operation)
  } catch (error) {
    const status = typeof (error as { status?: unknown }).status === 'number'
      ? (error as { status: number }).status
      : 500
    const code = typeof (error as { code?: unknown }).code === 'string'
      ? (error as { code: string }).code
      : 'BACKEND_DISPATCH_FAILED'
    const details = (error as { details?: unknown }).details
    sendApiError(
      res,
      status,
      requestId,
      code,
      error instanceof Error ? error.message : 'Backend operation failed.',
      details && typeof details === 'object' ? details as Record<string, unknown> : { operation },
      operation
    )
  }
}

import { getStoredClientSessionToken } from './clientSession'

export type TriggerOptions = {
  skipCache?: boolean
}

function getApiBaseUrl() {
  const configured = import.meta.env.VITE_PORTAL_API_BASE_URL?.trim()
  return configured ? configured.replace(/\/+$/, '') : ''
}

function isBridgeEnabled(flagName: 'VITE_ENABLE_PORTAL_BACKEND_BRIDGE' | 'VITE_ENABLE_RETOOL_BRIDGE') {
  if (import.meta.env.DEV) return true
  return import.meta.env[flagName] === 'true'
}

function buildOperationPath(operation: string) {
  return operation.split('.').join('/')
}

function createRequestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error
  return new Error(typeof error === 'string' ? error : 'Request failed.')
}

function getApiErrorMessage(payload: unknown, status: number) {
  if (!payload || typeof payload !== 'object') {
    return `Request failed with status ${status}.`
  }

  const error = (payload as { error?: unknown }).error
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }

  return `Request failed with status ${status}.`
}

function buildBridgeRequestParams(params: unknown, sessionToken: string | null) {
  if (!sessionToken) return params ?? {}

  if (!params) {
    return { __session: sessionToken }
  }

  if (typeof params === 'object' && !Array.isArray(params)) {
    const scopedParams = params as Record<string, unknown>
    return '__session' in scopedParams ? scopedParams : { ...scopedParams, __session: sessionToken }
  }

  return { value: params, __session: sessionToken }
}

function buildHttpRequestParams(params?: unknown) {
  return params ?? {}
}

function buildHttpHeaders(requestId: string, sessionToken: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-Id': requestId,
  }

  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`
  }

  return headers
}

export async function invokeBackend<TData>(operation: string, params?: unknown, options?: TriggerOptions): Promise<TData> {
  const sessionToken = getStoredClientSessionToken()
  const bridgeRequestParams = buildBridgeRequestParams(params, sessionToken)
  const portalBackend = window.__PORTAL_BACKEND__
  if (portalBackend?.invoke && isBridgeEnabled('VITE_ENABLE_PORTAL_BACKEND_BRIDGE')) {
    return portalBackend.invoke<TData>(operation, bridgeRequestParams, options)
  }

  if (typeof window.Retool?.invokeQuery === 'function' && isBridgeEnabled('VITE_ENABLE_RETOOL_BRIDGE')) {
    const result = await window.Retool.invokeQuery<unknown>(operation, { additionalScope: bridgeRequestParams })
    return result as TData
  }

  const baseUrl = getApiBaseUrl()
  const endpoint = `${baseUrl}/api/${buildOperationPath(operation)}`
  const requestId = createRequestId()
  const requestParams = buildHttpRequestParams(params)
  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: buildHttpHeaders(requestId, sessionToken),
    body: JSON.stringify(requestParams),
  }).catch(error => {
    throw normalizeError(error)
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, response.status))
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as TData
  }

  return payload as TData
}

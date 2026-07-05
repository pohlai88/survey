import { getStoredClientSessionToken } from './clientSession'

export type TriggerOptions = {
  skipCache?: boolean
}

function getApiBaseUrl() {
  const configured = import.meta.env.VITE_PORTAL_API_BASE_URL?.trim()
  return configured ? configured.replace(/\/+$/, '') : ''
}

function buildOperationPath(operation: string) {
  return operation.split('.').join('/')
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error
  return new Error(typeof error === 'string' ? error : 'Request failed.')
}

function buildRequestParams(params?: unknown) {
  const sessionToken = getStoredClientSessionToken()

  if (!sessionToken) {
    return params ?? {}
  }

  if (!params) {
    return { __session: sessionToken }
  }

  if (typeof params === 'object' && !Array.isArray(params)) {
    const scopedParams = params as Record<string, unknown>
    return '__session' in scopedParams ? scopedParams : { ...scopedParams, __session: sessionToken }
  }

  return { value: params, __session: sessionToken }
}

export async function invokeBackend<TData>(operation: string, params?: unknown, options?: TriggerOptions): Promise<TData> {
  const requestParams = buildRequestParams(params)
  const portalBackend = window.__PORTAL_BACKEND__
  if (portalBackend?.invoke) {
    return portalBackend.invoke<TData>(operation, requestParams, options)
  }

  if (typeof window.Retool?.invokeQuery === 'function') {
    const result = await window.Retool.invokeQuery<unknown>(operation, { additionalScope: requestParams })
    return result as TData
  }

  const baseUrl = getApiBaseUrl()
  const endpoint = `${baseUrl}/api/${buildOperationPath(operation)}`
  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestParams),
  }).catch(error => {
    throw normalizeError(error)
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed with status ${response.status}.`)
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as TData
  }

  return payload as TData
}

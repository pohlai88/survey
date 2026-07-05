import assert from 'node:assert/strict'
import { adapterReadiness } from '../api/_adapters.js'
import { resourceEnv } from '../api/_contracts.js'

const { default: handler } = await import('../api/[domain]/[operation].ts')
const mutatedEnvNames = [
  'PORTAL_ADMIN_API_TOKEN',
  ...Object.values(resourceEnv).flat(),
]
const originalEnv = Object.fromEntries(mutatedEnvNames.map(name => [name, process.env[name]]))
const originalAdapterReadiness = { ...adapterReadiness }

function restoreEnv() {
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[name]
    } else {
      process.env[name] = value
    }
  }

  Object.assign(adapterReadiness, originalAdapterReadiness)
}

function invoke({ method = 'POST', domain, operation, body, headers = {} }) {
  return new Promise((resolve) => {
    const response = {
      headers: {},
      statusCode: 0,
      setHeader(name, value) {
        this.headers[name] = value
      },
      status(code) {
        this.statusCode = code
        return this
      },
      json(payload) {
        resolve({ status: this.statusCode, payload, headers: this.headers })
      },
      end() {
        resolve({ status: this.statusCode, payload: null, headers: this.headers })
      },
    }

    void handler({ method, headers, query: { domain, operation }, body }, response)
  })
}

function assertApiError(result, status, code) {
  assert.equal(result.status, status)
  assert.equal(result.payload?.data, null)
  assert.equal(result.payload?.error?.code, code)
  assert.equal(typeof result.payload?.error?.message, 'string')
  assert.equal(typeof result.payload?.request_id, 'string')
  assertApiHeaders(result)
}

function assertMissingResources(result, resources) {
  assert.deepEqual(result.payload?.error?.details?.missing_resources, resources)
}

function assertMissingAdapters(result, adapters) {
  assert.deepEqual(result.payload?.error?.details?.missing_adapters, adapters)
}

function assertApiHeaders(result) {
  assert.equal(result.headers['Cache-Control'], 'no-store')
  assert.equal(result.headers.Pragma, 'no-cache')
  assert.equal(result.headers['X-Content-Type-Options'], 'nosniff')
  assert.equal(typeof result.headers['X-Request-Id'], 'string')
}

try {
  for (const name of mutatedEnvNames) {
    delete process.env[name]
  }

  const options = await invoke({ method: 'OPTIONS', domain: 'health', operation: 'readiness' })
  assert.equal(options.status, 204)
  assert.equal(options.payload, null)
  assertApiHeaders(options)

  assertApiError(
    await invoke({ method: 'GET', domain: 'health', operation: 'readiness' }),
    405,
    'METHOD_NOT_ALLOWED'
  )
  assertApiError(
    await invoke({ domain: 'health', operation: 'readiness', body: '{not json' }),
    400,
    'INVALID_JSON'
  )

  const readiness = await invoke({ domain: 'health', operation: 'readiness', body: {} })
  assert.equal(readiness.status, 200)
  assertApiHeaders(readiness)
  assert.equal(readiness.payload?.error, null)
  assert.equal(readiness.payload?.data?.status, 'degraded')
  assert.equal(readiness.payload?.data?.api_boundary, true)
  assert.equal(readiness.payload?.data?.admin_auth_configured, false)
  assert.deepEqual(readiness.payload?.data?.resources, {
    database: false,
    notification: false,
    storage: false,
  })
  assert.deepEqual(readiness.payload?.data?.missing_resources, ['database', 'notification', 'storage'])
  assert.deepEqual(readiness.payload?.data?.adapters, {
    database: false,
    notification: false,
    storage: false,
  })
  assert.deepEqual(readiness.payload?.data?.missing_adapters, ['database', 'notification', 'storage'])

  assertApiError(
    await invoke({ domain: 'client', operation: 'getMyAssignments', body: {} }),
    401,
    'UNAUTHORIZED'
  )
  const clientSessionFromBody = await invoke({
    domain: 'client',
    operation: 'getMyAssignments',
    body: { __session: 'client-session' },
  })
  assertApiError(clientSessionFromBody, 503, 'BACKEND_RESOURCE_UNAVAILABLE')
  assertMissingResources(clientSessionFromBody, ['database'])
  const clientSessionFromBearer = await invoke({
    domain: 'client',
    operation: 'getMyAssignments',
    body: {},
    headers: { authorization: 'Bearer client-session' },
  })
  assertApiError(clientSessionFromBearer, 503, 'BACKEND_RESOURCE_UNAVAILABLE')
  assertMissingResources(clientSessionFromBearer, ['database'])
  const clientSessionFromCookie = await invoke({
    domain: 'client',
    operation: 'getMyAssignments',
    body: {},
    headers: { cookie: 'portal_client_session=client-session' },
  })
  assertApiError(clientSessionFromCookie, 503, 'BACKEND_RESOURCE_UNAVAILABLE')
  assertMissingResources(clientSessionFromCookie, ['database'])
  const requestIdFromHeader = await invoke({
    domain: 'bad',
    operation: 'missing',
    body: {},
    headers: { 'X-Request-Id': 'req_test_header' },
  })
  assertApiError(requestIdFromHeader, 404, 'OPERATION_NOT_FOUND')
  assert.equal(requestIdFromHeader.payload?.request_id, 'req_test_header')
  assertApiError(
    await invoke({ domain: 'admin', operation: 'inviteClient', body: {} }),
    503,
    'ADMIN_AUTH_UNCONFIGURED'
  )
  assertApiError(
    await invoke({ domain: 'bad', operation: 'missing', body: {} }),
    404,
    'OPERATION_NOT_FOUND'
  )

  const loginWithoutDatabase = await invoke({ domain: 'clients', operation: 'loginClient', body: {} })
  assertApiError(loginWithoutDatabase, 503, 'BACKEND_RESOURCE_UNAVAILABLE')
  assertMissingResources(loginWithoutDatabase, ['database'])

  process.env.PORTAL_ADMIN_API_TOKEN = 'secret'

  assertApiError(
    await invoke({ domain: 'admin', operation: 'inviteClient', body: {} }),
    401,
    'UNAUTHORIZED'
  )
  assertApiError(
    await invoke({
      domain: 'admin',
      operation: 'inviteClient',
      body: {},
      headers: { authorization: 'Bearer wrong' },
    }),
    403,
    'FORBIDDEN'
  )
  const inviteWithoutResources = await invoke({
    domain: 'admin',
    operation: 'inviteClient',
    body: {},
    headers: { authorization: 'Bearer secret' },
  })
  assertApiError(inviteWithoutResources, 503, 'BACKEND_RESOURCE_UNAVAILABLE')
  assertMissingResources(inviteWithoutResources, ['database', 'notification'])

  process.env.DATABASE_URL = 'postgres://example.invalid/database'
  process.env.PORTAL_NOTIFICATION_PROVIDER = 'example'
  process.env.PORTAL_NOTIFICATION_FROM = 'noreply@example.invalid'

  adapterReadiness.database = true
  const loginWithoutDispatcher = await invoke({ domain: 'clients', operation: 'loginClient', body: {} })
  assertApiError(loginWithoutDispatcher, 501, 'BACKEND_DISPATCHER_NOT_IMPLEMENTED')
  assert.equal(loginWithoutDispatcher.payload?.error?.details?.actor_type, 'public')

  const clientWithoutDispatcher = await invoke({
    domain: 'client',
    operation: 'getMyAssignments',
    body: {},
    headers: { authorization: 'Bearer client-session' },
  })
  assertApiError(clientWithoutDispatcher, 501, 'BACKEND_DISPATCHER_NOT_IMPLEMENTED')
  assert.equal(clientWithoutDispatcher.payload?.error?.details?.actor_type, 'client')
  assert.equal(JSON.stringify(clientWithoutDispatcher.payload).includes('client-session'), false)

  const inviteWithoutAdapters = await invoke({
    domain: 'admin',
    operation: 'inviteClient',
    body: {},
    headers: { authorization: 'Bearer secret' },
  })
  assertApiError(inviteWithoutAdapters, 501, 'BACKEND_ADAPTER_NOT_IMPLEMENTED')
  assertMissingAdapters(inviteWithoutAdapters, ['notification'])

  console.log('API boundary smoke passed.')
} finally {
  restoreEnv()
}

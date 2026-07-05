import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { buildApiBoundaryEvent, recordApiBoundaryEvent } from '../api/_observability.js'

const observabilityPath = fileURLToPath(new URL('../api/_observability.js', import.meta.url))
const observabilitySource = await readFile(observabilityPath, 'utf8')

for (const forbidden of ['params', 'body', 'headers', 'authorization', 'cookie', 'sessionToken', 'PORTAL_ADMIN_API_TOKEN']) {
  assert.equal(
    observabilitySource.includes(forbidden),
    false,
    `API observability must not reference secret-bearing request material: ${forbidden}`
  )
}

const event = buildApiBoundaryEvent({
  requestId: 'req_test',
  status: 501,
  operation: 'clients.loginClient',
  payload: {
    data: null,
    error: {
      code: 'BACKEND_ADAPTER_NOT_IMPLEMENTED',
      message: 'Required backend adapters are not implemented for this operation.',
      details: {
        operation: 'clients.loginClient',
        actor_type: 'public',
        missing_adapters: ['database'],
      },
    },
    request_id: 'req_test',
  },
})

assert.deepEqual(event, {
  source: 'portal_api_boundary',
  request_id: 'req_test',
  operation: 'clients.loginClient',
  status: 501,
  outcome: 'error',
  error_code: 'BACKEND_ADAPTER_NOT_IMPLEMENTED',
  actor_type: 'public',
  missing_resources: undefined,
  missing_adapters: ['database'],
})

const originalObservabilityFlag = process.env.PORTAL_API_OBSERVABILITY
const originalConsoleError = console.error
const captured = []

try {
  process.env.PORTAL_API_OBSERVABILITY = 'true'
  console.error = message => captured.push(message)
  recordApiBoundaryEvent({
    requestId: 'req_logged',
    status: 503,
    operation: null,
    payload: {
      data: null,
      error: {
        code: 'BACKEND_RESOURCE_UNAVAILABLE',
        details: { operation: 'client.getMyAssignments', missing_resources: ['database'] },
      },
    },
  })
} finally {
  if (originalObservabilityFlag === undefined) {
    delete process.env.PORTAL_API_OBSERVABILITY
  } else {
    process.env.PORTAL_API_OBSERVABILITY = originalObservabilityFlag
  }
  console.error = originalConsoleError
}

assert.equal(captured.length, 1)
const loggedEvent = JSON.parse(captured[0])
assert.deepEqual(loggedEvent, {
  source: 'portal_api_boundary',
  request_id: 'req_logged',
  operation: 'client.getMyAssignments',
  status: 503,
  outcome: 'error',
  error_code: 'BACKEND_RESOURCE_UNAVAILABLE',
  actor_type: null,
  missing_resources: ['database'],
})
assert.equal(JSON.stringify(loggedEvent).includes('client-session'), false)

console.log('API observability contract passed.')

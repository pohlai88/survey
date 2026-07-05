import assert from 'node:assert/strict'
import { adapterReadiness } from '../api/_adapters.js'
import { operationContracts, resourceEnv } from '../api/_contracts.js'
import { dispatchableOperations } from '../api/_dispatcher.js'

const validActors = new Set(['public', 'client', 'admin'])
const resourceKeys = Object.keys(resourceEnv).sort()
const adapterKeys = Object.keys(adapterReadiness).sort()

assert.deepEqual(adapterKeys, resourceKeys, 'Adapter readiness keys must match resource environment keys.')

for (const [resource, envNames] of Object.entries(resourceEnv)) {
  assert.equal(Array.isArray(envNames), true, `${resource} env contract must be an array.`)
  assert.ok(envNames.length > 0, `${resource} must declare at least one required env var.`)
  for (const envName of envNames) {
    assert.match(envName, /^[A-Z][A-Z0-9_]*$/, `${resource} env var name is invalid: ${envName}`)
  }
}

for (const [operation, contract] of Object.entries(operationContracts)) {
  assert.match(operation, /^[a-z]+[A-Za-z]*\.[a-z]+[A-Za-z]*$/, `Operation name is invalid: ${operation}`)
  assert.ok(validActors.has(contract.actor), `${operation} has invalid actor: ${contract.actor}`)
  assert.equal(Array.isArray(contract.resources), true, `${operation} resources must be an array.`)
  assert.equal(
    new Set(contract.resources).size,
    contract.resources.length,
    `${operation} declares duplicate resources.`
  )
  for (const resource of contract.resources) {
    assert.ok(resourceKeys.includes(resource), `${operation} references unknown resource: ${resource}`)
  }
}

const expectedDispatchableOperations = Object.keys(operationContracts)
  .filter(operation => operation !== 'health.readiness')
  .sort()
assert.deepEqual(
  dispatchableOperations,
  expectedDispatchableOperations,
  'Dispatcher coverage must match non-health API operations.'
)

console.log(`API contract integrity passed for ${Object.keys(operationContracts).length} operations.`)

import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { operationContracts } from '../api/_contracts.js'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const backendRoot = join(repoRoot, 'backend')
const backendDomains = ['admin', 'auth', 'client', 'clients', 'declarations', 'questions']

const contractedOperations = new Set(Object.keys(operationContracts))

const handlerOperations = []
for (const domain of backendDomains) {
  const domainPath = join(backendRoot, domain)
  const entries = await readdir(domainPath, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name) !== '.ts') continue
    handlerOperations.push(`${domain}.${basename(entry.name, '.ts')}`)
  }
}

handlerOperations.sort()

const missingContracts = handlerOperations.filter(operation => !contractedOperations.has(operation))
const staleContracts = [...contractedOperations]
  .filter(operation => operation !== 'health.readiness')
  .filter(operation => !handlerOperations.includes(operation))
  .sort()

assert.deepEqual(missingContracts, [], `Missing API contracts: ${missingContracts.join(', ')}`)
assert.deepEqual(staleContracts, [], `Stale API contracts without backend handlers: ${staleContracts.join(', ')}`)

console.log(`API contract coverage passed for ${handlerOperations.length} backend handlers.`)

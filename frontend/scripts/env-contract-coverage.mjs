import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resourceEnv } from '../api/_contracts.js'

const frontendRoot = fileURLToPath(new URL('..', import.meta.url))
const envExamplePath = fileURLToPath(new URL('../.env.example', import.meta.url))
const runtimePath = fileURLToPath(new URL('../lib/backend/runtime.ts', import.meta.url))
const apiRoutePath = fileURLToPath(new URL('../api/[domain]/[operation].ts', import.meta.url))

const envExample = await readFile(envExamplePath, 'utf8')
const runtimeSource = await readFile(runtimePath, 'utf8')
const apiRouteSource = await readFile(apiRoutePath, 'utf8')

const documentedEnvNames = new Set(
  envExample
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('=')[0])
)

const expectedEnvNames = new Set([
  'PORTAL_ADMIN_API_TOKEN',
  'VITE_ENABLE_PORTAL_BACKEND_BRIDGE',
  'VITE_ENABLE_RETOOL_BRIDGE',
  'VITE_PORTAL_API_BASE_URL',
  ...Object.values(resourceEnv).flat(),
])

const referencedEnvNames = new Set([
  ...[...runtimeSource.matchAll(/\bimport\.meta\.env\.([A-Z0-9_]+)/g)].map(match => match[1]),
  ...[...apiRouteSource.matchAll(/\bprocess\.env\.([A-Z0-9_]+)/g)].map(match => match[1]),
])
referencedEnvNames.delete('DEV')

const missingReferencedEnv = [...referencedEnvNames]
  .filter(envName => !expectedEnvNames.has(envName))
  .sort()
const missingDocumentation = [...expectedEnvNames]
  .filter(envName => !documentedEnvNames.has(envName))
  .sort()

assert.deepEqual(
  missingReferencedEnv,
  [],
  `Production env references are missing from the env contract: ${missingReferencedEnv.join(', ')}`
)
assert.deepEqual(
  missingDocumentation,
  [],
  `.env.example is missing env contract entries: ${missingDocumentation.join(', ')}`
)

console.log(`Environment contract coverage passed for ${expectedEnvNames.size} env vars in ${frontendRoot}.`)

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const runtimePath = fileURLToPath(new URL('../lib/backend/runtime.ts', import.meta.url))
const runtimeSource = await readFile(runtimePath, 'utf8')

assert.match(
  runtimeSource,
  /isBridgeEnabled\('VITE_ENABLE_PORTAL_BACKEND_BRIDGE'\)/,
  'window.__PORTAL_BACKEND__ must be gated behind VITE_ENABLE_PORTAL_BACKEND_BRIDGE outside dev.'
)

assert.match(
  runtimeSource,
  /isBridgeEnabled\('VITE_ENABLE_RETOOL_BRIDGE'\)/,
  'window.Retool must be gated behind VITE_ENABLE_RETOOL_BRIDGE outside dev.'
)

assert.doesNotMatch(
  runtimeSource,
  /window\.Retool\?\.invokeQuery[\s\S]{0,120}return result as TData/,
  'Retool invocation must not be reachable without an explicit bridge gate.'
)

assert.match(
  runtimeSource,
  /headers\.Authorization = `Bearer \$\{sessionToken\}`/,
  'HTTP backend calls must send client sessions through Authorization bearer headers.'
)

assert.doesNotMatch(
  runtimeSource,
  /body: JSON\.stringify\(bridgeRequestParams\)/,
  'HTTP backend calls must not send legacy bridge params containing __session.'
)

console.log('Runtime boundary contract passed.')

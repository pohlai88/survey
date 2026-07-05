import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { operationContracts } from '../api/_contracts.js'

const frontendRoot = fileURLToPath(new URL('..', import.meta.url))
const sourceRoots = ['App.tsx', 'hooks', 'lib', 'pages', 'components'].map(path => join(frontendRoot, path))
const hookRoot = join(frontendRoot, 'hooks', 'backend')
const contractedOperations = new Set(Object.keys(operationContracts))

async function collectSourceFiles(path) {
  const entries = await readdir(path, { withFileTypes: true })
    .catch(error => {
      if (error.code === 'ENOTDIR') return null
      throw error
    })

  if (!entries) return [path]

  const files = []
  for (const entry of entries) {
    const childPath = join(path, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(childPath))
    } else if (['.ts', '.tsx'].includes(extname(entry.name))) {
      files.push(childPath)
    }
  }
  return files
}

function extractOperations(source) {
  return [
    ...source.matchAll(/\b(?:createBackendHook|invokeBackend)[\s\S]{0,200}?\(\s*['"]([a-z]+[A-Za-z]*\.[a-z]+[A-Za-z]*)['"]/g),
  ].map(match => match[1])
}

const sourceFiles = (await Promise.all(sourceRoots.map(collectSourceFiles))).flat()
const usedOperations = new Map()

for (const filePath of sourceFiles) {
  const source = await readFile(filePath, 'utf8')
  for (const operation of extractOperations(source)) {
    const locations = usedOperations.get(operation) ?? []
    locations.push(relative(frontendRoot, filePath))
    usedOperations.set(operation, locations)
  }
}

const unknownOperations = [...usedOperations.keys()]
  .filter(operation => !contractedOperations.has(operation))
  .sort()
assert.deepEqual(unknownOperations, [], `Frontend calls operations without API contracts: ${unknownOperations.join(', ')}`)

const hookFiles = await collectSourceFiles(hookRoot)
const hookOperations = new Set()
for (const filePath of hookFiles) {
  const source = await readFile(filePath, 'utf8')
  for (const operation of extractOperations(source)) {
    hookOperations.add(operation)
  }
}

const hookExemptions = new Set(['health.readiness', 'auth.getClientSession', 'auth.logoutClient'])
const operationsMissingHooks = [...contractedOperations]
  .filter(operation => !hookExemptions.has(operation))
  .filter(operation => !hookOperations.has(operation))
  .sort()

assert.deepEqual(
  operationsMissingHooks,
  [],
  `Contracted operations are not exposed through frontend backend hooks: ${operationsMissingHooks.join(', ')}`
)

console.log(`Frontend API usage coverage passed for ${usedOperations.size} operations.`)

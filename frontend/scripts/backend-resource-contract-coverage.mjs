import assert from 'node:assert/strict'
import { access, readdir, readFile } from 'node:fs/promises'
import { basename, dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { operationContracts } from '../api/_contracts.js'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const backendRoot = join(repoRoot, 'backend')
const backendDomains = ['admin', 'auth', 'client', 'clients', 'declarations', 'questions']
const resourceGlobals = {
  database: /\bretoolDb\b/,
  notification: /\bretoolEmail\b/,
  storage: /\bretoolStorage\b/,
}
const relativeImportPattern = /\bimport\b[\s\S]*?\bfrom\s+['"](\.{1,2}\/[^'"]+)['"]/g
const sourceCache = new Map()

const resourceMismatches = []

async function pathExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function resolveBackendImport(fromFile, importPath) {
  const candidateBase = resolve(dirname(fromFile), importPath)
  const candidates = extname(candidateBase)
    ? [candidateBase]
    : [`${candidateBase}.ts`, join(candidateBase, 'index.ts')]

  for (const candidate of candidates) {
    const normalized = normalize(candidate)
    if (normalized.startsWith(backendRoot) && await pathExists(normalized)) {
      return normalized
    }
  }

  return null
}

async function readSource(filePath) {
  if (!sourceCache.has(filePath)) {
    sourceCache.set(filePath, await readFile(filePath, 'utf8'))
  }
  return sourceCache.get(filePath)
}

async function collectReachableSources(entryFile, visited = new Set()) {
  const normalizedEntry = normalize(entryFile)
  if (visited.has(normalizedEntry)) return []
  visited.add(normalizedEntry)

  const source = await readSource(normalizedEntry)
  const sources = [source]

  for (const match of source.matchAll(relativeImportPattern)) {
    const importedFile = await resolveBackendImport(normalizedEntry, match[1])
    if (importedFile) {
      sources.push(...await collectReachableSources(importedFile, visited))
    }
  }

  return sources
}

for (const domain of backendDomains) {
  const domainPath = join(backendRoot, domain)
  const entries = await readdir(domainPath, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name) !== '.ts') continue

    const operation = `${domain}.${basename(entry.name, '.ts')}`
    const contract = operationContracts[operation]
    assert.ok(contract, `${operation} is missing an API contract.`)

    const sources = await collectReachableSources(join(domainPath, entry.name))
    const declaredResources = new Set(contract.resources)

    for (const [resource, pattern] of Object.entries(resourceGlobals)) {
      const usesResource = sources.some(source => pattern.test(source))
      const declaresResource = declaredResources.has(resource)

      if (usesResource && !declaresResource) {
        resourceMismatches.push({
          operation,
          resource,
          actual: 'used',
          contract: 'not declared',
        })
      }
    }
  }
}

assert.deepEqual(
  resourceMismatches,
  [],
  `Backend resource usage is missing API contract resources: ${JSON.stringify(resourceMismatches, null, 2)}`
)

console.log('Backend resource contract coverage passed.')

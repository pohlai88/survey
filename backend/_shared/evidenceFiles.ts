async function ensureEvidenceFileTable() {
  await retoolDb.query(`
    CREATE TABLE IF NOT EXISTS evidence_files (
      file_id TEXT PRIMARY KEY,
      owner_client_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      storage_url TEXT,
      linked_entity_type TEXT,
      linked_entity_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      linked_at TIMESTAMPTZ
    )
  `)
}

export async function recordEvidenceUpload(input: {
  fileId: string
  ownerClientId: number
  originalName: string
  mimeType: string
  sizeBytes: number
  storageUrl?: string | null
}) {
  await ensureEvidenceFileTable()

  await retoolDb.query(
    `INSERT INTO evidence_files (file_id, owner_client_id, original_name, mime_type, size_bytes, storage_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (file_id)
       DO UPDATE SET owner_client_id = EXCLUDED.owner_client_id,
                     original_name = EXCLUDED.original_name,
                     mime_type = EXCLUDED.mime_type,
                     size_bytes = EXCLUDED.size_bytes,
                     storage_url = COALESCE(EXCLUDED.storage_url, evidence_files.storage_url)`,
    [input.fileId, input.ownerClientId, input.originalName, input.mimeType, input.sizeBytes, input.storageUrl ?? null]
  )
}

export async function getEvidenceFilesByIds(fileIds: string[]) {
  await ensureEvidenceFileTable()
  if (fileIds.length === 0) return []

  const placeholders = fileIds.map((_, index) => `$${index + 1}`).join(', ')
  const result = await retoolDb.query<{
    file_id: string
    owner_client_id: number
    original_name: string
    mime_type: string
    size_bytes: number
    storage_url: string | null
    linked_entity_type: string | null
    linked_entity_id: string | null
  }>(
    `SELECT file_id, owner_client_id, original_name, mime_type, size_bytes, storage_url, linked_entity_type, linked_entity_id
     FROM evidence_files
     WHERE file_id IN (${placeholders})`,
    fileIds
  )

  return result.data
}

export async function assertEvidenceOwnership(fileId: string, clientId: number) {
  await ensureEvidenceFileTable()

  const result = await retoolDb.query<{ owner_client_id: number }>(
    `SELECT owner_client_id
     FROM evidence_files
     WHERE file_id = $1`,
    [fileId]
  )

  const file = result.data[0]
  if (!file || file.owner_client_id !== clientId) {
    throw new Error('One or more uploaded files are not available for this client.')
  }
}

export async function linkEvidenceToDeclaration(fileId: string, declarationId: number) {
  await ensureEvidenceFileTable()

  await retoolDb.query(
    `UPDATE evidence_files
     SET linked_entity_type = 'declaration',
         linked_entity_id = $2,
         linked_at = NOW()
     WHERE file_id = $1`,
    [fileId, String(declarationId)]
  )
}

import { logAuditEvent } from '../_shared/audit'
import { requireClientSession } from '../_shared/clientSession'
import { getEvidenceFilesByIds } from '../_shared/evidenceFiles'
import { assertNonEmptyString, assertPositiveInteger } from '../_shared/validation'

type Params = {
  declaration_id: number
  file_id: string
}

export default async function getEvidenceFileAccess(req: { params: Params; user: User }) {
  const declarationId = assertPositiveInteger(req.params.declaration_id, 'Declaration')
  const fileId = assertNonEmptyString(req.params.file_id, 'Evidence file')

  const declarationResult = await retoolDb.query<{ id: number; client_email: string }>(
    'SELECT id, client_email FROM client_declarations WHERE id = $1',
    [declarationId]
  )

  const declaration = declarationResult.data[0]
  if (!declaration) {
    throw new Error('Declaration not found.')
  }

  const linkedAnswerResult = await retoolDb.query<{ id: number }>(
    `SELECT id
     FROM declaration_answers
     WHERE declaration_id = $1 AND file_id = $2
     LIMIT 1`,
    [declarationId, fileId]
  )

  if (linkedAnswerResult.data.length === 0) {
    throw new Error('Evidence file is not linked to this declaration.')
  }

  const evidence = (await getEvidenceFilesByIds([fileId]))[0]
  if (!evidence || !evidence.storage_url) {
    throw new Error('Evidence file is not available.')
  }

  const isAdminActor = Boolean(req.user?.email || req.user?.id)
  let actorType: 'admin' | 'client' = isAdminActor ? 'admin' : 'client'
  let actorId: string | number | null = req.user?.email ?? req.user?.id ?? null

  if (!isAdminActor) {
    const session = await requireClientSession(req)
    if (session.client.email.toLowerCase() !== declaration.client_email.toLowerCase()) {
      throw new Error('You are not allowed to access this evidence file.')
    }

    actorType = 'client'
    actorId = session.client.id
  }

  await logAuditEvent({
    actorType,
    actorId,
    eventType: 'evidence_file.accessed',
    resourceType: 'evidence_file',
    resourceId: fileId,
    metadata: { declaration_id: declarationId },
  })

  return {
    file_id: fileId,
    file_name: evidence.original_name,
    mime_type: evidence.mime_type,
    url: evidence.storage_url,
  }
}

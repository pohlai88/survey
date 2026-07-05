import { logAuditEvent } from '../_shared/audit'
import { requireClientSession } from '../_shared/clientSession'
import { recordEvidenceUpload } from '../_shared/evidenceFiles'
import { assertNonEmptyString } from '../_shared/validation'

type Params = {
  fileName: string
  base64Data: string
  mimeType: string
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME_PREFIXES = ['image/', 'application/pdf', 'text/']
const ALLOWED_EXACT_MIME_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
]

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.\-() ]+/g, '_')
}

export default async function uploadDeclarationFile(req: { params: Params; user: User }) {
  const session = await requireClientSession(req)
  const fileName = assertNonEmptyString(req.params.fileName, 'File name')
  const base64Data = assertNonEmptyString(req.params.base64Data, 'File data')
  const mimeType = assertNonEmptyString(req.params.mimeType, 'MIME type')
  const estimatedBytes = Math.floor((base64Data.length * 3) / 4)
  const isAllowedType =
    ALLOWED_MIME_PREFIXES.some(prefix => mimeType.startsWith(prefix)) ||
    ALLOWED_EXACT_MIME_TYPES.includes(mimeType)

  if (!isAllowedType) {
    throw new Error('This file type is not allowed.')
  }

  if (estimatedBytes > MAX_UPLOAD_BYTES) {
    throw new Error('File is too large. Maximum size is 10MB.')
  }

  const result = await retoolStorage.upload({
    fileName: sanitizeFileName(fileName),
    data: base64Data,
    mimeType,
    folderName: 'declaration-uploads',
    isPublic: false,
  })

  await recordEvidenceUpload({
    fileId: result.data.id,
    ownerClientId: session.client.id,
    originalName: result.data.name,
    mimeType,
    sizeBytes: estimatedBytes,
    storageUrl: result.data.url ?? null,
  })

  await logAuditEvent({
    actorType: 'client',
    actorId: session.client.id,
    eventType: 'evidence_file.uploaded',
    resourceType: 'evidence_file',
    resourceId: result.data.id,
  })

  return {
    fileId: result.data.id,
    fileName: result.data.name,
  }
}

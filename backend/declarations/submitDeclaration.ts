import { logAuditEvent } from '../_shared/audit'
import { requireClientSession } from '../_shared/clientSession'
import { assertNonEmptyString } from '../_shared/validation'

type Params = {
  declaration_type: string
  subject: string
  content: string
}

export default async function submitDeclaration(req: { params: Params; user: User }) {
  const session = await requireClientSession(req)
  if (session.client.onboarding_status !== 'complete') {
    throw new Error('Onboarding must be completed before submitting a declaration.')
  }

  const declarationType = assertNonEmptyString(req.params.declaration_type, 'Declaration type')
  const subject = assertNonEmptyString(req.params.subject, 'Subject')
  const content = assertNonEmptyString(req.params.content, 'Declaration statement')

  const result = await retoolDb.query(
    `INSERT INTO client_declarations (client_name, client_email, declaration_type, subject, content, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [session.client.full_name, session.client.email, declarationType, subject, content]
  )

  const declaration = result.data[0] as { id: number }
  await logAuditEvent({
    actorType: 'client',
    actorId: session.client.id,
    eventType: 'declaration.submitted',
    resourceType: 'declaration',
    resourceId: declaration.id,
  })

  return declaration
}

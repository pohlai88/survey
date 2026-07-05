import { logAuditEvent } from '../_shared/audit'
import { requireClientSession } from '../_shared/clientSession'
import { assertEvidenceOwnership, linkEvidenceToDeclaration } from '../_shared/evidenceFiles'
import { assertArray, assertNonEmptyString } from '../_shared/validation'
import { emitWorkflowEvent } from '../_shared/workflow'

type Answer = {
  question_id: number
  question_text: string
  question_type: string
  text_answer?: string
  bool_answer?: boolean
  file_id?: string
  file_name?: string
  file_mime_type?: string
}

type Params = {
  declaration_type: string
  subject: string
  content: string
  answers: Answer[]
}

export default async function submitDeclarationWithAnswers(req: { params: Params; user: User }) {
  const session = await requireClientSession(req)
  if (session.client.onboarding_status !== 'complete') {
    throw new Error('Onboarding must be completed before submitting a declaration.')
  }

  const declarationType = assertNonEmptyString(req.params.declaration_type, 'Declaration type')
  const subject = assertNonEmptyString(req.params.subject, 'Subject')
  const content = assertNonEmptyString(req.params.content, 'Declaration statement')
  const answers = assertArray<Answer>(req.params.answers, 'Answers')

  // Insert declaration
  const declResult = await retoolDb.query(
    `INSERT INTO client_declarations (client_name, client_email, declaration_type, subject, content, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [session.client.full_name, session.client.email, declarationType, subject, content]
  )

  const declaration = declResult.data[0] as { id: number }

  // Insert answers
  for (const answer of answers) {
    if (answer.file_id) {
      await assertEvidenceOwnership(answer.file_id, session.client.id)
    }

    await retoolDb.query(
      `INSERT INTO declaration_answers
         (declaration_id, question_id, question_text, question_type, text_answer, bool_answer, file_id, file_name, file_mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        declaration.id,
        answer.question_id,
        answer.question_text,
        answer.question_type,
        answer.text_answer ?? null,
        answer.bool_answer ?? null,
        answer.file_id ?? null,
        answer.file_name ?? null,
        answer.file_mime_type ?? null,
      ]
    )

    if (answer.file_id) {
      await linkEvidenceToDeclaration(answer.file_id, declaration.id)
    }
  }

  await logAuditEvent({
    actorType: 'client',
    actorId: session.client.id,
    eventType: 'declaration.submitted',
    resourceType: 'declaration',
    resourceId: declaration.id,
    metadata: { answer_count: answers.length },
  })

  await emitWorkflowEvent({
    actorType: 'client',
    actorId: session.client.id,
    eventType: 'declaration.submission_completed',
    resourceType: 'declaration',
    resourceId: declaration.id,
    payload: { answer_count: answers.length },
  })

  return declaration
}

import { logAuditEvent } from '../_shared/audit'
import { requireClientSession } from '../_shared/clientSession'
import { assertEvidenceOwnership, linkEvidenceToDeclaration } from '../_shared/evidenceFiles'
import { assertArray, assertPositiveInteger } from '../_shared/validation'
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
  assignment_id: number
  answers: Answer[]
}

export default async function submitAssignment(req: { params: Params; user: User }) {
  const session = await requireClientSession(req)
  const assignmentId = assertPositiveInteger(req.params.assignment_id, 'Assignment')
  const answers = assertArray<Answer>(req.params.answers, 'Answers')

  // Fetch assignment + question set + client
  const assignResult = await retoolDb.query(
    `SELECT a.*, qs.title, qs.declaration_type, c.full_name, c.email
     FROM client_question_assignments a
     JOIN declaration_question_sets qs ON qs.id = a.question_set_id
     JOIN clients c ON c.id = a.client_id
     WHERE a.id = $1 AND a.client_id = $2`,
    [assignmentId, session.client.id]
  )

  const assignment = assignResult.data[0] as {
    id: number; question_set_id: number; title: string; declaration_type: string; status: string;
    full_name: string; email: string
  } | undefined

  if (!assignment) throw new Error('Assignment not found.')
  if (assignment.status !== 'pending') {
    throw new Error('This assignment has already been submitted or is no longer active.')
  }

  // Create a declaration record for this submission
  const declResult = await retoolDb.query(
    `INSERT INTO client_declarations (client_name, client_email, declaration_type, subject, content, status)
     VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
    [
      assignment.full_name,
      assignment.email,
      assignment.declaration_type,
      `${assignment.title} — Assigned Survey`,
      `Submission for assigned question set: "${assignment.title}"`,
    ]
  )
  const declaration = declResult.data[0] as { id: number }

  // Save answers
  for (const ans of answers) {
    if (ans.file_id) {
      await assertEvidenceOwnership(ans.file_id, session.client.id)
    }

    await retoolDb.query(
      `INSERT INTO declaration_answers
         (declaration_id, question_id, question_text, question_type, text_answer, bool_answer, file_id, file_name, file_mime_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        declaration.id, ans.question_id, ans.question_text, ans.question_type,
        ans.text_answer ?? null, ans.bool_answer ?? null,
        ans.file_id ?? null, ans.file_name ?? null, ans.file_mime_type ?? null,
      ]
    )

    if (ans.file_id) {
      await linkEvidenceToDeclaration(ans.file_id, declaration.id)
    }
  }

  // Mark assignment submitted
  await retoolDb.query(
    `UPDATE client_question_assignments SET status = 'submitted' WHERE id = $1`,
    [assignmentId]
  )

  await logAuditEvent({
    actorType: 'client',
    actorId: session.client.id,
    eventType: 'assignment.submitted',
    resourceType: 'assignment',
    resourceId: assignmentId,
    metadata: { declaration_id: declaration.id },
  })

  await emitWorkflowEvent({
    actorType: 'client',
    actorId: session.client.id,
    eventType: 'assignment.submission_completed',
    resourceType: 'assignment',
    resourceId: assignmentId,
    payload: { declaration_id: declaration.id },
  })

  return { declaration_id: declaration.id }
}

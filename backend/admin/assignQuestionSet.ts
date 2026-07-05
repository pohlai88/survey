import { emitWorkflowEvent, sendOutboxEmail } from '../_shared/workflow'

type Params = {
  client_id: number
  question_set_id: number
  due_date?: string
  notes?: string
}

export default async function assignQuestionSet(req: { params: Params; user: User }) {
  const { client_id, question_set_id, due_date, notes } = req.params
  const assignedBy = req.user?.email ?? req.user?.fullName ?? 'Administrator'

  // Check client exists and onboarding is complete
  const client = await retoolDb.query(
    'SELECT id, onboarding_status, email, full_name FROM clients WHERE id = $1', [client_id]
  )
  if (client.data.length === 0) throw new Error('Client not found.')
  if (client.data[0]?.onboarding_status !== 'complete') {
    throw new Error('Client must complete onboarding before assignments can be issued.')
  }

  // Check question set is active
  const qs = await retoolDb.query(
    'SELECT id, title FROM declaration_question_sets WHERE id = $1 AND is_active = true', [question_set_id]
  )
  if (qs.data.length === 0) throw new Error('Question set not found or is not active.')

  const result = await retoolDb.query(
    `INSERT INTO client_question_assignments (client_id, question_set_id, assigned_by, due_date, notes)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (client_id, question_set_id)
       DO UPDATE SET assigned_at = NOW(), assigned_by = $3, due_date = $4, notes = $5, status = 'pending'
     RETURNING *`,
    [client_id, question_set_id, assignedBy, due_date ?? null, notes ?? null]
  )

  const assignment = result.data[0] as { id: number }
  const eventId = await emitWorkflowEvent({
    actorType: req.user?.email || req.user?.id ? 'admin' : 'system',
    actorId: req.user?.email ?? req.user?.id ?? null,
    eventType: 'assignment.created',
    resourceType: 'assignment',
    resourceId: assignment.id,
    payload: { client_id, question_set_id },
  })

  const clientRecord = client.data[0] as { email: string; full_name: string }
  const questionSet = qs.data[0] as { title: string }
  const dueDateLabel = due_date ? new Date(due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null
  await sendOutboxEmail({
    eventId,
    notificationType: 'assignment_email',
    recipientEmail: clientRecord.email,
    subject: `New questionnaire assignment: ${questionSet.title}`,
    bodyHtml: `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
        <tr><td style="padding:36px 40px">
          <h1 style="margin:0 0 12px;color:#111827;font-size:24px;font-weight:700">New assignment available</h1>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">
            Hello <strong>${clientRecord.full_name}</strong>, you have been assigned a new questionnaire: <strong>${questionSet.title}</strong>.
          </p>
          ${dueDateLabel ? `<p style="margin:0 0 16px;color:#374151;font-size:15px">Due date: <strong>${dueDateLabel}</strong></p>` : ''}
          ${notes?.trim() ? `<p style="margin:0;color:#374151;font-size:15px;line-height:1.6">Notes: ${notes.trim()}</p>` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    metadata: { assignment_id: assignment.id },
  })

  return assignment
}

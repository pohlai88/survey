import { logAuditEvent } from '../_shared/audit'
import { assertNonEmptyString, assertPositiveInteger } from '../_shared/validation'
import { emitWorkflowEvent, sendOutboxEmail } from '../_shared/workflow'

type Params = {
  declaration_id: number
  reviewer_name?: string
  reviewer_email?: string
  feedback_type: string
  verification_status: string
  comments?: string
  update_declaration_status?: string
}

const ALLOWED_DECLARATION_STATUSES = new Set(['pending', 'approved', 'rejected'])

export default async function submitFeedback(req: { params: Params; user: User }) {
  const declarationId = assertPositiveInteger(req.params.declaration_id, 'Declaration')
  const feedbackType = assertNonEmptyString(req.params.feedback_type, 'Feedback type')
  const verificationStatus = assertNonEmptyString(req.params.verification_status, 'Verification status')
  const reviewerName = typeof req.params.reviewer_name === 'string' ? req.params.reviewer_name.trim() : ''
  const reviewerEmail = typeof req.params.reviewer_email === 'string' ? req.params.reviewer_email.trim() : undefined
  const comments = typeof req.params.comments === 'string' ? req.params.comments.trim() : undefined
  const updateDeclarationStatus = req.params.update_declaration_status

  const resolvedReviewerName = req.user?.fullName ?? req.user?.email ?? reviewerName
  const resolvedReviewerEmail = req.user?.email ?? reviewerEmail ?? null
  if (!resolvedReviewerName) {
    throw new Error('Reviewer identity is required.')
  }

  if (updateDeclarationStatus && !ALLOWED_DECLARATION_STATUSES.has(updateDeclarationStatus)) {
    throw new Error('Invalid declaration status update.')
  }

  const feedbackResult = await retoolDb.query(
    `INSERT INTO declaration_feedback (declaration_id, reviewer_name, reviewer_email, feedback_type, verification_status, comments)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [declarationId, resolvedReviewerName, resolvedReviewerEmail, feedbackType, verificationStatus, comments ?? null]
  )

  if (updateDeclarationStatus) {
    await retoolDb.query(
      `UPDATE client_declarations SET status = $1, updated_at = NOW() WHERE id = $2`,
      [updateDeclarationStatus, declarationId]
    )
  }

  const declarationLookup = await retoolDb.query<{ client_email: string; subject: string }>(
    `SELECT client_email, subject
     FROM client_declarations
     WHERE id = $1`,
    [declarationId]
  )
  const declarationRecord = declarationLookup.data[0] ?? null

  const eventId = await emitWorkflowEvent({
    actorType: req.user?.email || req.user?.id ? 'admin' : 'system',
    actorId: req.user?.email ?? req.user?.id ?? null,
    eventType: 'declaration.review_completed',
    resourceType: 'declaration',
    resourceId: declarationId,
    payload: {
      verification_status: verificationStatus,
      declaration_status: updateDeclarationStatus ?? null,
    },
  })

  await logAuditEvent({
    actorType: req.user?.email || req.user?.id ? 'admin' : 'system',
    actorId: req.user?.email ?? req.user?.id ?? null,
    eventType: 'declaration.feedback_submitted',
    resourceType: 'declaration',
    resourceId: declarationId,
    metadata: {
      verification_status: verificationStatus,
      feedback_type: feedbackType,
      declaration_status: updateDeclarationStatus ?? null,
    },
  })

  if (declarationRecord?.client_email && updateDeclarationStatus) {
    await sendOutboxEmail({
      eventId,
      notificationType: 'review_outcome_email',
      recipientEmail: declarationRecord.client_email,
      subject: `Update on your declaration: ${declarationRecord.subject}`,
      bodyHtml: `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
        <tr><td style="padding:36px 40px">
          <h1 style="margin:0 0 12px;color:#111827;font-size:24px;font-weight:700">Declaration review update</h1>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">
            Your declaration <strong>${declarationRecord.subject}</strong> has been reviewed.
          </p>
          <p style="margin:0 0 16px;color:#374151;font-size:15px">Verification status: <strong>${verificationStatus}</strong></p>
          <p style="margin:0 0 16px;color:#374151;font-size:15px">Declaration status: <strong>${updateDeclarationStatus}</strong></p>
          ${comments ? `<p style="margin:0;color:#374151;font-size:15px;line-height:1.6">Reviewer comments: ${comments}</p>` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      metadata: { declaration_id: declarationId },
    })
  }

  return feedbackResult.data[0]
}

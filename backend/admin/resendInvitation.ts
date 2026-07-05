import { randomBytes } from 'crypto'
import { emitWorkflowEvent, sendOutboxEmail } from '../_shared/workflow'

type Params = { id: number; app_url: string }

export default async function resendInvitation(req: { params: Params; user: User }) {
  const { id, app_url } = req.params

  const existing = await retoolDb.query(
    `SELECT * FROM client_invitations WHERE id = $1`, [id]
  )
  const invite = existing.data[0] as {
    id: number; email: string; full_name: string; status: string
  } | undefined

  if (!invite) throw new Error('Invitation not found.')
  if (invite.status === 'accepted') throw new Error('This invitation has already been accepted.')

  // Generate new token + extend expiry
  const newToken = randomBytes(32).toString('hex')
  const updated = await retoolDb.query(
    `UPDATE client_invitations
     SET token = $1, status = 'pending', expires_at = NOW() + INTERVAL '7 days'
     WHERE id = $2
     RETURNING *`,
    [newToken, id]
  )

  const inviteUrl = `${app_url}/invite/${newToken}`
  const expiresDisplay = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const refreshedInvite = updated.data[0] as { id: number; email: string }
  const eventId = await emitWorkflowEvent({
    actorType: req.user?.email || req.user?.id ? 'admin' : 'system',
    actorId: req.user?.email ?? req.user?.id ?? null,
    eventType: 'invitation.resent',
    resourceType: 'invitation',
    resourceId: refreshedInvite.id,
    payload: { email: invite.email },
  })

  const emailBody = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
        <tr><td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:36px 40px;text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">Invitation Reminder</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px">Client Declaration Portal</p>
        </td></tr>
        <tr><td style="padding:40px">
          <p style="margin:0 0 16px;color:#111827;font-size:16px">Hello <strong>${invite.full_name}</strong>,</p>
          <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.6">
            This is a reminder that you have a pending invitation to the <strong>Client Declaration Portal</strong>.
            Your invitation link has been refreshed — please use the new link below.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px">
            <tr><td style="background:#6366f1;border-radius:8px">
              <a href="${inviteUrl}" style="display:block;padding:14px 36px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none">
                Accept Invitation →
              </a>
            </td></tr>
          </table>
          <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:14px 18px;margin-bottom:24px">
            <p style="margin:0;color:#713f12;font-size:13px">⏰ <strong>Expires on ${expiresDisplay}.</strong></p>
          </div>
          <p style="margin:0;color:#9ca3af;font-size:12px;word-break:break-all">
            Direct link: <span style="color:#6366f1">${inviteUrl}</span>
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px">If you didn't expect this, you can safely ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await sendOutboxEmail({
    eventId,
    notificationType: 'invitation_reminder_email',
    recipientEmail: invite.email,
    subject: `Reminder: Your invitation to the Client Declaration Portal`,
    bodyHtml: emailBody,
    metadata: { invitation_id: refreshedInvite.id },
  })

  return refreshedInvite
}

import { randomBytes } from 'crypto'
import { emitWorkflowEvent, sendOutboxEmail } from '../_shared/workflow'

type Params = {
  email: string
  full_name: string
  app_url: string
  message?: string
}

export default async function inviteClient(req: { params: Params; user: User }) {
  const { email, full_name, app_url, message } = req.params
  const normalizedEmail = email.trim().toLowerCase()

  // Block if already registered
  const existing = await retoolDb.query(
    'SELECT id FROM clients WHERE LOWER(email) = $1',
    [normalizedEmail]
  )
  if (existing.data.length > 0) {
    throw new Error('A client with this email has already registered an account.')
  }

  // Block duplicate pending invite
  const dupInvite = await retoolDb.query(
    `SELECT id FROM client_invitations
     WHERE LOWER(email) = $1 AND status = 'pending' AND expires_at > NOW()`,
    [normalizedEmail]
  )
  if (dupInvite.data.length > 0) {
    throw new Error('An active invitation for this email already exists. Use Resend to send it again.')
  }

  const token = randomBytes(32).toString('hex')
  const inviteUrl = `${app_url}/invite/${token}`
  const invitedBy = req.user?.email ?? req.user?.fullName ?? 'Administrator'
  const expiresDisplay = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const result = await retoolDb.query(
    `INSERT INTO client_invitations (email, full_name, token, status, invited_by)
     VALUES ($1, $2, $3, 'pending', $4)
     RETURNING *`,
    [normalizedEmail, full_name.trim(), token, invitedBy]
  )

  const personalNote = message?.trim()
    ? `<p style="background:#f5f5f5;border-left:3px solid #6366f1;padding:12px 16px;margin:20px 0;border-radius:4px;font-style:italic;color:#374151;">"${message.trim()}"</p>`
    : ''

  const invitation = result.data[0] as { id: number; email: string }
  const eventId = await emitWorkflowEvent({
    actorType: req.user?.email || req.user?.id ? 'admin' : 'system',
    actorId: req.user?.email ?? req.user?.id ?? null,
    eventType: 'invitation.created',
    resourceType: 'invitation',
    resourceId: invitation.id,
    payload: { email: normalizedEmail },
  })

  const emailBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:36px 40px;text-align:center">
          <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center">
            <span style="font-size:24px">📋</span>
          </div>
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">You've been invited</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px">Client Declaration Portal</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px">
          <p style="margin:0 0 16px;color:#111827;font-size:16px">Hello <strong>${full_name}</strong>,</p>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">
            <strong>${invitedBy}</strong> has invited you to join the <strong>Client Declaration Portal</strong>
            to submit and manage your official declarations.
          </p>
          ${personalNote}
          <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.6">
            Click the button below to accept your invitation and set up your account.
          </p>
          <!-- CTA Button -->
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px">
            <tr><td style="background:#6366f1;border-radius:8px">
              <a href="${inviteUrl}" style="display:block;padding:14px 36px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;letter-spacing:0.3px">
                Accept Invitation →
              </a>
            </td></tr>
          </table>
          <!-- Expiry notice -->
          <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:14px 18px;margin-bottom:24px">
            <p style="margin:0;color:#713f12;font-size:13px">
              ⏰ <strong>This invitation expires on ${expiresDisplay}.</strong>
              Contact your administrator if you need a new link.
            </p>
          </div>
          <!-- Fallback link -->
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5">
            If the button doesn't work, copy and paste this URL into your browser:<br>
            <span style="color:#6366f1;word-break:break-all">${inviteUrl}</span>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px">
            You received this email because you were invited to the Client Declaration Portal.<br>
            If you didn't expect this, you can safely ignore it.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await sendOutboxEmail({
    eventId,
    notificationType: 'invitation_email',
    recipientEmail: normalizedEmail,
    subject: `You've been invited to the Client Declaration Portal`,
    bodyHtml: emailBody,
    metadata: { invitation_id: invitation.id },
  })

  return invitation
}

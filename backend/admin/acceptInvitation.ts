import { createClientSession } from '../_shared/clientSession'
import { hashPassword } from '../_shared/password'
import { assertNonEmptyString, assertPassword } from '../_shared/validation'

type Params = {
  token: string
  password: string
}

type Invitation = {
  id: number
  email: string
  full_name: string
  status: string
  expires_at: string
}

export default async function acceptInvitation(req: { params: Params; user: User }) {
  const token = assertNonEmptyString(req.params.token, 'Invitation token')
  const password = assertPassword(req.params.password)
  const hashedPassword = hashPassword(password)

  const invResult = await retoolDb.query<Invitation>(
    `SELECT * FROM client_invitations WHERE token = $1`, [token]
  )
  const invite = invResult.data[0]

  if (!invite) throw new Error('This invitation link is invalid.')
  if (invite.status === 'revoked') throw new Error('This invitation has been revoked.')
  if (invite.status === 'accepted') throw new Error('This invitation has already been used.')
  if (invite.status === 'pending' && new Date(invite.expires_at) < new Date()) {
    await retoolDb.query(`UPDATE client_invitations SET status = 'expired' WHERE id = $1`, [invite.id])
    throw new Error('This invitation has expired. Please contact your administrator for a new one.')
  }

  // Check not already registered
  const existingClient = await retoolDb.query(
    'SELECT id FROM clients WHERE LOWER(email) = LOWER($1)', [invite.email]
  )
  if (existingClient.data.length > 0) {
    throw new Error('An account with this email already exists. Please sign in instead.')
  }

  // Create client account
  const clientResult = await retoolDb.query(
    `INSERT INTO clients (full_name, email, password)
     VALUES ($1, $2, $3)
     RETURNING id, full_name, email, created_at`,
    [invite.full_name, invite.email, hashedPassword]
  )

  // Mark invitation accepted
  await retoolDb.query(
    `UPDATE client_invitations SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
    [invite.id]
  )

  const createdClient = clientResult.data[0] as {
    id: number
    full_name: string
    email: string
    created_at: string
  }

  return createClientSession({
    ...createdClient,
    onboarding_status: 'pending',
  })
}

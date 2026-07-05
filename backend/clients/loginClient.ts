import { createClientSession } from '../_shared/clientSession'
import { normalizeEmail } from '../_shared/clients'
import { verifyPassword } from '../_shared/password'
import { assertEmail, assertPassword } from '../_shared/validation'

type Params = {
  email: string
  password: string
}

type Client = {
  id: number
  full_name: string
  email: string
  password: string
  created_at: string
}

export default async function loginClient(req: { params: Params; user: User }) {
  const email = assertEmail(req.params.email, 'Email')
  const password = assertPassword(req.params.password)

  const result = await retoolDb.query<Client>(
    'SELECT * FROM clients WHERE LOWER(email) = LOWER($1)',
    [normalizeEmail(email)]
  )

  const client = result.data[0]

  if (!client) {
    throw new Error('No account found with this email address.')
  }

  if (!verifyPassword(password, client.password)) {
    throw new Error('Incorrect password.')
  }

  return createClientSession({
    id: client.id,
    full_name: client.full_name,
    email: client.email,
    created_at: client.created_at,
    onboarding_status: (client as Client & { onboarding_status?: string | null }).onboarding_status ?? null,
  })
}

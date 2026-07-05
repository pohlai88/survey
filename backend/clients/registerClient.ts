import { hashPassword } from '../_shared/password'
import { assertEmail, assertNonEmptyString, assertPassword } from '../_shared/validation'

type Params = {
  full_name: string
  email: string
  password: string
}

type Client = {
  id: number
  full_name: string
  email: string
  created_at: string
}

export default async function registerClient(req: { params: Params; user: User }) {
  const fullName = assertNonEmptyString(req.params.full_name, 'Full name')
  const normalizedEmail = assertEmail(req.params.email, 'Email')
  const password = assertPassword(req.params.password)
  const hashedPassword = hashPassword(password)

  // Check if email already exists
  const existing = await retoolDb.query<Client>(
    'SELECT id FROM clients WHERE LOWER(email) = LOWER($1)',
    [normalizedEmail]
  )
  if (existing.data.length > 0) {
    throw new Error('An account with this email already exists.')
  }

  const result = await retoolDb.query<Client>(
    `INSERT INTO clients (full_name, email, password)
     VALUES ($1, $2, $3)
     RETURNING id, full_name, email, created_at`,
    [fullName, normalizedEmail, hashedPassword]
  )

  return result.data[0]
}

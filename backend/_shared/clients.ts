type ClientIdentity = {
  id: number
  full_name: string
  email: string
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function getClientIdentityById(clientId: number) {
  const result = await retoolDb.query<ClientIdentity>(
    'SELECT id, full_name, email FROM clients WHERE id = $1',
    [clientId]
  )

  return result.data[0] ?? null
}

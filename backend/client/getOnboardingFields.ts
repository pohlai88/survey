import { requireClientSession } from '../_shared/clientSession'

export default async function getOnboardingFields(req: { params: Record<string, never>; user: User }) {
  const session = await requireClientSession(req)
  const [clientResult, fieldsResult] = await Promise.all([
    retoolDb.query(
      `SELECT id, full_name, email, onboarding_status, profile_data FROM clients WHERE id = $1`,
      [session.client.id]
    ),
    retoolDb.query(
      `SELECT * FROM profile_field_definitions WHERE is_active = true ORDER BY sort_order ASC, id ASC`
    ),
  ])
  return {
    client: clientResult.data[0] ?? null,
    fields: fieldsResult.data,
  }
}

import { logAuditEvent } from '../_shared/audit'
import { requireClientSession } from '../_shared/clientSession'
import { assertRecord } from '../_shared/validation'

type Params = {
  profile_data: Record<string, string>
}

export default async function saveClientProfile(req: { params: Params; user: User }) {
  const session = await requireClientSession(req)
  const profileData = assertRecord(req.params.profile_data, 'Profile data')
  const fieldDefinitions = await retoolDb.query<{
    field_key: string
    field_label: string
    is_required: boolean
    field_type: string
    options: Array<{ label: string; value: string }> | string | null
  }>(
    `SELECT field_key, field_label, is_required, field_type, options
     FROM profile_field_definitions
     WHERE is_active = true`
  )

  for (const field of fieldDefinitions.data) {
    const rawValue = profileData[field.field_key]
    const value = typeof rawValue === 'string' ? rawValue.trim() : ''

    if (field.is_required && value.length === 0) {
      throw new Error(`${field.field_label} is required.`)
    }

    if (field.field_type === 'email' && value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new Error(`${field.field_label} must be a valid email address.`)
    }

    if (field.field_type === 'yes_no' && value.length > 0 && value !== 'Yes' && value !== 'No') {
      throw new Error(`${field.field_label} must be Yes or No.`)
    }

    if (field.field_type === 'select' && value.length > 0) {
      const options = Array.isArray(field.options)
        ? field.options
        : typeof field.options === 'string' && field.options.trim().length > 0
          ? JSON.parse(field.options) as Array<{ label: string; value: string }>
          : []

      if (!options.some(option => option.value === value)) {
        throw new Error(`${field.field_label} contains an invalid selection.`)
      }
    }
  }

  const result = await retoolDb.query(
    `UPDATE clients
     SET profile_data = $1,
         onboarding_status = 'complete',
         onboarding_completed_at = NOW()
     WHERE id = $2
     RETURNING id, full_name, email, onboarding_status, profile_data, onboarding_completed_at`,
    [JSON.stringify(profileData), session.client.id]
  )

  if (result.data.length === 0) throw new Error('Client not found.')

  await logAuditEvent({
    actorType: 'client',
    actorId: session.client.id,
    eventType: 'client_profile.completed',
    resourceType: 'client',
    resourceId: session.client.id,
  })

  return result.data[0]
}

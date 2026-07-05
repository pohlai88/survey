export default async function getClients(_req: { params: Record<string, never>; user: User }) {
  const result = await retoolDb.query(`
    SELECT
      c.id,
      c.full_name,
      c.email,
      c.onboarding_status,
      c.created_at,
      COUNT(d.id)::int AS declaration_count,
      MAX(d.submitted_at) AS last_declaration_at,
      CASE WHEN i.id IS NOT NULL THEN true ELSE false END AS was_invited
    FROM clients c
    LEFT JOIN client_declarations d ON LOWER(d.client_email) = LOWER(c.email)
    LEFT JOIN client_invitations i ON LOWER(i.email) = LOWER(c.email) AND i.status = 'accepted'
    GROUP BY c.id, i.id
    ORDER BY c.created_at DESC
  `)
  return result.data
}

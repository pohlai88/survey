export default async function getInvitations(_req: { params: Record<string, never>; user: User }) {
  const result = await retoolDb.query(`
    SELECT
      i.*,
      CASE
        WHEN i.status = 'pending' AND i.expires_at < NOW() THEN 'expired'
        ELSE i.status
      END AS display_status,
      c.id AS client_id,
      c.created_at AS registered_at
    FROM client_invitations i
    LEFT JOIN clients c ON LOWER(c.email) = LOWER(i.email)
    ORDER BY i.created_at DESC
  `)
  return result.data
}

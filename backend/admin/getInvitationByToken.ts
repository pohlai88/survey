type Params = { token: string }

export default async function getInvitationByToken(req: { params: Params; user: User }) {
  const result = await retoolDb.query(
    `SELECT *,
       CASE WHEN status = 'pending' AND expires_at < NOW() THEN 'expired' ELSE status END AS display_status
     FROM client_invitations
     WHERE token = $1`,
    [req.params.token]
  )
  return result.data[0] ?? null
}

type Params = { id: number }

export default async function revokeInvitation(req: { params: Params; user: User }) {
  const result = await retoolDb.query(
    `UPDATE client_invitations SET status = 'revoked' WHERE id = $1 AND status = 'pending' RETURNING *`,
    [req.params.id]
  )
  if (result.data.length === 0) {
    throw new Error('Invitation not found or is not in a pending state.')
  }
  return result.data[0]
}

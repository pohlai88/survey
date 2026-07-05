type Params = { id: number }
export default async function deleteProfileFieldDef(req: { params: Params; user: User }) {
  await retoolDb.query('DELETE FROM profile_field_definitions WHERE id = $1', [req.params.id])
  return { success: true }
}

export default async function getProfileFieldDefs(_req: { params: Record<string, never>; user: User }) {
  const result = await retoolDb.query(
    `SELECT * FROM profile_field_definitions ORDER BY sort_order ASC, id ASC`
  )
  return result.data
}

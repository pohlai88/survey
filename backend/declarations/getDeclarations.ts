type Params = {
  status?: string
  search?: string
}

export default async function getDeclarations(req: { params: Params; user: User }) {
  const { status, search } = req.params

  let sql = `
    SELECT
      d.*,
      COUNT(f.id)::int AS feedback_count,
      MAX(f.reviewed_at) AS last_reviewed_at
    FROM client_declarations d
    LEFT JOIN declaration_feedback f ON f.declaration_id = d.id
  `
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (status && status !== 'all') {
    conditions.push(`d.status = $${idx}`)
    values.push(status)
    idx++
  }

  if (search && search.trim()) {
    conditions.push(`(d.client_name ILIKE $${idx} OR d.client_email ILIKE $${idx} OR d.subject ILIKE $${idx} OR d.declaration_type ILIKE $${idx})`)
    values.push(`%${search.trim()}%`)
    idx++
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }

  sql += ' GROUP BY d.id ORDER BY d.submitted_at DESC'

  const result = await retoolDb.query(sql, values)
  return result.data
}

type Params = { client_id: number }

export default async function getClientDetail(req: { params: Params; user: User }) {
  const { client_id } = req.params

  const [clientResult, fieldsResult, assignmentsResult, declarationsResult] = await Promise.all([
    retoolDb.query(
      `SELECT id, full_name, email, onboarding_status, profile_data, onboarding_completed_at, created_at
       FROM clients WHERE id = $1`, [client_id]
    ),
    retoolDb.query(
      `SELECT * FROM profile_field_definitions WHERE is_active = true ORDER BY sort_order ASC, id ASC`
    ),
    retoolDb.query(
      `SELECT a.*, qs.title AS question_set_title, qs.declaration_type, qs.description AS question_set_desc,
              COUNT(q.id)::int AS question_count
       FROM client_question_assignments a
       JOIN declaration_question_sets qs ON qs.id = a.question_set_id
       LEFT JOIN declaration_questions q ON q.question_set_id = qs.id
       WHERE a.client_id = $1
       GROUP BY a.id, qs.title, qs.declaration_type, qs.description
       ORDER BY a.assigned_at DESC`, [client_id]
    ),
    retoolDb.query(
      `SELECT id, declaration_type, subject, status, submitted_at
       FROM client_declarations WHERE LOWER(client_email) = (SELECT LOWER(email) FROM clients WHERE id = $1)
       ORDER BY submitted_at DESC LIMIT 10`, [client_id]
    ),
  ])

  return {
    client: clientResult.data[0] ?? null,
    profileFields: fieldsResult.data,
    assignments: assignmentsResult.data,
    recentDeclarations: declarationsResult.data,
  }
}

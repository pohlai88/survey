import { requireClientSession } from '../_shared/clientSession'

export default async function getMyAssignments(req: { params: Record<string, never>; user: User }) {
  const session = await requireClientSession(req)
  const result = await retoolDb.query(
    `SELECT a.id, a.client_id, a.question_set_id, a.assigned_at, a.due_date, a.status, a.notes,
            qs.title AS question_set_title, qs.declaration_type, qs.description,
            COUNT(q.id)::int AS question_count,
            COUNT(CASE WHEN q.is_required THEN 1 END)::int AS required_count
     FROM client_question_assignments a
     JOIN declaration_question_sets qs ON qs.id = a.question_set_id
     LEFT JOIN declaration_questions q ON q.question_set_id = qs.id
     WHERE a.client_id = $1
     GROUP BY a.id, qs.title, qs.declaration_type, qs.description
     ORDER BY a.assigned_at DESC`,
    [session.client.id]
  )
  return result.data
}

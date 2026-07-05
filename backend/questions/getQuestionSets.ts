export default async function getQuestionSets(_req: { params: Record<string, never>; user: User }) {
  const result = await retoolDb.query(`
    SELECT
      qs.*,
      COUNT(q.id)::int AS question_count
    FROM declaration_question_sets qs
    LEFT JOIN declaration_questions q ON q.question_set_id = qs.id
    GROUP BY qs.id
    ORDER BY qs.declaration_type, qs.created_at DESC
  `)
  return result.data
}

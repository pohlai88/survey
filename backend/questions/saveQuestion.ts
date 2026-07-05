type Params = {
  id?: number
  question_set_id: number
  question_text: string
  question_type: string
  is_required: boolean
  help_text?: string
  sort_order: number
}

export default async function saveQuestion(req: { params: Params; user: User }) {
  const { id, question_set_id, question_text, question_type, is_required, help_text, sort_order } = req.params

  if (id) {
    const result = await retoolDb.query(
      `UPDATE declaration_questions
       SET question_text = $1, question_type = $2, is_required = $3, help_text = $4, sort_order = $5
       WHERE id = $6
       RETURNING *`,
      [question_text, question_type, is_required, help_text ?? null, sort_order, id]
    )
    return result.data[0]
  } else {
    const result = await retoolDb.query(
      `INSERT INTO declaration_questions (question_set_id, question_text, question_type, is_required, help_text, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [question_set_id, question_text, question_type, is_required, help_text ?? null, sort_order]
    )
    return result.data[0]
  }
}

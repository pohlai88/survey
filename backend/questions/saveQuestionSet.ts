type Params = {
  id?: number
  title: string
  description?: string
  declaration_type: string
  is_active: boolean
}

export default async function saveQuestionSet(req: { params: Params; user: User }) {
  const { id, title, description, declaration_type, is_active } = req.params

  if (id) {
    const result = await retoolDb.query(
      `UPDATE declaration_question_sets
       SET title = $1, description = $2, declaration_type = $3, is_active = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [title, description ?? null, declaration_type, is_active, id]
    )
    return result.data[0]
  } else {
    const result = await retoolDb.query(
      `INSERT INTO declaration_question_sets (title, description, declaration_type, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, description ?? null, declaration_type, is_active]
    )
    return result.data[0]
  }
}

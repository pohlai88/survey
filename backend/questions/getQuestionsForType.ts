type Params = { declaration_type: string }

export default async function getQuestionsForType(req: { params: Params; user: User }) {
  const { declaration_type } = req.params

  // Get the active question set for this declaration type
  const setResult = await retoolDb.query(
    `SELECT id FROM declaration_question_sets
     WHERE declaration_type = $1 AND is_active = true
     ORDER BY id DESC
     LIMIT 1`,
    [declaration_type]
  )

  if (setResult.data.length === 0) {
    return { question_set_id: null, questions: [] }
  }

  const questionSetId = (setResult.data[0] as { id: number }).id

  const qResult = await retoolDb.query(
    `SELECT * FROM declaration_questions WHERE question_set_id = $1 ORDER BY sort_order ASC, id ASC`,
    [questionSetId]
  )

  return { question_set_id: questionSetId, questions: qResult.data }
}

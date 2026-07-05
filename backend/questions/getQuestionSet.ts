type Params = { id: number }

type QuestionSet = {
  id: number
  title: string
  description: string | null
  declaration_type: string
  is_active: boolean
  created_at: string
  updated_at: string
}

type Question = {
  id: number
  question_set_id: number
  question_text: string
  question_type: string
  is_required: boolean
  help_text: string | null
  sort_order: number
  created_at: string
}

export default async function getQuestionSet(req: { params: Params; user: User }) {
  const { id } = req.params
  const setResult = await retoolDb.query<QuestionSet>(
    'SELECT * FROM declaration_question_sets WHERE id = $1', [id]
  )
  const qResult = await retoolDb.query<Question>(
    'SELECT * FROM declaration_questions WHERE question_set_id = $1 ORDER BY sort_order ASC, id ASC', [id]
  )
  return { questionSet: setResult.data[0] ?? null, questions: qResult.data }
}

type Params = {
  id: number
}

type Declaration = {
  id: number
  client_name: string
  client_email: string
  declaration_type: string
  subject: string
  content: string
  status: string
  submitted_at: string
  updated_at: string
}

type Answer = {
  id: number
  declaration_id: number
  question_id: number
  question_text: string
  question_type: string
  text_answer: string | null
  bool_answer: boolean | null
  file_id: string | null
  file_name: string | null
  file_mime_type: string | null
  created_at: string
}

type Feedback = {
  id: number
  declaration_id: number
  reviewer_name: string
  reviewer_email: string
  feedback_type: string
  verification_status: string
  comments: string
  reviewed_at: string
}

export default async function getDeclarationById(req: { params: Params; user: User }) {
  const { id } = req.params

  const declarationResult = await retoolDb.query<Declaration>(
    'SELECT * FROM client_declarations WHERE id = $1',
    [id]
  )

  const feedbackResult = await retoolDb.query<Feedback>(
    'SELECT * FROM declaration_feedback WHERE declaration_id = $1 ORDER BY reviewed_at DESC',
    [id]
  )

  const declaration = declarationResult.data[0] ?? null

  const answersResult = await retoolDb.query<Answer>(
    'SELECT * FROM declaration_answers WHERE declaration_id = $1 ORDER BY id ASC',
    [id]
  )

  return {
    declaration,
    feedback: feedbackResult.data,
    answers: answersResult.data,
  }
}

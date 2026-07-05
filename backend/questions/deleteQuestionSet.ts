type Params = { id: number }

export default async function deleteQuestionSet(req: { params: Params; user: User }) {
  await retoolDb.query('DELETE FROM declaration_question_sets WHERE id = $1', [req.params.id])
  return { success: true }
}

type Params = { id: number }

export default async function deleteQuestion(req: { params: Params; user: User }) {
  await retoolDb.query('DELETE FROM declaration_questions WHERE id = $1', [req.params.id])
  return { success: true }
}

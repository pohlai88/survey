type Params = { assignment_id: number }
export default async function removeAssignment(req: { params: Params; user: User }) {
  await retoolDb.query('DELETE FROM client_question_assignments WHERE id = $1', [req.params.assignment_id])
  return { success: true }
}

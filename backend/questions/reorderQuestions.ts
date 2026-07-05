type Params = {
  // Array of { id, sort_order } to update
  items: Array<{ id: number; sort_order: number }>
}

export default async function reorderQuestions(req: { params: Params; user: User }) {
  const { items } = req.params
  for (const item of items) {
    await retoolDb.query(
      'UPDATE declaration_questions SET sort_order = $1 WHERE id = $2',
      [item.sort_order, item.id]
    )
  }
  return { success: true }
}

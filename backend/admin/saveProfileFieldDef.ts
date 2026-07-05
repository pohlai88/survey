type FieldOption = { label: string; value: string }

type Params = {
  id?: number
  field_key: string
  field_label: string
  field_type: string
  is_required: boolean
  is_active: boolean
  placeholder?: string
  help_text?: string
  sort_order: number
  options?: FieldOption[]
}

export default async function saveProfileFieldDef(req: { params: Params; user: User }) {
  const { id, field_key, field_label, field_type, is_required, is_active, placeholder, help_text, sort_order, options } = req.params
  const optionsJson = options && options.length > 0 ? JSON.stringify(options) : null

  if (id) {
    const result = await retoolDb.query(
      `UPDATE profile_field_definitions
       SET field_key=$1, field_label=$2, field_type=$3, is_required=$4, is_active=$5,
           placeholder=$6, help_text=$7, sort_order=$8, options=$9
       WHERE id=$10 RETURNING *`,
      [field_key, field_label, field_type, is_required, is_active, placeholder ?? null, help_text ?? null, sort_order, optionsJson, id]
    )
    return result.data[0]
  } else {
    const result = await retoolDb.query(
      `INSERT INTO profile_field_definitions (field_key, field_label, field_type, is_required, is_active, placeholder, help_text, sort_order, options)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [field_key, field_label, field_type, is_required, is_active, placeholder ?? null, help_text ?? null, sort_order, optionsJson]
    )
    return result.data[0]
  }
}

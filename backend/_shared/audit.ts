async function ensureAuditTable() {
  await retoolDb.query(`
    CREATE TABLE IF NOT EXISTS portal_audit_events (
      id BIGSERIAL PRIMARY KEY,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      event_type TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

export async function logAuditEvent(input: {
  actorType: 'client' | 'admin' | 'system'
  actorId?: string | number | null
  eventType: string
  resourceType: string
  resourceId?: string | number | null
  metadata?: Record<string, unknown>
}) {
  await ensureAuditTable()

  await retoolDb.query(
    `INSERT INTO portal_audit_events (actor_type, actor_id, event_type, resource_type, resource_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      input.actorType,
      input.actorId != null ? String(input.actorId) : null,
      input.eventType,
      input.resourceType,
      input.resourceId != null ? String(input.resourceId) : null,
      JSON.stringify(input.metadata ?? {}),
    ]
  )
}

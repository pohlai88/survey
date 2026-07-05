type WorkflowActorType = 'client' | 'admin' | 'system'

type WorkflowEventInput = {
  actorType: WorkflowActorType
  actorId?: string | number | null
  eventType: string
  resourceType: string
  resourceId?: string | number | null
  payload?: Record<string, unknown>
}

type NotificationInput = {
  eventId?: number | null
  notificationType: string
  recipientEmail?: string | null
  subject?: string | null
  bodyHtml?: string | null
  bodyText?: string | null
  metadata?: Record<string, unknown>
}

async function ensureWorkflowTables() {
  await retoolDb.query(`
    CREATE TABLE IF NOT EXISTS workflow_events (
      id BIGSERIAL PRIMARY KEY,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      event_type TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await retoolDb.query(`
    CREATE TABLE IF NOT EXISTS notification_outbox (
      id BIGSERIAL PRIMARY KEY,
      workflow_event_id BIGINT REFERENCES workflow_events(id) ON DELETE SET NULL,
      notification_type TEXT NOT NULL,
      recipient_email TEXT,
      subject TEXT,
      body_html TEXT,
      body_text TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

export async function emitWorkflowEvent(input: WorkflowEventInput) {
  await ensureWorkflowTables()

  const result = await retoolDb.query<{ id: number }>(
    `INSERT INTO workflow_events (actor_type, actor_id, event_type, resource_type, resource_id, payload)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id`,
    [
      input.actorType,
      input.actorId != null ? String(input.actorId) : null,
      input.eventType,
      input.resourceType,
      input.resourceId != null ? String(input.resourceId) : null,
      JSON.stringify(input.payload ?? {}),
    ]
  )

  return result.data[0]?.id ?? null
}

export async function enqueueNotification(input: NotificationInput) {
  await ensureWorkflowTables()

  const result = await retoolDb.query<{ id: number }>(
    `INSERT INTO notification_outbox (
       workflow_event_id, notification_type, recipient_email, subject, body_html, body_text, metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING id`,
    [
      input.eventId ?? null,
      input.notificationType,
      input.recipientEmail ?? null,
      input.subject ?? null,
      input.bodyHtml ?? null,
      input.bodyText ?? null,
      JSON.stringify(input.metadata ?? {}),
    ]
  )

  return result.data[0]?.id ?? null
}

export async function sendOutboxEmail(input: NotificationInput) {
  const outboxId = await enqueueNotification(input)
  if (!outboxId || !input.recipientEmail || !input.subject || (!input.bodyHtml && !input.bodyText)) {
    return outboxId
  }

  try {
    await retoolEmail.sendEmail({
      to: input.recipientEmail,
      subject: input.subject,
      bodyType: input.bodyHtml ? 'html' : 'text',
      suppressRetoolSignature: true,
      body: input.bodyHtml ?? input.bodyText ?? '',
    })

    await retoolDb.query(
      `UPDATE notification_outbox
       SET status = 'sent',
           sent_at = NOW(),
           attempt_count = attempt_count + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [outboxId]
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Notification send failed.'
    await retoolDb.query(
      `UPDATE notification_outbox
       SET status = 'failed',
           attempt_count = attempt_count + 1,
           last_error = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [outboxId, message]
    )
    throw error
  }

  return outboxId
}

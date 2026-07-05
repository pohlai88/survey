function getObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

function getString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function getStringArray(value) {
  return Array.isArray(value) && value.every(item => typeof item === 'string') ? value : undefined
}

export function buildApiBoundaryEvent({ requestId, status, operation, payload }) {
  const payloadObject = getObject(payload)
  const errorObject = getObject(payloadObject?.error)
  const detailsObject = getObject(errorObject?.details)

  return {
    source: 'portal_api_boundary',
    request_id: requestId,
    operation: operation ?? getString(detailsObject?.operation),
    status,
    outcome: status >= 400 ? 'error' : 'ok',
    error_code: getString(errorObject?.code),
    actor_type: getString(detailsObject?.actor_type),
    missing_resources: getStringArray(detailsObject?.missing_resources),
    missing_adapters: getStringArray(detailsObject?.missing_adapters),
  }
}

export function shouldLogApiBoundaryEvent() {
  return process.env.NODE_ENV === 'production' || process.env.PORTAL_API_OBSERVABILITY === 'true'
}

export function recordApiBoundaryEvent(eventInput) {
  if (!shouldLogApiBoundaryEvent()) return

  const event = buildApiBoundaryEvent(eventInput)
  const level = event.status >= 500 ? 'error' : event.status >= 400 ? 'warn' : 'info'
  console[level](JSON.stringify(event))
}

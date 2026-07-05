export type ApiBoundaryEventInput = {
  requestId: string
  status: number
  operation?: string | null
  payload: unknown
}

export type ApiBoundaryEvent = {
  source: 'portal_api_boundary'
  request_id: string
  operation: string | null
  status: number
  outcome: 'ok' | 'error'
  error_code: string | null
  actor_type?: string | null
  missing_resources?: string[]
  missing_adapters?: string[]
}

export function buildApiBoundaryEvent(input: ApiBoundaryEventInput): ApiBoundaryEvent
export function shouldLogApiBoundaryEvent(): boolean
export function recordApiBoundaryEvent(input: ApiBoundaryEventInput): void

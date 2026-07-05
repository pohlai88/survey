export type DispatchActor =
  | { type: 'public' }
  | { type: 'client'; sessionToken: string }
  | { type: 'admin' }

export type DispatchContext = {
  actor: DispatchActor
  operation: string
  params: Record<string, unknown>
  requestId: string
}

export type OperationHandler = (context: DispatchContext) => Promise<unknown>

export const operationHandlers: Record<string, OperationHandler>
export const dispatchableOperations: string[]
export function dispatchOperation(operation: string, context: DispatchContext): Promise<unknown>

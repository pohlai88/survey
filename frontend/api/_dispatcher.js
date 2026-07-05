import { operationContracts } from './_contracts.js'

function notImplemented(operation) {
  return async function dispatchPlaceholder(context) {
    throw Object.assign(new Error(`No backend dispatcher is implemented for ${operation}.`), {
      code: 'BACKEND_DISPATCHER_NOT_IMPLEMENTED',
      status: 501,
      details: { operation, actor_type: context.actor.type },
    })
  }
}

export const operationHandlers = Object.fromEntries(
  Object.keys(operationContracts)
    .filter(operation => operation !== 'health.readiness')
    .map(operation => [operation, notImplemented(operation)])
)

export const dispatchableOperations = Object.keys(operationHandlers).sort()

export async function dispatchOperation(operation, context) {
  const handler = operationHandlers[operation]
  if (!handler) {
    throw Object.assign(new Error(`No backend dispatcher is registered for ${operation}.`), {
      code: 'BACKEND_DISPATCHER_NOT_FOUND',
      status: 501,
      details: { operation },
    })
  }

  return handler(context)
}

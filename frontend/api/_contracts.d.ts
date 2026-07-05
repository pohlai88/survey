export type ActorRequirement = 'public' | 'client' | 'admin'
export type ResourceRequirement = 'database' | 'notification' | 'storage'

export type OperationContract = {
  actor: ActorRequirement
  resources: ResourceRequirement[]
}

export const operationContracts: Record<string, OperationContract>
export const resourceEnv: Record<ResourceRequirement, string[]>

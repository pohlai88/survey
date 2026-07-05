import { createBackendHook } from '../../lib/backend/hookFactory'

export const useLoginClient = createBackendHook<{ email: string; password: string }, unknown>('clients.loginClient')
export const useRegisterClient = createBackendHook<{ full_name: string; email: string; password: string }, unknown>('clients.registerClient')

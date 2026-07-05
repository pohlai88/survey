import { createBackendHook } from '../../lib/backend/hookFactory'

export const useGetMyAssignments = createBackendHook<Record<string, never>, unknown>('client.getMyAssignments')
export const useGetOnboardingFields = createBackendHook<Record<string, never>, unknown>('client.getOnboardingFields')
export const useSaveClientProfile = createBackendHook<{ profile_data: Record<string, string> }, unknown>('client.saveClientProfile')
export const useSubmitAssignment = createBackendHook<{ assignment_id: number; answers: unknown[] }, unknown>('client.submitAssignment')

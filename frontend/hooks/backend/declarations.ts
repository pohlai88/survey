import { createBackendHook } from '../../lib/backend/hookFactory'

export const useGetDeclarationById = createBackendHook<{ id: number }, unknown>('declarations.getDeclarationById')
export const useGetDeclarations = createBackendHook<{ status?: string; search?: string }, unknown>('declarations.getDeclarations')
export const useGetEvidenceFileAccess = createBackendHook<{ declaration_id: number; file_id: string }, unknown>('declarations.getEvidenceFileAccess')
export const useSubmitDeclaration = createBackendHook<Record<string, unknown>, unknown>('declarations.submitDeclaration')
export const useSubmitDeclarationWithAnswers = createBackendHook<Record<string, unknown>, unknown>('declarations.submitDeclarationWithAnswers')
export const useSubmitFeedback = createBackendHook<Record<string, unknown>, unknown>('declarations.submitFeedback')
export const useUploadDeclarationFile = createBackendHook<{ fileName: string; base64Data: string; mimeType: string }, unknown>('declarations.uploadDeclarationFile')

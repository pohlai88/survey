import { createBackendHook } from '../../lib/backend/hookFactory'

export const useDeleteQuestion = createBackendHook<{ id: number }, unknown>('questions.deleteQuestion')
export const useDeleteQuestionSet = createBackendHook<{ id: number }, unknown>('questions.deleteQuestionSet')
export const useGetQuestionSet = createBackendHook<{ id: number }, unknown>('questions.getQuestionSet')
export const useGetQuestionSets = createBackendHook<Record<string, never>, unknown>('questions.getQuestionSets')
export const useGetQuestionsForType = createBackendHook<{ declaration_type: string }, unknown>('questions.getQuestionsForType')
export const useReorderQuestions = createBackendHook<{ items: Array<{ id: number; sort_order: number }> }, unknown>('questions.reorderQuestions')
export const useSaveQuestion = createBackendHook<Record<string, unknown>, unknown>('questions.saveQuestion')
export const useSaveQuestionSet = createBackendHook<Record<string, unknown>, unknown>('questions.saveQuestionSet')

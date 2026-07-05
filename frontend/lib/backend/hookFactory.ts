import { useCallback, useState } from 'react'
import { invokeBackend, type TriggerOptions } from './runtime'

export type BackendHookResult<TParams, TData> = {
  data: TData | null
  error: string | null
  loading: boolean
  trigger: (params: TParams, options?: TriggerOptions) => Promise<TData>
}

export function createBackendHook<TParams, TData>(operation: string) {
  return function useBackendHook(): BackendHookResult<TParams, TData> {
    const [data, setData] = useState<TData | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const trigger = useCallback(async (params: TParams, options?: TriggerOptions) => {
      setLoading(true)
      setError(null)

      try {
        const result = await invokeBackend<TData>(operation, params, options)
        setData(result)
        return result
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : 'Request failed.'
        setError(message)
        throw new Error(message)
      } finally {
        setLoading(false)
      }
    }, [])

    return { data, error, loading, trigger }
  }
}

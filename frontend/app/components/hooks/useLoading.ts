'use client'

import { useState, useCallback } from 'react'

interface UseLoadingOptions {
  initialLoading?: boolean
  onError?: (error: Error) => void
  onSuccess?: () => void
}

interface UseLoadingReturn {
  loading: boolean
  error: Error | null
  execute: <T>(asyncFn: () => Promise<T>) => Promise<T | undefined>
  setLoading: (loading: boolean) => void
  setError: (error: Error | null) => void
  clearError: () => void
}

export function useLoading(options: UseLoadingOptions = {}): UseLoadingReturn {
  const { initialLoading = false, onError, onSuccess } = options
  const [loading, setLoading] = useState(initialLoading)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | undefined> => {
    try {
      setLoading(true)
      setError(null)
      const result = await asyncFn()
      onSuccess?.()
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred')
      setError(error)
      onError?.(error)
      return undefined
    } finally {
      setLoading(false)
    }
  }, [onError, onSuccess])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    loading,
    error,
    execute,
    setLoading,
    setError,
    clearError
  }
}

// Hook for async operations with retry functionality
export function useAsyncOperation<T = any>(
  asyncFn: () => Promise<T>,
  options: UseLoadingOptions & { 
    retries?: number
    retryDelay?: number
  } = {}
) {
  const { retries = 0, retryDelay = 1000, ...loadingOptions } = options
  const { loading, error, execute, clearError } = useLoading(loadingOptions)
  const [retryCount, setRetryCount] = useState(0)

  const executeWithRetry = useCallback(async (): Promise<T | undefined> => {
    const result = await execute(asyncFn)
    
    if (result === undefined && retryCount < retries) {
      setRetryCount(prev => prev + 1)
      await new Promise(resolve => setTimeout(resolve, retryDelay))
      return executeWithRetry()
    }
    
    return result
  }, [asyncFn, execute, retryCount, retries, retryDelay])

  const reset = useCallback(() => {
    setRetryCount(0)
    clearError()
  }, [clearError])

  return {
    loading,
    error,
    retryCount,
    execute: executeWithRetry,
    reset
  }
}

// Hook for form submission with loading states
export function useFormSubmission<T = any>(
  submitFn: (data: T) => Promise<any>,
  options: UseLoadingOptions = {}
) {
  const { loading, error, execute, clearError } = useLoading(options)

  const submit = useCallback(async (data: T) => {
    return execute(() => submitFn(data))
  }, [execute, submitFn])

  return {
    loading,
    error,
    submit,
    clearError
  }
}

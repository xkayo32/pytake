/**
 * React Hook for GraphQL queries
 * Simplifies using GraphQL in React components
 */

import { useState, useCallback } from 'react'
import { executeGraphQL, GraphQLResponse } from '@/lib/graphql-client'

interface UseGraphQLOptions {
  skip?: boolean
  pollInterval?: number
}

interface UseGraphQLState<T> {
  data?: T
  loading: boolean
  error?: Error
}

/**
 * Hook to execute GraphQL query
 * @param query - GraphQL query string
 * @param variables - Query variables
 * @param options - Hook options
 * @returns State object with data, loading, error
 */
export function useGraphQL<T = any>(
  query: string,
  variables?: Record<string, any>,
  options?: UseGraphQLOptions
): UseGraphQLState<T> {
  const [state, setState] = useState<UseGraphQLState<T>>({
    loading: !options?.skip,
    error: undefined,
    data: undefined,
  })

  const execute = useCallback(async () => {
    if (options?.skip) return

    setState((prev) => ({ ...prev, loading: true, error: undefined }))

    try {
      const response = await executeGraphQL<T>(query, variables)

      if (response.errors && response.errors.length > 0) {
        throw new Error(response.errors[0].message)
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        data: response.data,
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      }))
    }
  }, [query, variables, options?.skip])

  // Execute on mount
  useState(() => {
    execute()
  })

  // Poll if interval is set
  useState(() => {
    if (!options?.pollInterval) return

    const interval = setInterval(execute, options.pollInterval)
    return () => clearInterval(interval)
  }, [execute, options?.pollInterval])

  return state
}

/**
 * Hook to execute GraphQL mutation
 * @param mutation - GraphQL mutation string
 * @returns [execute, state] - Execute function and state object
 */
export function useMutation<T = any>(
  mutation: string
): [
  (variables?: Record<string, any>) => Promise<T | undefined>,
  UseGraphQLState<T>
] {
  const [state, setState] = useState<UseGraphQLState<T>>({
    loading: false,
    error: undefined,
    data: undefined,
  })

  const execute = useCallback(
    async (variables?: Record<string, any>) => {
      setState((prev) => ({ ...prev, loading: true, error: undefined }))

      try {
        const response = await executeGraphQL<T>(mutation, variables)

        if (response.errors && response.errors.length > 0) {
          throw new Error(response.errors[0].message)
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          data: response.data,
        }))

        return response.data
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err,
        }))
        throw err
      }
    },
    [mutation]
  )

  return [execute, state]
}

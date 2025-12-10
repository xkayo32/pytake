/**
 * GraphQL Client for PyTake Frontend
 * Handles GraphQL queries and mutations with authentication
 */

import { getApiUrl, getAuthHeaders } from './api'

export interface GraphQLResponse<T = any> {
  data?: T
  errors?: Array<{
    message: string
    locations?: Array<{ line: number; column: number }>
    path?: string[]
  }>
}

/**
 * Execute a GraphQL query or mutation
 * @param query - GraphQL query string
 * @param variables - Query variables
 * @returns Response with data or errors
 */
export async function executeGraphQL<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<GraphQLResponse<T>> {
  try {
    const response = await fetch(`${getApiUrl()}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    })

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('GraphQL client error:', error)
    throw error
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  return executeGraphQL(
    `
    query {
      me {
        id
        email
        name: name
        role
        isActive: is_active
        organizationId: organization_id
      }
    }
    `
  )
}

/**
 * Example: Get users by organization
 */
export async function getUsersByOrganization(organizationId: string) {
  return executeGraphQL(
    `
    query GetUsers($orgId: ID!) {
      users(organizationId: $orgId) {
        id
        email
        name: name
        role
      }
    }
    `,
    { orgId: organizationId }
  )
}

/**
 * Login mutation
 */
export async function loginUser(email: string, password: string) {
  return executeGraphQL(
    `
    mutation Login($email: String!, $password: String!) {
      login(input: { email: $email, password: $password }) {
        user {
          id
          email
          name: name
          role
        }
        token {
          accessToken: access_token
          refreshToken: refresh_token
          expiresIn: expires_in
        }
      }
    }
    `,
    { email, password }
  )
}

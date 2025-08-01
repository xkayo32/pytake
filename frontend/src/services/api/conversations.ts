import apiClient from './client'
import type { 
  Conversation, 
  ConversationFilters, 
  PaginatedResponse,
  Message 
} from '@/types'

export const conversationsApi = {
  async getConversations(params?: {
    page?: number
    perPage?: number
    filters?: ConversationFilters
  }) {
    const searchParams = new URLSearchParams()
    
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.perPage) searchParams.append('per_page', params.perPage.toString())
    
    if (params?.filters) {
      if (params.filters.platform?.length) {
        searchParams.append('platform', params.filters.platform.join(','))
      }
      if (params.filters.status?.length) {
        searchParams.append('status', params.filters.status.join(','))
      }
      if (params.filters.priority?.length) {
        searchParams.append('priority', params.filters.priority.join(','))
      }
      if (params.filters.assignedUserId) {
        searchParams.append('assigned_user_id', params.filters.assignedUserId)
      }
      if (params.filters.search) {
        searchParams.append('search', params.filters.search)
      }
      if (params.filters.dateRange) {
        searchParams.append('start_date', params.filters.dateRange.start)
        searchParams.append('end_date', params.filters.dateRange.end)
      }
    }

    const queryString = searchParams.toString()
    const endpoint = `/conversations${queryString ? `?${queryString}` : ''}`
    
    return apiClient.get<PaginatedResponse<Conversation>>(endpoint)
  },

  async getConversation(id: string) {
    return apiClient.get<Conversation>(`/conversations/${id}`)
  },

  async updateConversation(id: string, data: Partial<Conversation>) {
    return apiClient.put<Conversation>(`/conversations/${id}`, data)
  },

  async assignConversation(id: string, userId: string) {
    return apiClient.post<Conversation>(`/conversations/${id}/assign`, { userId })
  },

  async unassignConversation(id: string) {
    return apiClient.post<Conversation>(`/conversations/${id}/unassign`)
  },

  async closeConversation(id: string, notes?: string) {
    return apiClient.post<Conversation>(`/conversations/${id}/close`, { notes })
  },

  async reopenConversation(id: string) {
    return apiClient.post<Conversation>(`/conversations/${id}/reopen`)
  },

  async addTags(id: string, tags: string[]) {
    return apiClient.post<Conversation>(`/conversations/${id}/tags`, { tags })
  },

  async removeTags(id: string, tags: string[]) {
    return apiClient.delete<Conversation>(`/conversations/${id}/tags?tags=${tags.join(',')}`)
  },

  async updatePriority(id: string, priority: Conversation['priority']) {
    return apiClient.patch<Conversation>(`/conversations/${id}`, { priority })
  },

  async getMessages(conversationId: string, params?: {
    page?: number
    perPage?: number
    before?: string
    after?: string
  }) {
    const searchParams = new URLSearchParams()
    
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.perPage) searchParams.append('per_page', params.perPage.toString())
    if (params?.before) searchParams.append('before', params.before)
    if (params?.after) searchParams.append('after', params.after)

    const queryString = searchParams.toString()
    const endpoint = `/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`
    
    return apiClient.get<PaginatedResponse<Message>>(endpoint)
  },

  async sendMessage(conversationId: string, data: {
    content: Message['content']
    replyToId?: string
  }) {
    return apiClient.post<Message>(`/conversations/${conversationId}/messages`, data)
  },

  async markAsRead(conversationId: string, messageIds?: string[]) {
    return apiClient.post(`/conversations/${conversationId}/read`, { messageIds })
  },

  async searchConversations(query: string, filters?: ConversationFilters) {
    const searchParams = new URLSearchParams({ q: query })
    
    if (filters?.platform?.length) {
      searchParams.append('platform', filters.platform.join(','))
    }
    if (filters?.status?.length) {
      searchParams.append('status', filters.status.join(','))
    }

    return apiClient.get<Conversation[]>(`/conversations/search?${searchParams.toString()}`)
  }
}
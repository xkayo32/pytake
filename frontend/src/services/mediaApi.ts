// Media API service

import { apiClient } from './api/client';
import type {
  MediaFile,
  MediaUploadResponse,
  MediaListQuery,
  MediaListResponse,
  MediaUploadProgress
} from '@/types/media';

export class MediaApiService {
  /**
   * Upload a media file
   */
  static async uploadFile(
    file: File,
    options?: {
      folder?: string;
      description?: string;
      tags?: string[];
      onProgress?: (progress: MediaUploadProgress) => void;
    }
  ): Promise<MediaUploadResponse> {
    const response = await apiClient.upload<MediaUploadResponse>('/v1/media/upload', file, {
      folder: options?.folder,
      description: options?.description,
      tags: options?.tags?.join(',')
    });

    // TODO: Add progress support later
    if (options?.onProgress) {
      const progress: MediaUploadProgress = {
        loaded: file.size,
        total: file.size,
        percentage: 100
      };
      options.onProgress(progress);
    }
    
    if (!response.success) {
      throw new Error(response.error || 'Upload failed');
    }
    
    return response.data!;
  }
  
  /**
   * Upload multiple files
   */
  static async uploadMultipleFiles(
    files: File[],
    options?: {
      folder?: string;
      onProgress?: (progress: { file: string; progress: MediaUploadProgress }) => void;
      onFileComplete?: (file: string, response: MediaUploadResponse) => void;
    }
  ): Promise<MediaUploadResponse[]> {
    const results: MediaUploadResponse[] = [];
    
    for (const file of files) {
      try {
        const response = await this.uploadFile(file, {
          folder: options?.folder,
          onProgress: (progress) => {
            if (options?.onProgress) {
              options.onProgress({ file: file.name, progress });
            }
          },
        });
        
        results.push(response);
        
        if (options?.onFileComplete) {
          options.onFileComplete(file.name, response);
        }
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        throw error;
      }
    }
    
    return results;
  }
  
  /**
   * List media files
   */
  static async listMedia(query?: MediaListQuery): Promise<MediaListResponse> {
    const params = new URLSearchParams();
    
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.set(key, String(value));
        }
      });
    }
    
    const response = await apiClient.get<MediaListResponse>(`/v1/media?${params}`);
    return response.data!;
  }
  
  /**
   * Get media by ID
   */
  static async getMedia(mediaId: string): Promise<MediaFile> {
    const response = await apiClient.get<MediaFile>(`/v1/media/${mediaId}`);
    return response.data!;
  }
  
  /**
   * Delete media
   */
  static async deleteMedia(mediaId: string): Promise<void> {
    await apiClient.delete(`/v1/media/${mediaId}`);
  }
  
  /**
   * Generate thumbnail for media
   */
  static async generateThumbnail(mediaId: string): Promise<{ thumbnail_url: string }> {
    const response = await apiClient.post<{ thumbnail_url: string }>(
      `/v1/media/${mediaId}/thumbnail`
    );
    return response.data!;
  }
  
  /**
   * Get media metadata
   */
  static async getMediaMetadata(mediaId: string): Promise<MediaFile['metadata']> {
    const response = await apiClient.get<MediaFile['metadata']>(
      `/v1/media/${mediaId}/metadata`
    );
    return response.data!;
  }
  
  /**
   * Search media files
   */
  static async searchMedia(searchQuery: string): Promise<MediaFile[]> {
    const response = await apiClient.get<MediaFile[]>(
      `/v1/media/search?q=${encodeURIComponent(searchQuery)}`
    );
    return response.data || [];
  }
  
  /**
   * Get media by folder
   */
  static async getMediaByFolder(folder: string): Promise<MediaFile[]> {
    const response = await apiClient.get<MediaListResponse>(
      `/v1/media?folder=${encodeURIComponent(folder)}`
    );
    return response.data?.media || [];
  }
}

// React Query keys for media data
export const mediaQueryKeys = {
  all: ['media'] as const,
  lists: () => [...mediaQueryKeys.all, 'list'] as const,
  list: (query?: MediaListQuery) => [...mediaQueryKeys.lists(), query] as const,
  details: () => [...mediaQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...mediaQueryKeys.details(), id] as const,
  search: (query: string) => [...mediaQueryKeys.all, 'search', query] as const,
  folder: (folder: string) => [...mediaQueryKeys.all, 'folder', folder] as const,
};

// Helper to create preview URL for media
export const getMediaPreviewUrl = (media: MediaFile): string => {
  if (media.thumbnail_url) {
    return media.thumbnail_url;
  }
  
  if (media.public_url) {
    return media.public_url;
  }
  
  // Return a placeholder based on media type
  switch (media.media_type) {
    case 'image':
      return '/placeholder-image.png';
    case 'video':
      return '/placeholder-video.png';
    case 'audio':
      return '/placeholder-audio.png';
    case 'document':
      return '/placeholder-document.png';
    default:
      return '/placeholder-file.png';
  }
};

export const mediaApi = MediaApiService;
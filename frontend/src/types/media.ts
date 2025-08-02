// Media types for file upload system

export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'sticker';

export interface MediaFile {
  id: string;
  filename: string;
  file_path: string;
  public_url?: string;
  thumbnail_url?: string;
  file_size: number;
  file_hash: string;
  media_type: MediaType;
  mime_type: string;
  metadata?: MediaMetadata;
  uploaded_at: string;
  uploaded_by: string;
  folder_path?: string;
  tags?: string[];
  description?: string;
}

export interface MediaMetadata {
  width?: number;
  height?: number;
  duration_seconds?: number;
  format?: string;
  codec?: string;
  bitrate?: number;
}

export interface MediaUploadResponse {
  media_id: string;
  file_path: string;
  public_url?: string;
  thumbnail_url?: string;
  file_size: number;
  file_hash: string;
  media_type: string;
}

export interface MediaListQuery {
  page?: number;
  page_size?: number;
  media_type?: MediaType;
  folder?: string;
  search?: string;
}

export interface MediaListResponse {
  media: MediaFile[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface MediaUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Media type configurations
export const MEDIA_TYPE_CONFIG: Record<MediaType, {
  label: string;
  icon: string;
  maxSize: number;
  allowedExtensions: string[];
  accept: string;
}> = {
  image: {
    label: 'Imagens',
    icon: '🖼️',
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],
    accept: 'image/*'
  },
  video: {
    label: 'Vídeos',
    icon: '🎥',
    maxSize: 64 * 1024 * 1024, // 64MB
    allowedExtensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', '3gp', 'mkv'],
    accept: 'video/*'
  },
  audio: {
    label: 'Áudios',
    icon: '🎵',
    maxSize: 16 * 1024 * 1024, // 16MB
    allowedExtensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'wma', 'opus'],
    accept: 'audio/*'
  },
  document: {
    label: 'Documentos',
    icon: '📄',
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'],
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv'
  },
  sticker: {
    label: 'Stickers',
    icon: '🎨',
    maxSize: 500 * 1024, // 500KB
    allowedExtensions: ['webp'],
    accept: '.webp'
  }
};

// Helper functions
export const getMediaTypeFromMimeType = (mimeType: string): MediaType | null => {
  const type = mimeType.split('/')[0];
  
  switch (type) {
    case 'image':
      return 'image';
    case 'video':
      return 'video';
    case 'audio':
      return 'audio';
    case 'application':
      if (mimeType.includes('pdf') || mimeType.includes('document') || 
          mimeType.includes('msword') || mimeType.includes('officedocument')) {
        return 'document';
      }
      return null;
    default:
      return null;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const validateFile = (file: File, mediaType?: MediaType): { valid: boolean; error?: string } => {
  // Get media type from MIME type if not provided
  const type = mediaType || getMediaTypeFromMimeType(file.type);
  
  if (!type) {
    return { valid: false, error: 'Tipo de arquivo não suportado' };
  }
  
  const config = MEDIA_TYPE_CONFIG[type];
  
  // Check file size
  if (file.size > config.maxSize) {
    return { 
      valid: false, 
      error: `Arquivo muito grande. Tamanho máximo: ${formatFileSize(config.maxSize)}` 
    };
  }
  
  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !config.allowedExtensions.includes(extension)) {
    return { 
      valid: false, 
      error: `Extensão não permitida. Extensões aceitas: ${config.allowedExtensions.join(', ')}` 
    };
  }
  
  return { valid: true };
};
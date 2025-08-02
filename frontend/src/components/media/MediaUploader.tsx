import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  FileText,
  Image,
  Film,
  Music,
  File,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { mediaApi } from '@/services/mediaApi';
import { validateFile, formatFileSize, MEDIA_TYPE_CONFIG } from '@/types/media';
import type { MediaType, MediaUploadResponse, MediaUploadProgress } from '@/types/media';

interface MediaUploaderProps {
  onUploadComplete?: (response: MediaUploadResponse) => void;
  onUploadError?: (error: Error) => void;
  multiple?: boolean;
  mediaType?: MediaType;
  maxFiles?: number;
  folder?: string;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: MediaUploadProgress;
  status: 'uploading' | 'completed' | 'error';
  response?: MediaUploadResponse;
  error?: string;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  onUploadComplete,
  onUploadError,
  multiple = false,
  mediaType,
  maxFiles = 10,
  folder,
  className = ''
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, UploadingFile>>(new Map());
  const uploadIdRef = useRef(0);

  const getAcceptedFormats = () => {
    if (mediaType) {
      return { [MEDIA_TYPE_CONFIG[mediaType].accept]: [] };
    }
    
    // Accept all media types
    const accepts: Record<string, string[]> = {};
    Object.values(MEDIA_TYPE_CONFIG).forEach(config => {
      accepts[config.accept] = [];
    });
    return accepts;
  };

  const handleDrop = async (acceptedFiles: File[]) => {
    const filesToUpload = multiple ? acceptedFiles.slice(0, maxFiles) : [acceptedFiles[0]];
    
    for (const file of filesToUpload) {
      const validation = validateFile(file, mediaType);
      
      if (!validation.valid) {
        if (onUploadError) {
          onUploadError(new Error(validation.error));
        }
        continue;
      }
      
      const uploadId = `${file.name}-${uploadIdRef.current++}`;
      
      // Add file to uploading list
      setUploadingFiles(prev => new Map(prev).set(uploadId, {
        file,
        progress: { loaded: 0, total: file.size, percentage: 0 },
        status: 'uploading'
      }));
      
      try {
        const response = await mediaApi.uploadFile(file, {
          folder,
          onProgress: (progress) => {
            setUploadingFiles(prev => {
              const newMap = new Map(prev);
              const current = newMap.get(uploadId);
              if (current) {
                newMap.set(uploadId, { ...current, progress });
              }
              return newMap;
            });
          }
        });
        
        // Update status to completed
        setUploadingFiles(prev => {
          const newMap = new Map(prev);
          const current = newMap.get(uploadId);
          if (current) {
            newMap.set(uploadId, {
              ...current,
              status: 'completed',
              response
            });
          }
          return newMap;
        });
        
        if (onUploadComplete) {
          onUploadComplete(response);
        }
        
        // Remove from list after 3 seconds
        setTimeout(() => {
          setUploadingFiles(prev => {
            const newMap = new Map(prev);
            newMap.delete(uploadId);
            return newMap;
          });
        }, 3000);
        
      } catch (error) {
        // Update status to error
        setUploadingFiles(prev => {
          const newMap = new Map(prev);
          const current = newMap.get(uploadId);
          if (current) {
            newMap.set(uploadId, {
              ...current,
              status: 'error',
              error: error instanceof Error ? error.message : 'Upload failed'
            });
          }
          return newMap;
        });
        
        if (onUploadError) {
          onUploadError(error instanceof Error ? error : new Error('Upload failed'));
        }
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: getAcceptedFormats(),
    multiple,
    maxFiles
  });

  const getFileIcon = (file: File) => {
    const type = file.type.split('/')[0];
    switch (type) {
      case 'image':
        return <Image className="h-5 w-5" />;
      case 'video':
        return <Film className="h-5 w-5" />;
      case 'audio':
        return <Music className="h-5 w-5" />;
      case 'application':
        return <FileText className="h-5 w-5" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  const removeFile = (uploadId: string) => {
    setUploadingFiles(prev => {
      const newMap = new Map(prev);
      newMap.delete(uploadId);
      return newMap;
    });
  };

  return (
    <div className={className}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          {isDragActive
            ? 'Solte os arquivos aqui...'
            : 'Arraste arquivos ou clique para selecionar'}
        </p>
        <p className="text-sm text-gray-500">
          {mediaType
            ? `Apenas arquivos ${MEDIA_TYPE_CONFIG[mediaType].label.toLowerCase()}`
            : 'Imagens, vídeos, áudios e documentos'}
        </p>
        {mediaType && (
          <p className="text-xs text-gray-400 mt-1">
            Tamanho máximo: {formatFileSize(MEDIA_TYPE_CONFIG[mediaType].maxSize)}
          </p>
        )}
      </div>

      {/* Uploading Files List */}
      {uploadingFiles.size > 0 && (
        <div className="mt-4 space-y-2">
          {Array.from(uploadingFiles.entries()).map(([uploadId, uploadingFile]) => (
            <div
              key={uploadId}
              className="bg-white border rounded-lg p-3 flex items-center space-x-3"
            >
              {/* File Icon */}
              <div className="flex-shrink-0">
                {getFileIcon(uploadingFile.file)}
              </div>

              {/* File Info and Progress */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadingFile.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(uploadingFile.file.size)}
                  </p>
                </div>

                {/* Progress Bar */}
                {uploadingFile.status === 'uploading' && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadingFile.progress.percentage}%` }}
                    />
                  </div>
                )}

                {/* Status Messages */}
                {uploadingFile.status === 'completed' && (
                  <p className="text-sm text-green-600 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Upload concluído
                  </p>
                )}

                {uploadingFile.status === 'error' && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {uploadingFile.error || 'Erro no upload'}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex-shrink-0">
                {uploadingFile.status === 'uploading' ? (
                  <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                ) : (
                  <button
                    onClick={() => removeFile(uploadId)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaUploader;
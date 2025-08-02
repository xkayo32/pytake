import React, { useState } from 'react';
import {
  Upload,
  FolderOpen,
  HardDrive,
  FileUp,
  Image,
  Film,
  Music,
  FileText,
  RefreshCw
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { MediaUploader } from '@/components/media/MediaUploader';
import { MediaGallery } from '@/components/media/MediaGallery';
import { mediaQueryKeys } from '@/services/mediaApi';
import { MEDIA_TYPE_CONFIG } from '@/types/media';
import type { MediaFile, MediaUploadResponse } from '@/types/media';
import { useToast } from '@/hooks/useToast';

export default function MediaPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showUploader, setShowUploader] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const handleUploadComplete = (response: MediaUploadResponse) => {
    toast.success('Arquivo enviado com sucesso!');
    queryClient.invalidateQueries({ queryKey: mediaQueryKeys.lists() });
    
    // Hide uploader after successful upload
    setTimeout(() => {
      setShowUploader(false);
    }, 2000);
  };

  const handleUploadError = (error: Error) => {
    toast.error(`Erro ao enviar arquivo: ${error.message}`);
  };

  const handleSelectMedia = (media: MediaFile) => {
    if (selectionMode) {
      setSelectedMedia(prev => {
        const isSelected = prev.some(m => m.id === media.id);
        if (isSelected) {
          return prev.filter(m => m.id !== media.id);
        } else {
          return [...prev, media];
        }
      });
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: mediaQueryKeys.lists() });
  };

  // Mock storage stats
  const storageStats = {
    used: 2.5 * 1024 * 1024 * 1024, // 2.5 GB
    total: 10 * 1024 * 1024 * 1024, // 10 GB
    percentage: 25
  };

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FolderOpen className="h-8 w-8 mr-3 text-blue-600" />
            Central de Mídia
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie imagens, vídeos, áudios e documentos
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Storage Usage */}
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <HardDrive className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              {storageStats.percentage}%
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Armazenamento</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatBytes(storageStats.used)}
          </p>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${storageStats.percentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            de {formatBytes(storageStats.total)} usado
          </p>
        </div>

        {/* Media Type Stats */}
        {Object.entries(MEDIA_TYPE_CONFIG).slice(0, 3).map(([type, config]) => {
          // Mock counts
          const counts = {
            image: 245,
            video: 38,
            audio: 92,
            document: 156,
            sticker: 12
          };

          return (
            <div key={type} className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{config.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {counts[type as keyof typeof counts] || 0}
                  </p>
                </div>
                <div className="p-3 bg-gray-100 rounded-full text-2xl">
                  {config.icon}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowUploader(!showUploader)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileUp className="h-4 w-4 mr-2" />
              Enviar Arquivos
            </button>
            
            <button
              onClick={() => {
                setSelectionMode(!selectionMode);
                setSelectedMedia([]);
              }}
              className={`px-4 py-2 border rounded-lg transition-colors ${
                selectionMode
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {selectionMode ? 'Cancelar Seleção' : 'Selecionar Múltiplos'}
            </button>
          </div>
          
          {selectionMode && selectedMedia.length > 0 && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {selectedMedia.length} arquivo{selectedMedia.length > 1 ? 's' : ''} selecionado{selectedMedia.length > 1 ? 's' : ''}
              </span>
              <button
                onClick={() => {
                  // TODO: Implement bulk delete
                  console.log('Delete selected:', selectedMedia);
                }}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Excluir Selecionados
              </button>
            </div>
          )}
        </div>
        
        {/* Upload Area */}
        {showUploader && (
          <div className="mt-4 pt-4 border-t">
            <MediaUploader
              multiple
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
            />
          </div>
        )}
      </div>

      {/* Media Gallery */}
      <div className="bg-white rounded-lg shadow-sm border">
        <MediaGallery
          onSelectMedia={handleSelectMedia}
          selectedMediaIds={selectedMedia.map(m => m.id)}
          selectionMode={selectionMode}
          className="p-6"
        />
      </div>
    </div>
  );
}

// useToast hook is imported from @/hooks/useToast
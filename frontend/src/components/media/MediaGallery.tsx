import React, { useState } from 'react';
import {
  Grid,
  List,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  MoreVertical,
  Image as ImageIcon,
  Film,
  Music,
  FileText,
  Folder,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaApi, mediaQueryKeys, getMediaPreviewUrl } from '@/services/mediaApi';
import { formatFileSize, MEDIA_TYPE_CONFIG } from '@/types/media';
import type { MediaFile, MediaType, MediaListQuery } from '@/types/media';
import { MediaPreview } from './MediaPreview';

interface MediaGalleryProps {
  onSelectMedia?: (media: MediaFile) => void;
  selectedMediaIds?: string[];
  selectionMode?: boolean;
  viewMode?: 'grid' | 'list';
  className?: string;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  onSelectMedia,
  selectedMediaIds = [],
  selectionMode = false,
  viewMode: initialViewMode = 'grid',
  className = ''
}) => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<MediaType | 'all'>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Query filters
  const filters: MediaListQuery = {
    search: searchQuery || undefined,
    media_type: selectedType !== 'all' ? selectedType : undefined,
    folder: selectedFolder || undefined,
    page_size: 50
  };
  
  // Fetch media list
  const { data, isLoading, error } = useQuery({
    queryKey: mediaQueryKeys.list(filters),
    queryFn: () => mediaApi.listMedia(filters)
  });
  
  // Delete media mutation
  const deleteMutation = useMutation({
    mutationFn: (mediaId: string) => mediaApi.deleteMedia(mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaQueryKeys.lists() });
    }
  });
  
  const handleDelete = (media: MediaFile) => {
    if (window.confirm(`Tem certeza que deseja excluir ${media.filename}?`)) {
      deleteMutation.mutate(media.id);
    }
  };
  
  const handleDownload = (media: MediaFile) => {
    if (media.public_url) {
      window.open(media.public_url, '_blank');
    }
  };
  
  const isSelected = (mediaId: string) => selectedMediaIds.includes(mediaId);
  
  const renderMediaItem = (media: MediaFile) => {
    const selected = isSelected(media.id);
    const mediaConfig = MEDIA_TYPE_CONFIG[media.media_type];
    
    if (viewMode === 'grid') {
      return (
        <div
          key={media.id}
          className={`group relative bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer ${
            selected ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => selectionMode && onSelectMedia ? onSelectMedia(media) : setPreviewMedia(media)}
        >
          {/* Preview */}
          <div className="aspect-square bg-gray-100 flex items-center justify-center">
            {media.media_type === 'image' && media.public_url ? (
              <img
                src={getMediaPreviewUrl(media)}
                alt={media.filename}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-gray-400">
                {media.media_type === 'video' && <Film className="h-12 w-12" />}
                {media.media_type === 'audio' && <Music className="h-12 w-12" />}
                {media.media_type === 'document' && <FileText className="h-12 w-12" />}
                {media.media_type === 'image' && <ImageIcon className="h-12 w-12" />}
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="p-3">
            <p className="text-sm font-medium text-gray-900 truncate">
              {media.filename}
            </p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500">
                {formatFileSize(media.file_size)}
              </p>
              <span className="text-xs text-gray-400">
                {mediaConfig.icon}
              </span>
            </div>
          </div>
          
          {/* Actions */}
          {!selectionMode && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white rounded-lg shadow-lg p-1 flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewMedia(media);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Visualizar"
                >
                  <Eye className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(media);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Baixar"
                >
                  <Download className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(media);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>
          )}
          
          {/* Selection indicator */}
          {selectionMode && selected && (
            <div className="absolute top-2 left-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}
        </div>
      );
    }
    
    // List view
    return (
      <div
        key={media.id}
        className={`bg-white border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer ${
          selected ? 'ring-2 ring-blue-500' : ''
        }`}
        onClick={() => selectionMode && onSelectMedia ? onSelectMedia(media) : setPreviewMedia(media)}
      >
        <div className="flex items-center space-x-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            {media.media_type === 'image' && <ImageIcon className="h-8 w-8 text-gray-400" />}
            {media.media_type === 'video' && <Film className="h-8 w-8 text-gray-400" />}
            {media.media_type === 'audio' && <Music className="h-8 w-8 text-gray-400" />}
            {media.media_type === 'document' && <FileText className="h-8 w-8 text-gray-400" />}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {media.filename}
            </p>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-xs text-gray-500">
                {formatFileSize(media.file_size)}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(media.uploaded_at).toLocaleDateString('pt-BR')}
              </span>
              {media.folder_path && (
                <span className="text-xs text-gray-500 flex items-center">
                  <Folder className="h-3 w-3 mr-1" />
                  {media.folder_path}
                </span>
              )}
            </div>
          </div>
          
          {/* Actions */}
          {!selectionMode && (
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(media);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Download className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(media);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar arquivos..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-sm'
                    : 'hover:bg-gray-200'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${
                  viewMode === 'list'
                    ? 'bg-white shadow-sm'
                    : 'hover:bg-gray-200'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            
            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 border rounded-lg hover:bg-gray-50 flex items-center space-x-1"
            >
              <Filter className="h-4 w-4" />
              <span className="text-sm">Filtros</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${
                showFilters ? 'rotate-180' : ''
              }`} />
            </button>
          </div>
        </div>
        
        {/* Filters */}
        {showFilters && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            {/* Media Type Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Tipo de Mídia
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedType('all')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedType === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border hover:bg-gray-50'
                  }`}
                >
                  Todos
                </button>
                {Object.entries(MEDIA_TYPE_CONFIG).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type as MediaType)}
                    className={`px-3 py-1 rounded-full text-sm flex items-center space-x-1 ${
                      selectedType === type
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border hover:bg-gray-50'
                    }`}
                  >
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Folder Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Pasta
              </label>
              <input
                type="text"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                placeholder="Filtrar por pasta..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="text-gray-500 mt-2">Carregando mídia...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">Erro ao carregar mídia</p>
        </div>
      ) : data?.media.length === 0 ? (
        <div className="text-center py-12">
          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Nenhum arquivo encontrado</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
          : 'space-y-2'
        }>
          {data?.media.map(renderMediaItem)}
        </div>
      )}
      
      {/* Pagination */}
      {data && data.pagination.total_pages > 1 && (
        <div className="mt-8 flex items-center justify-center space-x-2">
          <button
            disabled={data.pagination.page === 1}
            className="px-3 py-1 border rounded-lg disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-600">
            Página {data.pagination.page} de {data.pagination.total_pages}
          </span>
          <button
            disabled={data.pagination.page === data.pagination.total_pages}
            className="px-3 py-1 border rounded-lg disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      )}
      
      {/* Media Preview Modal */}
      {previewMedia && (
        <MediaPreview
          media={previewMedia}
          onClose={() => setPreviewMedia(null)}
          onDelete={() => {
            handleDelete(previewMedia);
            setPreviewMedia(null);
          }}
        />
      )}
    </div>
  );
};

export default MediaGallery;
import React, { useState } from 'react';
import {
  Paperclip,
  X,
  Image,
  Film,
  Music,
  FileText,
  Upload,
  Search,
  Check
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { mediaApi, mediaQueryKeys } from '@/services/mediaApi';
import { formatFileSize, MEDIA_TYPE_CONFIG } from '@/types/media';
import type { MediaFile, MediaType } from '@/types/media';
import { MediaUploader } from './MediaUploader';

interface MediaSelectorProps {
  onSelectMedia: (media: MediaFile[]) => void;
  onClose: () => void;
  multiple?: boolean;
  maxFiles?: number;
  mediaTypes?: MediaType[];
  selectedMedia?: MediaFile[];
}

export const MediaSelector: React.FC<MediaSelectorProps> = ({
  onSelectMedia,
  onClose,
  multiple = true,
  maxFiles = 10,
  mediaTypes,
  selectedMedia = []
}) => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'upload'>('gallery');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<MediaType | 'all'>('all');
  const [selected, setSelected] = useState<MediaFile[]>(selectedMedia);

  // Fetch media list
  const { data, isLoading } = useQuery({
    queryKey: mediaQueryKeys.list({
      search: searchQuery || undefined,
      media_type: selectedType !== 'all' ? selectedType : undefined
    }),
    queryFn: () => mediaApi.listMedia({
      search: searchQuery || undefined,
      media_type: selectedType !== 'all' ? selectedType : undefined,
      page_size: 100
    })
  });

  const filteredTypes = mediaTypes
    ? Object.entries(MEDIA_TYPE_CONFIG).filter(([type]) => 
        mediaTypes.includes(type as MediaType)
      )
    : Object.entries(MEDIA_TYPE_CONFIG);

  const handleSelect = (media: MediaFile) => {
    if (multiple) {
      setSelected(prev => {
        const isSelected = prev.some(m => m.id === media.id);
        if (isSelected) {
          return prev.filter(m => m.id !== media.id);
        } else {
          if (prev.length >= maxFiles) {
            return prev;
          }
          return [...prev, media];
        }
      });
    } else {
      setSelected([media]);
    }
  };

  const handleConfirm = () => {
    onSelectMedia(selected);
    onClose();
  };

  const isSelected = (mediaId: string) => selected.some(m => m.id === mediaId);

  const renderMediaItem = (media: MediaFile) => {
    const isMediaSelected = isSelected(media.id);
    const disabled = !isMediaSelected && multiple && selected.length >= maxFiles;

    return (
      <div
        key={media.id}
        className={`relative bg-white border rounded-lg overflow-hidden cursor-pointer transition-all ${
          isMediaSelected ? 'ring-2 ring-blue-500' : ''
        } ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
        }`}
        onClick={() => !disabled && handleSelect(media)}
      >
        {/* Preview */}
        <div className="aspect-square bg-gray-100 flex items-center justify-center">
          {media.media_type === 'image' && media.thumbnail_url ? (
            <img
              src={media.thumbnail_url}
              alt={media.filename}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-gray-400">
              {media.media_type === 'video' && <Film className="h-8 w-8" />}
              {media.media_type === 'audio' && <Music className="h-8 w-8" />}
              {media.media_type === 'document' && <FileText className="h-8 w-8" />}
              {media.media_type === 'image' && <Image className="h-8 w-8" />}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2">
          <p className="text-xs font-medium text-gray-900 truncate">
            {media.filename}
          </p>
          <p className="text-xs text-gray-500">
            {formatFileSize(media.file_size)}
          </p>
        </div>

        {/* Selection indicator */}
        {selected && (
          <div className="absolute top-2 right-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <Check className="h-4 w-4 text-white" />
            </div>
          </div>
        )}

        {/* Multiple selection counter */}
        {multiple && isMediaSelected && (
          <div className="absolute top-2 left-2">
            <div className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              {selected.findIndex((m: MediaFile) => m.id === media.id) + 1}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Selecionar Mídia
            </h2>
            {multiple && (
              <p className="text-sm text-gray-500 mt-1">
                {selected.length} de {maxFiles} arquivos selecionados
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('gallery')}
              className={`py-3 border-b-2 transition-colors ${
                activeTab === 'gallery'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Image className="h-4 w-4" />
                <span>Galeria</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-3 border-b-2 transition-colors ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Novo Upload</span>
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'gallery' ? (
            <div className="h-full flex flex-col">
              {/* Filters */}
              <div className="p-4 border-b space-y-3">
                {/* Search */}
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

                {/* Type filters */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedType('all')}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedType === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Todos
                  </button>
                  {filteredTypes.map(([type, config]) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type as MediaType)}
                      className={`px-3 py-1 rounded-full text-sm flex items-center space-x-1 ${
                        selectedType === type
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Gallery */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <p className="text-gray-500 mt-2">Carregando mídia...</p>
                  </div>
                ) : data?.media.length === 0 ? (
                  <div className="text-center py-12">
                    <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhum arquivo encontrado</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {data?.media.map(renderMediaItem)}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <MediaUploader
                multiple={multiple}
                maxFiles={maxFiles}
                mediaType={mediaTypes?.length === 1 ? mediaTypes[0] : undefined}
                onUploadComplete={(response) => {
                  // Refresh gallery and switch back
                  setActiveTab('gallery');
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={selected.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Selecionar {selected.length > 0 && `(${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediaSelector;
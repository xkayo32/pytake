import React from 'react';
import {
  X,
  Download,
  Trash2,
  Copy,
  ExternalLink,
  Info,
  Calendar,
  User,
  Tag,
  Folder,
  Hash
} from 'lucide-react';
import { formatFileSize, MEDIA_TYPE_CONFIG } from '@/types/media';
import type { MediaFile } from '@/types/media';

interface MediaPreviewProps {
  media: MediaFile;
  onClose: () => void;
  onDelete?: () => void;
  onSelect?: () => void;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  media,
  onClose,
  onDelete,
  onSelect
}) => {
  const handleCopyUrl = () => {
    if (media.public_url) {
      navigator.clipboard.writeText(media.public_url);
      // TODO: Show toast notification
    }
  };

  const handleDownload = () => {
    if (media.public_url) {
      const link = document.createElement('a');
      link.href = media.public_url;
      link.download = media.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenInNewTab = () => {
    if (media.public_url) {
      window.open(media.public_url, '_blank');
    }
  };

  const renderPreview = () => {
    switch (media.media_type) {
      case 'image':
        return (
          <img
            src={media.public_url || media.thumbnail_url}
            alt={media.filename}
            className="max-w-full max-h-[70vh] object-contain"
          />
        );
      
      case 'video':
        return (
          <video
            src={media.public_url}
            controls
            className="max-w-full max-h-[70vh]"
          >
            Seu navegador não suporta a reprodução de vídeo.
          </video>
        );
      
      case 'audio':
        return (
          <div className="bg-gray-100 rounded-lg p-8 w-full max-w-md">
            <div className="text-center mb-4">
              <div className="text-6xl mb-4">{MEDIA_TYPE_CONFIG.audio.icon}</div>
              <p className="text-lg font-medium text-gray-900">{media.filename}</p>
            </div>
            <audio
              src={media.public_url}
              controls
              className="w-full"
            >
              Seu navegador não suporta a reprodução de áudio.
            </audio>
          </div>
        );
      
      case 'document':
        return (
          <div className="bg-gray-100 rounded-lg p-12 text-center">
            <div className="text-8xl mb-4">{MEDIA_TYPE_CONFIG.document.icon}</div>
            <p className="text-xl font-medium text-gray-900 mb-2">{media.filename}</p>
            <p className="text-gray-600 mb-6">{formatFileSize(media.file_size)}</p>
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Documento
            </button>
          </div>
        );
      
      default:
        return (
          <div className="bg-gray-100 rounded-lg p-12 text-center">
            <p className="text-gray-600">Preview não disponível para este tipo de arquivo</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex">
        {/* Preview Area */}
        <div className="flex-1 bg-gray-50 flex items-center justify-center p-8">
          {renderPreview()}
        </div>

        {/* Info Sidebar */}
        <div className="w-96 border-l bg-white overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Detalhes do Arquivo</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Actions */}
          <div className="p-4 border-b space-y-2">
            {onSelect && (
              <button
                onClick={onSelect}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Selecionar
              </button>
            )}
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownload}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </button>
              
              {media.public_url && (
                <button
                  onClick={handleCopyUrl}
                  className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Copiar URL"
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}
              
              <button
                onClick={handleOpenInNewTab}
                className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                title="Abrir em nova aba"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
              
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="p-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* File Info */}
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Info className="h-4 w-4 mr-1" />
                Informações do Arquivo
              </h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-500">Nome</dt>
                  <dd className="text-sm font-medium text-gray-900 break-all">{media.filename}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Tipo</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {MEDIA_TYPE_CONFIG[media.media_type].label}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Tamanho</dt>
                  <dd className="text-sm font-medium text-gray-900">{formatFileSize(media.file_size)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">MIME Type</dt>
                  <dd className="text-sm font-medium text-gray-900">{media.mime_type}</dd>
                </div>
              </dl>
            </div>

            {/* Metadata */}
            {media.metadata && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Metadados</h3>
                <dl className="space-y-2">
                  {media.metadata.width && media.metadata.height && (
                    <div>
                      <dt className="text-sm text-gray-500">Dimensões</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {media.metadata.width} x {media.metadata.height} pixels
                      </dd>
                    </div>
                  )}
                  {media.metadata.duration_seconds && (
                    <div>
                      <dt className="text-sm text-gray-500">Duração</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {Math.floor(media.metadata.duration_seconds / 60)}:
                        {String(media.metadata.duration_seconds % 60).padStart(2, '0')}
                      </dd>
                    </div>
                  )}
                  {media.metadata.format && (
                    <div>
                      <dt className="text-sm text-gray-500">Formato</dt>
                      <dd className="text-sm font-medium text-gray-900">{media.metadata.format}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Additional Info */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Detalhes Adicionais</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-500 flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    Enviado em
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {new Date(media.uploaded_at).toLocaleString('pt-BR')}
                  </dd>
                </div>
                
                {media.folder_path && (
                  <div>
                    <dt className="text-sm text-gray-500 flex items-center">
                      <Folder className="h-3 w-3 mr-1" />
                      Pasta
                    </dt>
                    <dd className="text-sm font-medium text-gray-900">{media.folder_path}</dd>
                  </div>
                )}
                
                <div>
                  <dt className="text-sm text-gray-500 flex items-center">
                    <Hash className="h-3 w-3 mr-1" />
                    Hash do Arquivo
                  </dt>
                  <dd className="text-sm font-medium text-gray-900 font-mono text-xs break-all">
                    {media.file_hash}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Tags */}
            {media.tags && media.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Tag className="h-4 w-4 mr-1" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {media.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {media.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Descrição</h3>
                <p className="text-sm text-gray-900">{media.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaPreview;
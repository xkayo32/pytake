/**
 * TemplateCard - Card component for displaying flow templates in the gallery
 */

import React from 'react';
import { Clock, Layers, Star, TrendingUp } from 'lucide-react';
import type { FlowTemplate } from '@/types/template';

interface TemplateCardProps {
  template: FlowTemplate;
  onClick: () => void;
}

const COMPLEXITY_CONFIG = {
  simple: {
    label: 'Simples',
    color: 'bg-green-100 text-green-700 border-green-300',
    dotColor: 'bg-green-500',
  },
  medium: {
    label: 'Médio',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    dotColor: 'bg-yellow-500',
  },
  complex: {
    label: 'Complexo',
    color: 'bg-red-100 text-red-700 border-red-300',
    dotColor: 'bg-red-500',
  },
};

export default function TemplateCard({ template, onClick }: TemplateCardProps) {
  const complexityConfig = COMPLEXITY_CONFIG[template.complexity];

  return (
    <button
      onClick={onClick}
      className="w-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 overflow-hidden text-left group"
    >
      {/* Thumbnail */}
      <div className="relative h-40 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
        {template.thumbnail_url || template.preview_image_url ? (
          <img
            src={template.thumbnail_url || template.preview_image_url}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Layers className="w-16 h-16 text-purple-300 dark:text-purple-700" />
          </div>
        )}

        {/* Popular badge */}
        {template.use_count > 100 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-purple-600 text-white text-xs font-medium px-2 py-1 rounded-full">
            <TrendingUp className="w-3 h-3" />
            Popular
          </div>
        )}

        {/* Complexity badge */}
        <div
          className={`absolute bottom-2 left-2 flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border ${complexityConfig.color}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${complexityConfig.dotColor}`} />
          {complexityConfig.label}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Title */}
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2">
          {template.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 flex-1">
          {template.description}
        </p>

        {/* Tags */}
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {template.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md"
              >
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md">
                +{template.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{template.estimated_setup_time}</span>
          </div>

          <div className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            <span>{template.node_count} nós</span>
          </div>

          {template.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span>{template.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

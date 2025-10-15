/**
 * DataTable - Tabela de dados para admin
 * Tema: Indigo/Purple
 */

import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
  keyExtractor?: (item: T, index: number) => string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyIcon: EmptyIcon,
  emptyTitle = 'Nenhum dado encontrado',
  emptyDescription = 'Não há dados para exibir no momento',
  onRowClick,
  keyExtractor = (_, index) => index.toString(),
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:border dark:border-gray-700 p-12">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 dark:text-indigo-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:border dark:border-gray-700 p-12 text-center">
        {EmptyIcon && (
          <div className="w-20 h-20 mx-auto mb-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center">
            <EmptyIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
          </div>
        )}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {emptyTitle}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:border dark:border-gray-700 overflow-visible">
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white ${
                    column.width || ''
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 overflow-visible">
            {data.map((item, index) => (
              <tr
                key={keyExtractor(item, index)}
                onClick={() => onRowClick?.(item)}
                className={`
                  transition-colors duration-150
                  ${
                    onRowClick
                      ? 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/10'
                      : ''
                  }
                `}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300"
                  >
                    {column.render
                      ? column.render(item)
                      : item[column.key]?.toString() || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

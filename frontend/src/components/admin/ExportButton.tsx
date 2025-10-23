'use client';

import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';

interface ExportButtonProps {
  onExportCSV: () => void;
  onExportPDF: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function ExportButton({
  onExportCSV,
  onExportPDF,
  loading = false,
  disabled = false,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      onExportCSV();
    } else {
      onExportPDF();
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>Exportar</span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              <button
                onClick={() => handleExport('csv')}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                <div className="text-left">
                  <div className="font-medium">Exportar CSV</div>
                  <div className="text-xs text-gray-500">Planilha de dados</div>
                </div>
              </button>

              <button
                onClick={() => handleExport('pdf')}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-4 h-4 text-red-600" />
                <div className="text-left">
                  <div className="font-medium">Exportar PDF</div>
                  <div className="text-xs text-gray-500">Relatório visual</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

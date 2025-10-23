'use client';

import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="text-center">
        <FileQuestion className="w-24 h-24 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          404
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Página não encontrada
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Voltar para o início
        </Link>
      </div>
    </div>
  );
}

'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
              Algo deu errado
            </h2>

            <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
              Ocorreu um erro inesperado. Por favor, recarregue a página.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
              >
                Recarregar Página
              </button>

              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
              >
                Tentar Novamente
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg text-xs">
                <summary className="cursor-pointer text-red-600 dark:text-red-400 font-medium">
                  Detalhes do Erro (Dev)
                </summary>
                <pre className="mt-2 text-red-800 dark:text-red-300 overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

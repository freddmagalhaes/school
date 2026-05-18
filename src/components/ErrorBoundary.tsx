import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f1115] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white dark:bg-[#1a1d24] p-8 rounded-xl shadow-xl max-w-md w-full border border-gray-100 dark:border-gray-800">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Ops! Algo deu errado.
            </h2>
            
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Ocorreu um erro inesperado ao processar esta página. Nossa equipe foi notificada ou o erro foi registrado no terminal.
            </p>

            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              <RefreshCcw className="w-5 h-5" />
              Recarregar Aplicação
            </button>
            
            {import.meta.env.DEV && this.state.error && (
              <div className="mt-6 text-left bg-gray-100 dark:bg-black/50 p-4 rounded text-xs text-red-500 overflow-auto max-h-40 font-mono">
                {this.state.error.toString()}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

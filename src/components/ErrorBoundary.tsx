import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FirestoreErrorInfo } from '../lib/firestore-errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  firestoreError: FirestoreErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    firestoreError: null,
  };

  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): State {
    let firestoreError: FirestoreErrorInfo | null = null;
    try {
      // Check if the error message is our JSON FirestoreErrorInfo
      firestoreError = JSON.parse(error.message);
    } catch (e) {
      // Not a FirestoreErrorInfo JSON
    }
    return { hasError: true, error, firestoreError };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const { hasError, firestoreError } = (this as any).state;
    const { children, fallback } = (this as any).props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      const isPermissionDenied = firestoreError?.error.includes('permission-denied');

      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white/[0.02] border border-white/10 backdrop-blur-xl p-10 rounded-3xl space-y-8 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
              <span className="material-symbols-outlined text-red-400 text-4xl">warning</span>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-2xl font-headline font-bold text-white tracking-tight">
                {isPermissionDenied ? 'Acesso Negado' : 'Ops! Algo deu errado'}
              </h2>
              <p className="text-white/40 text-sm font-light leading-relaxed">
                {isPermissionDenied 
                  ? 'Você não tem permissão para visualizar estes dados. Verifique se sua conta tem o nível de acesso necessário.'
                  : 'Ocorreu um erro inesperado ao carregar as informações. Tente recarregar a página.'}
              </p>
            </div>

            {this.state.firestoreError && (
              <div className="bg-black/40 rounded-2xl p-4 text-left border border-white/5 overflow-hidden">
                <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-2">Detalhes Técnicos</p>
                <div className="text-[10px] font-mono text-white/40 break-all space-y-1">
                  <p><span className="text-secondary/60">Operação:</span> {this.state.firestoreError.operationType}</p>
                  <p><span className="text-secondary/60">Caminho:</span> {this.state.firestoreError.path}</p>
                  <p><span className="text-secondary/60">Usuário:</span> {this.state.firestoreError.authInfo.userId || 'Não autenticado'}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-secondary text-on-secondary rounded-2xl font-headline font-bold uppercase text-[10px] tracking-[0.2em] shadow-2xl hover:shadow-secondary/40 transition-all active:scale-95"
              >
                Recarregar Página
              </button>
              <button 
                onClick={() => window.location.href = '/admin'}
                className="w-full py-4 bg-white/5 text-white/60 rounded-2xl font-headline font-bold uppercase text-[10px] tracking-[0.2em] hover:bg-white/10 transition-all"
              >
                Voltar ao Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useAITracker } from '../hooks/useAITracker';

interface InnerProps {
  children: ReactNode;
  trackError: (error: Error, componentStack?: string) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class AIErrorBoundaryInner extends Component<InnerProps, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.trackError(error, errorInfo.componentStack || undefined);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-8 text-center font-body selection:bg-red-500/30">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
            <span className="material-symbols-outlined text-red-500 text-4xl">bug_report</span>
          </div>
          <h1 className="text-4xl font-headline font-bold mb-4 tracking-tight">Ops, algo deu errado</h1>
          <p className="text-white/50 max-w-md font-light leading-relaxed mb-8">
            Nossos sistemas de inteligência artificial já capturaram a anomalia e um log detalhado foi enviado para a equipe de engenharia.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 border border-red-500/30 hover:border-red-500/50 rounded-xl transition-all font-headline font-bold text-[10px] tracking-[0.2em] uppercase text-white shadow-2xl"
          >
            Recarregar Sessão
          </button>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-mono text-white/20 uppercase tracking-widest text-center">
            {this.state.error?.message.substring(0, 100)}...
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// O Error Boundary injeta o hook customizado na classe
export default function AIErrorBoundary({ children }: { children: ReactNode }) {
  const { trackError } = useAITracker();
  return <AIErrorBoundaryInner trackError={trackError}>{children}</AIErrorBoundaryInner>;
}

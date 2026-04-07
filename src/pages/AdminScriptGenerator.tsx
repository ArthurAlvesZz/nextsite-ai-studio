import React, { useState } from 'react';
import SEO from '../components/SEO';
import AdminSidebar from '../components/AdminSidebar';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';

interface SceneData {
  number: string;
  location: string;
  title: string;
  description: string;
  tags: string[];
}

interface PromptData {
  sceneNumber: string;
  content: string;
}

interface ScriptResponse {
  title: string;
  description?: string;
  scenes: SceneData[];
  prompts: PromptData[];
}

// Sub-components for better performance and memoization
const SceneCard = React.memo(({ scene }: { scene: SceneData }) => (
  <div className="lg:col-span-11 xl:last:col-span-11 group">
    <div className="glass-card p-10 rounded-[2.5rem] border border-white/10 relative overflow-hidden mb-8 transform-gpu will-change-transform">
      <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 blur-[80px] -mr-32 -mt-32"></div>
      
      <div className="flex items-center gap-4 mb-8">
        <span className="text-[10px] bg-white/5 px-4 py-1.5 rounded-full text-primary border border-primary/20 font-bold tracking-widest">{scene.number}</span>
        <span className="text-[10px] text-white/30 uppercase tracking-[0.2em]">{scene.location}</span>
      </div>

      <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">{scene.title}</h2>
      <p className="text-white/60 text-xl font-light italic leading-relaxed mb-10">
        "{scene.description}"
      </p>

      <div className="flex flex-wrap gap-4">
        {scene.tags.map(tag => (
          <span key={tag} className="px-4 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-[10px] font-bold text-white/40 uppercase tracking-widest">
            {tag}
          </span>
        ))}
      </div>
    </div>
  </div>
));

const PromptCard = React.memo(({ 
  prompt, 
  idx, 
  onCopy, 
  isCopied 
}: { 
  prompt: PromptData; 
  idx: number; 
  onCopy: (text: string, id: string) => void; 
  isCopied: boolean;
}) => (
  <div className="relative group p-[1px] rounded-[2.5rem] overflow-hidden transform-gpu will-change-transform">
    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
    <div className="relative bg-white/[0.02] backdrop-blur-3xl p-10 rounded-[2.5rem] border border-white/5 h-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${idx % 2 === 0 ? 'bg-primary' : 'bg-secondary'} animate-pulse`}></div>
          <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">PROMPT: {prompt.sceneNumber}</span>
        </div>
        <button 
          onClick={() => onCopy(prompt.content, `p-${idx}`)}
          className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${isCopied ? 'text-green-400' : 'text-primary/60 hover:text-primary'}`}
        >
          <span className="material-symbols-outlined text-lg">
            {isCopied ? 'check' : 'content_copy'}
          </span>
          {isCopied ? 'Copiado!' : ''}
        </button>
      </div>
      <div className="bg-black/20 p-6 rounded-2xl font-mono text-sm leading-relaxed text-white/80 border border-white/5 select-all selection:bg-primary/20 whitespace-pre-wrap">
        {prompt.content}
      </div>
    </div>
  </div>
));

export default function AdminScriptGenerator() {
  const { adminProfile, user, loading: authLoading } = useRequireAuth('owner');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [briefing, setBriefing] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scriptData, setScriptData] = useState<ScriptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!briefing.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await user?.getIdToken();
      const response = await fetch('/api/admin/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ briefing })
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar roteiro. Tente novamente.');
      }

      const data = await response.json();
      setScriptData(data);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPrompt = React.useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 2000);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="font-headline text-on-background min-h-screen flex bg-[#020202] overflow-hidden selection:bg-primary/30">
      <SEO title="Gerar Roteiro/Prompt" />
      
      {/* Background Orbs */}
      <div className="fixed inset-0 w-full h-full -z-10 bg-[#020202] overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full opacity-50"></div>
      </div>

      <AdminSidebar activePage="tools" isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="lg:ml-64 w-full flex-1 min-h-screen relative flex flex-col overflow-y-auto custom-scrollbar pt-24 pb-32">
        <div className="max-w-7xl mx-auto w-full px-6 lg:px-12">
          
          {/* Briefing Section */}
          <section className="mb-16">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-10 rounded-[2.5rem] border border-white/10 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] -mr-32 -mt-32"></div>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <span className="material-symbols-outlined text-2xl">magic_button</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight uppercase">Alquimia de Roteiro</h2>
                  <p className="text-white/30 text-[10px] uppercase tracking-widest font-bold">Descreva sua visão e a IA fará o resto</p>
                </div>
              </div>

              <form onSubmit={handleGenerate} className="space-y-6 relative z-10">
                <div className="relative">
                  <textarea 
                    value={briefing}
                    onChange={(e) => setBriefing(e.target.value)}
                    placeholder="Quero um comercial para clínica odontológica com foco em implantes, estética futurista e tom acolhedor..."
                    className="w-full h-40 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-white text-lg font-light placeholder:text-white/10 outline-none focus:border-primary/50 focus:shadow-[0_0_20px_rgba(173,198,255,0.1)] transition-all resize-none custom-scrollbar"
                  />
                  {briefing.length > 0 && !isLoading && (
                    <button 
                      type="button"
                      onClick={() => setBriefing('')}
                      className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest bg-red-400/10 px-4 py-2 rounded-xl border border-red-400/20">
                      <span className="material-symbols-outlined text-sm">error</span>
                      {error}
                    </div>
                  )}
                  <div className="flex-1"></div>
                  <button 
                    disabled={isLoading || !briefing.trim()}
                    className={`bg-primary text-on-primary font-bold px-10 py-5 rounded-2xl text-[12px] uppercase tracking-[0.3em] flex items-center gap-4 shadow-[0_10px_40px_-10px_rgba(173,198,255,0.4)] hover:shadow-primary/40 hover:-translate-y-1 transition-all active:scale-95 duration-500 disabled:opacity-30 disabled:translate-y-0 disabled:shadow-none`}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-on-primary/20 border-t-on-primary rounded-full animate-spin"></div>
                        Processando Visão...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-md">bolt</span>
                        Gerar Roteiro Mágico
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </section>

          {/* Conditional Rendering Content */}
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-20 flex flex-col items-center gap-8 justify-center min-h-[400px]"
              >
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 animate-pulse"></div>
                  </div>
                  <div className="absolute -inset-10 bg-primary/5 blur-[60px] rounded-full animate-pulse"></div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-white tracking-widest uppercase animate-pulse">Invocando a Alquimia Digital</h3>
                  <p className="text-white/20 text-[10px] uppercase tracking-[0.5em] font-bold">Gerando roteiro e prompts cinematicos...</p>
                </div>
              </motion.div>
            ) : scriptData ? (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-32"
              >
                {/* Result Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                  <div>
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-[0.4em] mb-3 block">Roteiro Gerado com Sucesso</span>
                    <h1 className="text-5xl lg:text-7xl font-extrabold text-white tracking-tighter leading-none font-headline">
                      {scriptData.title}
                    </h1>
                    {scriptData.description && (
                      <p className="text-white/40 text-lg mt-6 font-light max-w-2xl leading-relaxed italic">
                        {scriptData.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Scene Grid */}
                <section>
                  <div className="flex items-center gap-6 mb-12">
                    <h3 className="text-[10px] font-bold tracking-[0.4em] text-white/20 uppercase whitespace-nowrap">Cenas Estruturadas</h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent"></div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-11 gap-8">
                    {scriptData.scenes.map((scene, idx) => (
                      <SceneCard key={idx} scene={scene} />
                    ))}
                  </div>
                </section>

                {/* Optimized Prompts */}
                <section>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 mb-16">
                    <div>
                      <h2 className="text-4xl font-extrabold text-white tracking-tight mb-4">
                        Prompts <span className="font-serif italic text-secondary font-light">Otimizados para IA</span>
                      </h2>
                      <p className="text-white/30 text-sm max-w-xl font-light leading-relaxed">
                        Copie os prompts abaixo para Midjourney, Grok ou Runway.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {scriptData.prompts.map((prompt, idx) => (
                      <PromptCard 
                        key={idx} 
                        idx={idx} 
                        prompt={prompt} 
                        onCopy={handleCopyPrompt} 
                        isCopied={copyFeedback === `p-${idx}`} 
                      />
                    ))}
                  </div>
                </section>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="py-32 flex flex-col items-center text-center px-4"
              >
                <div className="w-24 h-24 rounded-[2rem] bg-white/[0.02] border border-white/10 flex items-center justify-center mb-8 relative">
                   <span className="material-symbols-outlined text-white/10 text-5xl">auto_fix_normal</span>
                   <div className="absolute inset-0 border-2 border-dashed border-white/5 rounded-[2rem] animate-[spin_10s_linear_infinite]"></div>
                </div>
                <h3 className="text-2xl font-headline font-bold text-white/40 tracking-tight leading-relaxed max-w-md">
                  Descreva a visão do seu projeto acima <br/>
                  <span className="text-secondary/30 font-serif italic text-3xl font-light">para iniciarmos a alquimia</span>
                </h3>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Status Bar - Mobile Only */}
      <footer className="fixed bottom-0 left-0 w-full bg-surface/80 backdrop-blur-2xl border-t border-white/5 flex md:hidden justify-around items-center py-6 z-50">
          <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm">save</span>
            Pronto
          </div>
          <div className="flex items-center gap-2 text-white/30 font-bold text-[10px] uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm">history</span>
            Histórico
          </div>
      </footer>
    </div>
  );
}

import React from 'react';
import { motion } from 'motion/react';
import ClientSidebar from '../components/ClientSidebar';
import ClientTopbar from '../components/ClientTopbar';

export default function ClientProjects() {
  return (
    <div className="bg-[#020202] text-white font-body antialiased min-h-screen flex selection:bg-secondary selection:text-on-secondary">
      <ClientSidebar activePage="projects" />

      <div className="flex-1 flex flex-col ml-64 relative">
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>
        <div className="fixed top-0 right-0 w-[300px] h-[300px] bg-primary/5 blur-[100px] rounded-full -z-10 pointer-events-none"></div>

        <ClientTopbar title="Meus Projetos" subtitle="Gerencie suas produções em andamento e acesse arquivos finais." />

        <main className="p-10 space-y-12 max-w-7xl mx-auto w-full">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-4xl font-extrabold tracking-tighter mb-2 font-headline">Meus Projetos</h2>
              <p className="text-white/40 max-w-md text-sm leading-relaxed">Gerencie suas produções em andamento e acesse arquivos finais de campanhas concluídas.</p>
            </div>
            <button className="bg-gradient-to-r from-secondary to-primary text-on-secondary px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:scale-[1.02] transition-all active:scale-95 shadow-[0_0_20px_rgba(233,179,255,0.2)] text-[10px] uppercase tracking-widest">
              <span className="material-symbols-outlined text-sm">add</span>
              Novo Projeto
            </button>
          </div>

          <div className="flex gap-4 mb-12 overflow-x-auto pb-4 scrollbar-hide">
            <button className="bg-primary/10 border border-primary/20 text-primary px-6 py-2 rounded-xl text-xs font-bold whitespace-nowrap uppercase tracking-widest">Todos Projetos</button>
            <button className="bg-white/[0.02] text-white/60 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border border-transparent hover:border-white/10 transition-all whitespace-nowrap">Em Produção (3)</button>
            <button className="bg-white/[0.02] text-white/60 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border border-transparent hover:border-white/10 transition-all whitespace-nowrap">Finalizados (12)</button>
            <button className="bg-white/[0.02] text-white/60 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border border-transparent hover:border-white/10 transition-all whitespace-nowrap">Aguardando Review</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
            {/* Project Card 1 (Large Feature) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-8 group"
            >
              <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-[2rem] overflow-hidden h-full flex flex-col relative hover:bg-white/[0.02] transition-colors">
                <div className="relative h-96 overflow-hidden bg-black">
                  <img alt="Campanha Verão 2026" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-60 group-hover:opacity-80" src="https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&q=80&w=1200" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/20 to-transparent"></div>
                  <div className="absolute top-6 left-6">
                    <span className="bg-tertiary/10 text-tertiary text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-tertiary/20 backdrop-blur-md">Pronto</span>
                  </div>
                </div>
                <div className="p-8 flex justify-between items-center absolute bottom-0 w-full">
                  <div>
                    <h3 className="text-3xl font-bold tracking-tight mb-2 font-headline">Campanha Verão 2026</h3>
                    <div className="flex items-center gap-4 text-white/40 text-xs font-light">
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">calendar_today</span> Out 20, 2025</span>
                      <span className="flex items-center gap-1"><span class="material-symbols-outlined text-sm">folder</span> 4.2 GB</span>
                    </div>
                  </div>
                  <button className="bg-white/5 backdrop-blur-md border border-white/10 text-white px-8 py-4 rounded-xl font-bold hover:bg-primary hover:text-on-primary hover:border-primary transition-all flex items-center gap-2 group/btn text-[10px] uppercase tracking-widest">
                    Ver Arquivos
                    <span className="material-symbols-outlined transition-transform group-hover/btn:translate-x-1 text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Project Card 2 (In Production) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-4 group"
            >
              <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-[2rem] overflow-hidden h-full flex flex-col hover:bg-white/[0.02] transition-colors">
                <div className="relative h-64 overflow-hidden bg-black">
                  <img alt="Tech Keynote Opener" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-40 group-hover:opacity-60" src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-transparent"></div>
                  <div className="absolute top-6 left-6">
                    <span className="bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-secondary/20 backdrop-blur-md">Em Produção</span>
                  </div>
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold tracking-tight mb-4 font-headline">Tech Keynote Opener</h3>
                  <div className="mt-auto space-y-4">
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-secondary to-primary w-3/4 h-full"></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-white/40">Progresso</span>
                      <span className="text-secondary">75%</span>
                    </div>
                    <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest">
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Project Card 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-4 group"
            >
              <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-[2rem] overflow-hidden h-full flex flex-col hover:bg-white/[0.02] transition-colors">
                <div className="relative h-64 overflow-hidden bg-black">
                  <img alt="Editorial Fashion Week" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-60 group-hover:opacity-80" src="https://images.unsplash.com/photo-1581044777550-4cfa60707c03?auto=format&fit=crop&q=80&w=800" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-transparent"></div>
                  <div className="absolute top-6 left-6">
                    <span className="bg-tertiary/10 text-tertiary text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-tertiary/20 backdrop-blur-md">Pronto</span>
                  </div>
                </div>
                <div className="p-8">
                  <h3 className="text-xl font-bold tracking-tight mb-2 font-headline">Editorial Fashion Week</h3>
                  <p className="text-white/40 text-xs mb-6 font-light">Entrega final inclui masters 4K e cortes para redes sociais.</p>
                  <button className="w-full bg-white/5 border border-white/10 py-4 rounded-xl font-bold hover:bg-primary hover:text-on-primary hover:border-primary transition-all text-[10px] uppercase tracking-widest flex justify-center items-center gap-2">
                    <span className="material-symbols-outlined text-sm">download</span>
                    Baixar Tudo
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Project Card 4 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-8 group"
            >
              <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-[2rem] overflow-hidden h-full flex flex-col lg:flex-row hover:bg-white/[0.02] transition-colors">
                <div className="lg:w-1/2 relative h-64 lg:h-full overflow-hidden bg-black">
                  <img alt="SaaS Platform Walkthrough" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-40 group-hover:opacity-60" src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#020202] via-transparent to-transparent lg:bg-gradient-to-t lg:from-[#020202] lg:via-transparent lg:to-transparent"></div>
                  <div className="absolute top-6 left-6">
                    <span className="bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-secondary/20 backdrop-blur-md">Em Produção</span>
                  </div>
                </div>
                <div className="lg:w-1/2 p-8 flex flex-col justify-center">
                  <h3 className="text-2xl font-bold tracking-tight mb-3 font-headline">SaaS Platform Walkthrough</h3>
                  <p className="text-white/40 text-xs mb-8 font-light leading-relaxed">Fase 3: Implementação de Motion Graphics e sincronização de locução. Conclusão estimada em 4 dias.</p>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="flex -space-x-3">
                      <div className="w-8 h-8 rounded-full border-2 border-[#020202] bg-white/10 backdrop-blur-md"></div>
                      <div className="w-8 h-8 rounded-full border-2 border-[#020202] bg-white/10 backdrop-blur-md"></div>
                      <div className="w-8 h-8 rounded-full border-2 border-[#020202] bg-white/5 backdrop-blur-md flex items-center justify-center text-[10px] font-bold text-white">+2</div>
                    </div>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Equipe Alocada</span>
                  </div>
                  <button className="w-full bg-white/5 border border-white/10 py-4 rounded-xl font-bold hover:bg-white/10 transition-all text-[10px] uppercase tracking-widest">
                    Ver Cronograma
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          <footer className="pt-8 border-t border-white/5 flex justify-between items-center">
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Mostrando 4 de 15 projetos</p>
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all">
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <div className="flex gap-1">
                <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-xs">1</button>
                <button className="w-10 h-10 flex items-center justify-center rounded-xl text-white/40 hover:bg-white/5 text-xs font-bold">2</button>
                <button className="w-10 h-10 flex items-center justify-center rounded-xl text-white/40 hover:bg-white/5 text-xs font-bold">3</button>
              </div>
              <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

import React from 'react';
import { motion } from 'motion/react';
import ClientSidebar from '../components/ClientSidebar';
import ClientTopbar from '../components/ClientTopbar';

export default function ClientDashboard() {
  return (
    <div className="bg-[#020202] text-white font-body antialiased min-h-screen flex selection:bg-secondary selection:text-on-secondary">
      {/* SideNavBar Shell */}
      <ClientSidebar activePage="dashboard" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col ml-64 relative">
        {/* Background Effects */}
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>
        <div className="fixed top-0 right-0 w-[300px] h-[300px] bg-primary/5 blur-[100px] rounded-full -z-10 pointer-events-none"></div>

        {/* TopNavBar Shell */}
        <ClientTopbar />

        {/* Main Canvas */}
        <main className="p-10 space-y-12 max-w-7xl mx-auto w-full">
          {/* 1. Resumo do Cliente */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-1 bg-white/[0.01] backdrop-blur-3xl border border-white/5 p-8 rounded-[2rem] flex flex-col justify-between hover:bg-white/[0.02] transition-colors"
            >
              <div>
                <span className="text-[10px] uppercase tracking-widest text-primary font-bold font-headline">Empresa</span>
                <h2 className="text-2xl font-bold mt-2 font-headline tracking-tight">Lumina Tech S.A.</h2>
              </div>
              <div className="mt-8 flex items-center gap-2 text-white/40">
                <span className="material-symbols-outlined text-sm text-secondary">verified</span>
                <span className="text-xs font-light">Parceiro Premium desde 2024</span>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="col-span-1 bg-white/[0.01] backdrop-blur-3xl border border-white/5 p-8 rounded-[2rem] flex flex-col justify-between overflow-hidden relative group hover:bg-white/[0.02] transition-colors"
            >
              <div className="z-10">
                <span className="text-[10px] uppercase tracking-widest text-secondary font-bold font-headline">Plano Atual</span>
                <h2 className="text-2xl font-bold mt-2 italic font-serif text-white">Creative Studio X</h2>
              </div>
              <div className="mt-8 z-10">
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="w-3/4 h-full bg-gradient-to-r from-secondary to-primary rounded-full"></div>
                </div>
                <p className="text-[10px] text-white/40 mt-3 font-headline uppercase tracking-widest">75% dos recursos utilizados</p>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
                <span className="material-symbols-outlined text-[120px] text-secondary">auto_awesome</span>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="col-span-1 bg-white/[0.01] backdrop-blur-3xl border border-white/5 p-8 rounded-[2rem] flex flex-col justify-between hover:bg-white/[0.02] transition-colors"
            >
              <div>
                <span className="text-[10px] uppercase tracking-widest text-tertiary font-bold font-headline">Volume Produzido</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-5xl font-black font-headline tracking-tighter">42</span>
                  <span className="text-white/40 text-sm font-light">vídeos entregues</span>
                </div>
              </div>
              <div className="mt-8 flex -space-x-3">
                <div className="w-10 h-10 rounded-full border-2 border-[#020202] bg-white/10 backdrop-blur-md"></div>
                <div className="w-10 h-10 rounded-full border-2 border-[#020202] bg-white/10 backdrop-blur-md"></div>
                <div className="w-10 h-10 rounded-full border-2 border-[#020202] bg-white/10 backdrop-blur-md"></div>
                <div className="w-10 h-10 rounded-full border-2 border-[#020202] bg-white/5 backdrop-blur-md flex items-center justify-center text-[10px] font-bold text-white">+39</div>
              </div>
            </motion.div>
          </section>

          {/* 2. Galeria de Projetos */}
          <section>
            <div className="flex justify-between items-end mb-8">
              <div>
                <h3 className="text-3xl font-extrabold font-headline tracking-tighter">Projetos Ativos</h3>
                <p className="text-white/40 mt-2 font-light">Acompanhe suas produções em andamento e finalize downloads.</p>
              </div>
              <button className="text-[10px] font-headline font-bold uppercase tracking-widest flex items-center gap-2 text-secondary hover:text-white transition-colors">
                Ver Todos <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Project Card 1 */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="group relative bg-white/[0.01] rounded-[2rem] overflow-hidden border border-white/5 hover:border-primary/30 transition-all duration-500"
              >
                <div className="aspect-video overflow-hidden relative bg-black">
                  <img src="https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&q=80&w=800" alt="Project" className="w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-80 transition-all duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-transparent z-10"></div>
                  <div className="absolute top-6 right-6 z-20">
                    <span className="bg-tertiary/10 text-tertiary text-[10px] font-bold px-4 py-1.5 rounded-full border border-tertiary/20 backdrop-blur-md uppercase tracking-widest">Pronto</span>
                  </div>
                </div>
                <div className="p-8 relative">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h4 className="text-2xl font-bold font-headline tracking-tight group-hover:text-primary transition-colors">Campanha Verão 2026</h4>
                      <p className="text-xs text-white/40 mt-2 flex items-center gap-2 font-light">
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        Entrega: 14 Out, 2025
                      </p>
                    </div>
                    <span className="text-white/30 text-[10px] uppercase tracking-widest font-mono bg-white/5 px-3 py-1 rounded-lg">#VX-9021</span>
                  </div>
                  <button className="w-full bg-white/5 hover:bg-primary hover:text-on-primary border border-white/10 hover:border-primary text-white font-bold py-4 rounded-xl transition-all text-[10px] uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-3">
                    <span className="material-symbols-outlined">download</span>
                    Baixar Vídeo Finalizado
                  </button>
                </div>
              </motion.div>

              {/* Project Card 2 */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="group relative bg-white/[0.01] rounded-[2rem] overflow-hidden border border-white/5 hover:border-secondary/30 transition-all duration-500"
              >
                <div className="aspect-video overflow-hidden relative bg-black">
                  <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800" alt="Project" className="w-full h-full object-cover opacity-40 group-hover:scale-105 group-hover:opacity-60 transition-all duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-transparent z-10"></div>
                  <div className="absolute top-6 right-6 z-20">
                    <span className="bg-secondary/10 text-secondary text-[10px] font-bold px-4 py-1.5 rounded-full border border-secondary/20 backdrop-blur-md uppercase tracking-widest">Renderizando</span>
                  </div>
                </div>
                <div className="p-8 relative">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h4 className="text-2xl font-bold font-headline tracking-tight group-hover:text-secondary transition-colors">Manifesto Tech 0.2</h4>
                      <p className="text-xs text-white/40 mt-2 flex items-center gap-2 font-light">
                        <span className="material-symbols-outlined text-sm">history</span>
                        Entrega: Em 4 dias
                      </p>
                    </div>
                    <span className="text-white/30 text-[10px] uppercase tracking-widest font-mono bg-white/5 px-3 py-1 rounded-lg">#VX-9025</span>
                  </div>
                  <button className="w-full bg-white/[0.02] border border-white/5 text-white/30 font-bold py-4 rounded-xl flex items-center justify-center gap-3 cursor-not-allowed text-[10px] uppercase tracking-[0.2em]">
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    Processando Arquivos...
                  </button>
                </div>
              </motion.div>
            </div>
          </section>

          {/* 3. Histórico de Arquivos */}
          <section className="space-y-6">
            <h3 className="text-2xl font-extrabold font-headline tracking-tighter">Histórico de Arquivos</h3>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full overflow-hidden bg-white/[0.01] backdrop-blur-3xl rounded-[2rem] border border-white/5"
            >
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Nome do Arquivo</th>
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Projeto Relacionado</th>
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Tamanho</th>
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                          <span className="material-symbols-outlined text-primary text-sm">movie</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Lumina_Branding_Final_V2.mp4</p>
                          <p className="text-[10px] text-white/40 mt-1 font-light">Enviado em 02 Out, 2025</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-white/60 font-light">Branding Institucional</td>
                    <td className="px-8 py-6 text-sm font-mono text-white/40">1.4 GB</td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-3 rounded-xl hover:bg-primary/20 text-primary transition-all border border-transparent hover:border-primary/30">
                        <span className="material-symbols-outlined text-sm">download</span>
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center border border-secondary/20">
                          <span className="material-symbols-outlined text-secondary text-sm">description</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Roteiro_Campanha_Aprovado.pdf</p>
                          <p className="text-[10px] text-white/40 mt-1 font-light">Enviado em 28 Set, 2025</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-white/60 font-light">Campanha Verão 2026</td>
                    <td className="px-8 py-6 text-sm font-mono text-white/40">12.8 MB</td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-3 rounded-xl hover:bg-secondary/20 text-secondary transition-all border border-transparent hover:border-secondary/30">
                        <span className="material-symbols-outlined text-sm">download</span>
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center border border-tertiary/20">
                          <span className="material-symbols-outlined text-tertiary text-sm">image</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Thumbnail_Collection_Pro.zip</p>
                          <p className="text-[10px] text-white/40 mt-1 font-light">Enviado em 15 Set, 2025</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-white/60 font-light">Social Media Pack</td>
                    <td className="px-8 py-6 text-sm font-mono text-white/40">450 MB</td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-3 rounded-xl hover:bg-tertiary/20 text-tertiary transition-all border border-transparent hover:border-tertiary/30">
                        <span className="material-symbols-outlined text-sm">download</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="bg-white/[0.01] px-8 py-5 flex justify-center border-t border-white/5">
                <button className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">Carregar mais arquivos</button>
              </div>
            </motion.div>
          </section>
        </main>
      </div>
    </div>
  );
}

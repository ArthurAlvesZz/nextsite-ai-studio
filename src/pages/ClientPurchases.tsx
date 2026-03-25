import React from 'react';
import { motion } from 'motion/react';
import ClientSidebar from '../components/ClientSidebar';
import ClientTopbar from '../components/ClientTopbar';

export default function ClientPurchases() {
  return (
    <div className="bg-[#020202] text-white font-body antialiased min-h-screen flex selection:bg-secondary selection:text-on-secondary">
      <ClientSidebar activePage="purchases" />

      <div className="flex-1 flex flex-col ml-64 relative">
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>
        <div className="fixed top-0 right-0 w-[300px] h-[300px] bg-primary/5 blur-[100px] rounded-full -z-10 pointer-events-none"></div>

        <ClientTopbar title="Minhas Compras" subtitle="Acompanhe seu histórico de investimentos e pacotes." />

        <main className="p-10 space-y-12 max-w-7xl mx-auto w-full">
          <section className="mb-16">
            <h2 className="text-4xl font-extrabold tracking-tighter text-white mb-4 font-headline">Minhas Compras</h2>
            <p className="text-white/40 text-sm max-w-2xl leading-relaxed font-light">Acompanhe seu histórico de investimentos e pacotes de vídeos. Gerencie seus recibos e visualize o status de cada transação em tempo real.</p>
          </section>

          <div className="grid grid-cols-12 gap-6 mb-12">
            <div className="col-span-12 md:col-span-8 flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-3 ml-1 font-bold font-headline">Filtrar por Status</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button className="px-6 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Todos</button>
                  <button className="px-6 py-2.5 rounded-xl bg-white/[0.02] border border-transparent hover:border-white/10 text-white/60 text-[10px] font-bold uppercase tracking-widest transition-colors whitespace-nowrap">Confirmado</button>
                  <button className="px-6 py-2.5 rounded-xl bg-white/[0.02] border border-transparent hover:border-white/10 text-white/60 text-[10px] font-bold uppercase tracking-widest transition-colors whitespace-nowrap">Processando</button>
                  <button className="px-6 py-2.5 rounded-xl bg-white/[0.02] border border-transparent hover:border-white/10 text-white/60 text-[10px] font-bold uppercase tracking-widest transition-colors whitespace-nowrap">Pendente</button>
                </div>
              </div>
            </div>
            <div className="col-span-12 md:col-span-4 bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-[2rem] p-8 flex flex-col justify-center hover:bg-white/[0.02] transition-colors">
              <span className="text-white/40 text-[10px] uppercase tracking-widest mb-2 font-bold font-headline">Total Investido</span>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-secondary font-headline">R$ 14.280,00</span>
                <span className="text-tertiary text-[10px] font-bold uppercase tracking-widest">+12% este mês</span>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-[2rem] overflow-hidden mb-12">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold font-headline">Data da Compra</th>
                    <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold font-headline">Pacote/Produto</th>
                    <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold font-headline">ID do Pedido</th>
                    <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold font-headline">Valor (R$)</th>
                    <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold font-headline">Status</th>
                    <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold font-headline text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-white">12 Out, 2025</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary">
                          <span className="material-symbols-outlined text-sm">video_camera_front</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Pacote Social Ads Premium</p>
                          <p className="text-[10px] text-white/40 mt-1 font-light">15 Vídeos Curto Formato</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-mono text-white/40">#NXC-882190</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-white">R$ 4.500,00</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-tertiary/10 text-tertiary border border-tertiary/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-tertiary mr-2"></span>
                        Confirmado
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-3 hover:bg-primary/20 rounded-xl transition-all text-primary border border-transparent hover:border-primary/30 inline-flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">download</span>
                      </button>
                      <button className="ml-4 text-[10px] font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest">Ver Detalhes</button>
                    </td>
                  </tr>

                  <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-white">05 Out, 2025</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-sm">movie_edit</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Edição Cinematic Reel</p>
                          <p className="text-[10px] text-white/40 mt-1 font-light">Pós-produção Avançada</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-mono text-white/40">#NXC-881042</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-white">R$ 1.200,00</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-secondary/10 text-secondary border border-secondary/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary mr-2"></span>
                        Processando
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-3 rounded-xl transition-all text-white/20 cursor-not-allowed border border-transparent inline-flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">download</span>
                      </button>
                      <button className="ml-4 text-[10px] font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest">Ver Detalhes</button>
                    </td>
                  </tr>

                  <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-white">28 Set, 2025</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary">
                          <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Branding Video Assets</p>
                          <p className="text-[10px] text-white/40 mt-1 font-light">Visual Identity Package</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-mono text-white/40">#NXC-879951</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-white">R$ 8.580,00</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-tertiary/10 text-tertiary border border-tertiary/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-tertiary mr-2"></span>
                        Confirmado
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-3 hover:bg-primary/20 rounded-xl transition-all text-primary border border-transparent hover:border-primary/30 inline-flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">download</span>
                      </button>
                      <button className="ml-4 text-[10px] font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest">Ver Detalhes</button>
                    </td>
                  </tr>

                  <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-white">15 Set, 2025</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-error/10 border border-error/20 flex items-center justify-center text-error">
                          <span className="material-symbols-outlined text-sm">priority_high</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Custom Motion Graphics</p>
                          <p className="text-[10px] text-white/40 mt-1 font-light">Intros & Outros</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-mono text-white/40">#NXC-875201</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-white">R$ 2.100,00</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-error/10 text-error border border-error/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-error mr-2"></span>
                        Pendente
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-3 rounded-xl transition-all text-white/20 cursor-not-allowed border border-transparent inline-flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">download</span>
                      </button>
                      <button className="ml-4 text-[10px] font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest">Ver Detalhes</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="p-8 bg-white/[0.02] border-t border-white/5 flex justify-between items-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Mostrando 4 de 12 pedidos recentes</p>
              <div className="flex gap-2">
                <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all">
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-xs">1</button>
                <button className="w-10 h-10 flex items-center justify-center rounded-xl text-white/40 hover:bg-white/5 text-xs font-bold">2</button>
                <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all">
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-7 h-64 relative rounded-[2rem] overflow-hidden group cursor-pointer border border-white/5">
              <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-60" src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200" alt="Upgrade" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#020202] via-[#020202]/80 to-transparent p-10 flex flex-col justify-center">
                <span className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-3">Upgrade Disponível</span>
                <h3 className="text-3xl font-bold text-white mb-6 leading-tight font-headline">Mude para o plano Unlimited<br/>e economize 30%</h3>
                <div>
                  <button className="px-8 py-4 bg-white text-[#020202] rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary transition-colors">Saiba Mais</button>
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-5 bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-[2rem] p-10 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
              <div>
                <h4 className="text-2xl font-bold text-white mb-3 font-headline">Precisa de suporte?</h4>
                <p className="text-white/40 text-sm leading-relaxed font-light">Nossa equipe financeira está disponível para tirar dúvidas sobre seus pagamentos ou faturamento corporativo.</p>
              </div>
              <a className="flex items-center gap-2 text-secondary font-bold text-[10px] uppercase tracking-widest group mt-8" href="#">
                Falar com especialista 
                <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">arrow_forward</span>
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

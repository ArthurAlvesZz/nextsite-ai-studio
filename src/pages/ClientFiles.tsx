import React from 'react';
import { motion } from 'motion/react';
import ClientSidebar from '../components/ClientSidebar';
import ClientTopbar from '../components/ClientTopbar';

export default function ClientFiles() {
  return (
    <div className="bg-[#020202] text-white font-body antialiased min-h-screen flex selection:bg-secondary selection:text-on-secondary">
      <ClientSidebar activePage="files" />

      <div className="flex-1 flex flex-col ml-64 relative">
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>
        <div className="fixed top-0 right-0 w-[300px] h-[300px] bg-primary/5 blur-[100px] rounded-full -z-10 pointer-events-none"></div>

        <ClientTopbar title="Meus Arquivos" subtitle="Acesse e baixe os arquivos finais dos seus projetos." />

        <main className="p-10 space-y-12 max-w-7xl mx-auto w-full">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-4xl font-extrabold tracking-tighter mb-2 font-headline">Meus Arquivos</h2>
              <p className="text-white/40 max-w-md text-sm leading-relaxed">Acesse, visualize e baixe todos os arquivos finais e assets dos seus projetos concluídos.</p>
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm">search</span>
                <input 
                  type="text" 
                  placeholder="Buscar arquivos..." 
                  className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-secondary/50 focus:bg-white/10 transition-all w-64"
                />
              </div>
              <button className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-white/10 transition-all active:scale-95 text-[10px] uppercase tracking-widest">
                <span className="material-symbols-outlined text-sm">filter_list</span>
                Filtrar
              </button>
            </div>
          </div>

          {/* Folders Section */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-6 font-headline">Pastas Recentes</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-2xl p-6 hover:bg-white/[0.02] transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined">folder</span>
                  </div>
                  <button className="text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-sm">more_vert</span>
                  </button>
                </div>
                <h4 className="font-bold text-white mb-1">Campanha Verão 2026</h4>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">12 Arquivos • 4.2 GB</p>
              </div>

              <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-2xl p-6 hover:bg-white/[0.02] transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined">folder</span>
                  </div>
                  <button className="text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-sm">more_vert</span>
                  </button>
                </div>
                <h4 className="font-bold text-white mb-1">Editorial Fashion Week</h4>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">8 Arquivos • 2.1 GB</p>
              </div>

              <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-2xl p-6 hover:bg-white/[0.02] transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center">
                    <span className="material-symbols-outlined">folder</span>
                  </div>
                  <button className="text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-sm">more_vert</span>
                  </button>
                </div>
                <h4 className="font-bold text-white mb-1">Assets de Marca</h4>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">45 Arquivos • 850 MB</p>
              </div>

              <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-2xl p-6 hover:bg-white/[0.02] transition-colors cursor-pointer group flex flex-col items-center justify-center text-center border-dashed">
                <div className="w-12 h-12 rounded-xl bg-white/5 text-white/40 flex items-center justify-center mb-4 group-hover:bg-white/10 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">add</span>
                </div>
                <h4 className="font-bold text-white/60 group-hover:text-white transition-colors">Nova Pasta</h4>
              </div>
            </div>
          </section>

          {/* Files List */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-6 font-headline">Todos os Arquivos</h3>
            <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-[2rem] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold font-headline">Nome do Arquivo</th>
                    <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold font-headline">Projeto</th>
                    <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold font-headline">Tamanho</th>
                    <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold font-headline">Data</th>
                    <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold font-headline text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                          <span className="material-symbols-outlined text-sm">movie</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Hero_Video_Final_v3.mp4</p>
                          <p className="text-[10px] text-white/40 mt-1 font-light">MP4 Video</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm text-white/60">Campanha Verão 2026</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm text-white/60">1.2 GB</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm text-white/60">Hoje, 14:30</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors">
                          <span className="material-symbols-outlined text-sm">visibility</span>
                        </button>
                        <button className="p-2 hover:bg-primary/20 rounded-lg text-primary transition-colors">
                          <span className="material-symbols-outlined text-sm">download</span>
                        </button>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <span className="material-symbols-outlined text-sm">image</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Social_Post_01.jpg</p>
                          <p className="text-[10px] text-white/40 mt-1 font-light">JPEG Image</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm text-white/60">Editorial Fashion Week</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm text-white/60">4.5 MB</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm text-white/60">Ontem, 09:15</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors">
                          <span className="material-symbols-outlined text-sm">visibility</span>
                        </button>
                        <button className="p-2 hover:bg-primary/20 rounded-lg text-primary transition-colors">
                          <span className="material-symbols-outlined text-sm">download</span>
                        </button>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center">
                          <span className="material-symbols-outlined text-sm">description</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Brand_Guidelines.pdf</p>
                          <p className="text-[10px] text-white/40 mt-1 font-light">PDF Document</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm text-white/60">Assets de Marca</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm text-white/60">12.8 MB</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm text-white/60">12 Out, 2025</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors">
                          <span className="material-symbols-outlined text-sm">visibility</span>
                        </button>
                        <button className="p-2 hover:bg-primary/20 rounded-lg text-primary transition-colors">
                          <span className="material-symbols-outlined text-sm">download</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

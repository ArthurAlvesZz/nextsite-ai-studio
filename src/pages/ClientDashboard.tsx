import React from 'react';
import { Link } from 'react-router-dom';

export default function ClientDashboard() {
  return (
    <div className="bg-[#0e0e0e] text-white font-body antialiased min-h-screen flex">
      {/* SideNavBar Shell */}
      <aside className="h-screen w-64 fixed left-0 top-0 overflow-y-auto bg-[#131313] border-r border-[#494847]/15 shadow-2xl shadow-black/50 flex flex-col py-8 px-6 gap-8 z-50">
        <div className="flex flex-col gap-1">
          <span className="text-xl font-bold tracking-tighter text-[#97a9ff] font-headline">Next Creatives</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium">Portal do Cliente</span>
        </div>
        <nav className="flex flex-col gap-2 flex-grow">
          <a className="flex items-center gap-3 px-4 py-3 text-[#97a9ff] bg-[#262626]/60 backdrop-blur-md rounded-full font-bold active:scale-95 transition-transform duration-150" href="#">
            <span className="material-symbols-outlined">grid_view</span>
            <span className="text-sm font-medium">Dashboard</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white transition-colors duration-200 hover:bg-[#1a1919] rounded-full active:scale-95" href="#">
            <span className="material-symbols-outlined">video_library</span>
            <span className="text-sm">Meus Projetos</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white transition-colors duration-200 hover:bg-[#1a1919] rounded-full active:scale-95" href="#">
            <span className="material-symbols-outlined">folder_open</span>
            <span className="text-sm font-medium">Arquivos</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white transition-colors duration-200 hover:bg-[#1a1919] rounded-full active:scale-95" href="#">
            <span className="material-symbols-outlined">receipt_long</span>
            <span className="text-sm font-medium">Faturas</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white transition-colors duration-200 hover:bg-[#1a1919] rounded-full active:scale-95" href="#">
            <span className="material-symbols-outlined">contact_support</span>
            <span className="text-sm font-medium">Suporte</span>
          </a>
        </nav>
        <div className="mt-auto flex flex-col gap-4">
          <button className="bg-[#97a9ff] text-[#002283] font-bold py-3 px-4 rounded-full text-sm active:scale-95 transition-all hover:shadow-[0_0_20px_rgba(151,169,255,0.3)] flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-sm">add</span>
            Novo Briefing
          </button>
          <div className="flex flex-col gap-1 border-t border-[#494847]/10 pt-4">
            <a className="flex items-center gap-3 px-4 py-2 text-white/40 hover:text-white text-sm transition-all" href="#">
              <span className="material-symbols-outlined text-[20px]">settings</span>
              Configurações
            </a>
            <Link to="/client/login" className="flex items-center gap-3 px-4 py-2 text-white/40 hover:text-white text-sm transition-all">
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Sair
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col ml-64">
        {/* TopNavBar Shell */}
        <header className="sticky top-0 z-40 bg-[#0e0e0e]/80 backdrop-blur-xl border-b border-[#494847]/10 flex justify-between items-center px-10 py-6">
          <div className="flex flex-col">
            <h1 className="text-lg font-black bg-gradient-to-r from-[#97a9ff] to-[#3e65ff] bg-clip-text text-transparent font-headline tracking-tight uppercase">Área do Cliente</h1>
            <p className="text-xs text-[#adaaaa] font-medium mt-0.5">Olá, Cliente 👋</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-8 mr-4">
              <a className="text-[#97a9ff] border-b-2 border-[#97a9ff] pb-1 text-sm font-medium" href="#">Visão Geral</a>
              <a className="text-white/50 hover:text-white pb-1 text-sm font-medium transition-opacity" href="#">Recentes</a>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-[#adaaaa] hover:text-white transition-colors relative">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-0 right-0 w-2 h-2 bg-[#cb7bff] rounded-full border-2 border-[#0e0e0e]"></span>
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-[#494847]/20">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[#262626] border border-[#494847]/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white/50">person</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Canvas */}
        <main className="p-10 space-y-12">
          {/* 1. Resumo do Cliente */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 bg-[#1a1919]/70 backdrop-blur-md border border-[#494847]/15 p-8 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#97a9ff] font-bold">Empresa</span>
                <h2 className="text-2xl font-bold mt-2">Lumina Tech S.A.</h2>
              </div>
              <div className="mt-8 flex items-center gap-2 text-[#adaaaa]">
                <span className="material-symbols-outlined text-sm">verified</span>
                <span className="text-xs font-medium">Parceiro Premium desde 2024</span>
              </div>
            </div>
            
            <div className="col-span-1 bg-[#1a1919]/70 backdrop-blur-md border border-[#494847]/15 p-8 rounded-xl flex flex-col justify-between overflow-hidden relative group">
              <div className="z-10">
                <span className="text-[10px] uppercase tracking-widest text-[#cb7bff] font-bold">Plano Atual</span>
                <h2 className="text-2xl font-bold mt-2 italic">Creative Studio X</h2>
              </div>
              <div className="mt-8 z-10">
                <div className="w-full h-1 bg-[#262626] rounded-full">
                  <div className="w-3/4 h-full bg-[#cb7bff] rounded-full"></div>
                </div>
                <p className="text-[10px] text-[#adaaaa] mt-2">75% dos recursos utilizados</p>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity duration-700">
                <span className="material-symbols-outlined text-[120px]">auto_awesome</span>
              </div>
            </div>
            
            <div className="col-span-1 bg-[#1a1919]/70 backdrop-blur-md border border-[#494847]/15 p-8 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#b5ffc2] font-bold">Volume Produzido</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-black">42</span>
                  <span className="text-[#adaaaa] text-sm font-medium">vídeos entregues</span>
                </div>
              </div>
              <div className="mt-8 flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-[#0e0e0e] bg-[#1a1919]"></div>
                <div className="w-8 h-8 rounded-full border-2 border-[#0e0e0e] bg-[#1a1919]"></div>
                <div className="w-8 h-8 rounded-full border-2 border-[#0e0e0e] bg-[#1a1919]"></div>
                <div className="w-8 h-8 rounded-full border-2 border-[#0e0e0e] bg-[#1a1919] flex items-center justify-center text-[10px] font-bold">+39</div>
              </div>
            </div>
          </section>

          {/* 2. Galeria de Projetos */}
          <section>
            <div className="flex justify-between items-end mb-8">
              <div>
                <h3 className="text-3xl font-bold font-headline tracking-tight">Projetos Ativos</h3>
                <p className="text-[#adaaaa] mt-2">Acompanhe suas produções em andamento e finalize downloads.</p>
              </div>
              <button className="text-sm font-bold flex items-center gap-2 text-[#97a9ff] hover:opacity-80 transition-opacity">
                Ver Todos <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Project Card 1 */}
              <div className="group relative bg-[#131313] rounded-xl overflow-hidden border border-[#494847]/10 hover:border-[#97a9ff]/30 transition-all duration-500">
                <div className="aspect-video overflow-hidden relative bg-[#262626]">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e]/90 via-transparent to-transparent z-10"></div>
                  <div className="absolute top-4 right-4 z-20">
                    <span className="bg-[#b5ffc2]/10 text-[#b5ffc2] text-[10px] font-bold px-3 py-1 rounded-full border border-[#b5ffc2]/20 backdrop-blur-md">PRONTO</span>
                  </div>
                </div>
                <div className="p-8 relative">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="text-xl font-bold group-hover:text-[#97a9ff] transition-colors">Campanha Verão 2026</h4>
                      <p className="text-xs text-[#adaaaa] mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">calendar_today</span>
                        Entrega: 14 Out, 2025
                      </p>
                    </div>
                    <span className="text-[#adaaaa] text-xs font-mono">ID: #VX-9021</span>
                  </div>
                  <button className="w-full bg-[#97a9ff] text-[#002283] font-bold py-4 rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-all hover:shadow-[0_0_20px_rgba(151,169,255,0.3)]">
                    <span className="material-symbols-outlined">download</span>
                    Baixar Vídeo Finalizado
                  </button>
                </div>
              </div>

              {/* Project Card 2 */}
              <div className="group relative bg-[#131313] rounded-xl overflow-hidden border border-[#494847]/10 hover:border-[#cb7bff]/30 transition-all duration-500">
                <div className="aspect-video overflow-hidden relative bg-[#262626]">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e]/90 via-transparent to-transparent z-10"></div>
                  <div className="absolute top-4 right-4 z-20">
                    <span className="bg-[#97a9ff]/10 text-[#97a9ff] text-[10px] font-bold px-3 py-1 rounded-full border border-[#97a9ff]/20 backdrop-blur-md">RENDERIZANDO</span>
                  </div>
                </div>
                <div className="p-8 relative">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="text-xl font-bold group-hover:text-[#cb7bff] transition-colors">Manifesto Tech 0.2</h4>
                      <p className="text-xs text-[#adaaaa] mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">history</span>
                        Entrega: Em 4 dias
                      </p>
                    </div>
                    <span className="text-[#adaaaa] text-xs font-mono">ID: #VX-9025</span>
                  </div>
                  <button className="w-full bg-[#262626] text-white/50 font-bold py-4 rounded-xl flex items-center justify-center gap-3 cursor-not-allowed">
                    <span className="material-symbols-outlined animate-pulse">hourglass_empty</span>
                    Processando Arquivos...
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Histórico de Arquivos */}
          <section className="space-y-6">
            <h3 className="text-xl font-bold font-headline tracking-tight">Histórico de Arquivos</h3>
            <div className="w-full overflow-hidden bg-[#1a1919]/70 backdrop-blur-md rounded-xl border border-[#494847]/10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#201f1f]/50 border-b border-[#494847]/10">
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-[#adaaaa]">Nome do Arquivo</th>
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-[#adaaaa]">Projeto Relacionado</th>
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-[#adaaaa]">Tamanho</th>
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-[#adaaaa] text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#494847]/5">
                  <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#97a9ff]">movie</span>
                        <div>
                          <p className="text-sm font-bold">Lumina_Branding_Final_V2.mp4</p>
                          <p className="text-[10px] text-[#adaaaa] mt-0.5">Enviado em 02 Out, 2025</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-[#adaaaa]">Branding Institucional</td>
                    <td className="px-8 py-6 text-sm font-mono text-[#adaaaa]">1.4 GB</td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2 rounded-full hover:bg-[#97a9ff]/20 text-[#97a9ff] transition-all">
                        <span className="material-symbols-outlined">download</span>
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#cb7bff]">description</span>
                        <div>
                          <p className="text-sm font-bold">Roteiro_Campanha_Aprovado.pdf</p>
                          <p className="text-[10px] text-[#adaaaa] mt-0.5">Enviado em 28 Set, 2025</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-[#adaaaa]">Campanha Verão 2026</td>
                    <td className="px-8 py-6 text-sm font-mono text-[#adaaaa]">12.8 MB</td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2 rounded-full hover:bg-[#cb7bff]/20 text-[#cb7bff] transition-all">
                        <span className="material-symbols-outlined">download</span>
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#b5ffc2]">image</span>
                        <div>
                          <p className="text-sm font-bold">Thumbnail_Collection_Pro.zip</p>
                          <p className="text-[10px] text-[#adaaaa] mt-0.5">Enviado em 15 Set, 2025</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-[#adaaaa]">Social Media Pack</td>
                    <td className="px-8 py-6 text-sm font-mono text-[#adaaaa]">450 MB</td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2 rounded-full hover:bg-[#b5ffc2]/20 text-[#b5ffc2] transition-all">
                        <span className="material-symbols-outlined">download</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="bg-[#1a1919]/30 px-8 py-4 flex justify-center border-t border-[#494847]/10">
                <button className="text-[10px] font-bold uppercase tracking-widest text-[#adaaaa] hover:text-white transition-colors">Carregar mais arquivos</button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

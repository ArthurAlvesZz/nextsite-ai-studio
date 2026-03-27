import React from 'react';
import { Link } from 'react-router-dom';

interface ClientSidebarProps {
  activePage: 'dashboard' | 'projects' | 'purchases' | 'settings';
}

export default function ClientSidebar({ activePage }: ClientSidebarProps) {
  return (
    <aside className="h-screen w-64 fixed left-0 top-0 overflow-y-auto bg-[#050505] border-r border-white/5 flex flex-col py-10 px-8 gap-12 z-50">
      <div className="flex flex-col gap-1 px-2">
        <div className="flex items-center gap-3 mb-4">
          <img 
            alt="Next Creatives Logo" 
            className="h-8 object-contain logo-transparent" 
            src="/logo.png" 
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex items-center gap-2 ml-1">
          <div className="h-px w-4 bg-secondary/30"></div>
          <span className="text-[13px] font-serif italic text-secondary/70 tracking-wide">Portal do Cliente</span>
        </div>
      </div>
      
      <nav className="flex flex-col gap-3 flex-grow">
        <Link 
          to="/client/dashboard" 
          className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
            activePage === 'dashboard' 
              ? 'text-white bg-white/5 border border-white/10 shadow-2xl shadow-white/5' 
              : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <span className={`material-symbols-outlined text-xl transition-colors ${activePage === 'dashboard' ? 'text-secondary' : 'group-hover:text-secondary/60'}`} style={activePage === 'dashboard' ? { fontVariationSettings: "'FILL' 1" } : {}}>grid_view</span>
          <span className="font-headline font-bold text-[11px] uppercase tracking-widest">Dashboard</span>
        </Link>
        
        <Link 
          to="/client/projects" 
          className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
            activePage === 'projects' 
              ? 'text-white bg-white/5 border border-white/10 shadow-2xl shadow-white/5' 
              : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <span className={`material-symbols-outlined text-xl transition-colors ${activePage === 'projects' ? 'text-secondary' : 'group-hover:text-secondary/60'}`} style={activePage === 'projects' ? { fontVariationSettings: "'FILL' 1" } : {}}>video_library</span>
          <span className="font-headline font-bold text-[11px] uppercase tracking-widest">Projetos</span>
        </Link>
        
        <Link 
          to="/client/purchases" 
          className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
            activePage === 'purchases' 
              ? 'text-white bg-white/5 border border-white/10 shadow-2xl shadow-white/5' 
              : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <span className={`material-symbols-outlined text-xl transition-colors ${activePage === 'purchases' ? 'text-secondary' : 'group-hover:text-secondary/60'}`} style={activePage === 'purchases' ? { fontVariationSettings: "'FILL' 1" } : {}}>receipt_long</span>
          <span className="font-headline font-bold text-[11px] uppercase tracking-widest">Histórico</span>
        </Link>
        
        <Link 
          to="/client/settings" 
          className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
            activePage === 'settings' 
              ? 'text-white bg-white/5 border border-white/10 shadow-2xl shadow-white/5' 
              : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <span className={`material-symbols-outlined text-xl transition-colors ${activePage === 'settings' ? 'text-secondary' : 'group-hover:text-secondary/60'}`} style={activePage === 'settings' ? { fontVariationSettings: "'FILL' 1" } : {}}>settings</span>
          <span className="font-headline font-bold text-[11px] uppercase tracking-widest">Configurações</span>
        </Link>
      </nav>

      <div className="mt-auto pt-8 border-t border-white/5">
        <div className="bg-gradient-to-br from-secondary/10 to-primary/10 p-5 rounded-[1.5rem] border border-white/5 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <span className="material-symbols-outlined text-5xl text-secondary">auto_awesome</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">Novo Projeto?</p>
          <p className="text-[11px] text-white/60 leading-relaxed font-light mb-4">Inicie uma nova produção agora mesmo.</p>
          <button 
            onClick={() => window.open('https://wa.me/5511999999999?text=Olá! Gostaria de iniciar um novo projeto.', '_blank')}
            className="w-full py-2.5 bg-white text-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-secondary hover:text-white transition-all"
          >
            Começar
          </button>
        </div>
      </div>
    </aside>
  );
}

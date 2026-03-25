import React from 'react';
import { Link } from 'react-router-dom';

interface ClientSidebarProps {
  activePage: 'dashboard' | 'projects' | 'files' | 'purchases' | 'support';
}

export default function ClientSidebar({ activePage }: ClientSidebarProps) {
  return (
    <aside className="h-screen w-64 fixed left-0 top-0 overflow-y-auto bg-white/[0.02] backdrop-blur-2xl border-r border-white/10 flex flex-col py-8 px-6 gap-8 z-50">
      <div className="flex flex-col gap-1 px-2">
        <img src="/logo.png" alt="Logo" className="h-8 object-contain logo-transparent w-fit mb-2" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-secondary/90 font-serif italic">Portal do Cliente</span>
      </div>
      <nav className="flex flex-col gap-2 flex-grow mt-4">
        <Link 
          to="/client/dashboard" 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 ${
            activePage === 'dashboard' 
              ? 'text-on-secondary bg-gradient-to-r from-secondary to-primary shadow-[0_0_20px_rgba(233,179,255,0.2)] font-bold' 
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined" style={activePage === 'dashboard' ? { fontVariationSettings: "'FILL' 1" } : {}}>grid_view</span>
          <span className="font-headline font-bold text-xs uppercase tracking-widest">Dashboard</span>
        </Link>
        
        <Link 
          to="/client/projects" 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 ${
            activePage === 'projects' 
              ? 'text-on-secondary bg-gradient-to-r from-secondary to-primary shadow-[0_0_20px_rgba(233,179,255,0.2)] font-bold' 
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined" style={activePage === 'projects' ? { fontVariationSettings: "'FILL' 1" } : {}}>video_library</span>
          <span className="font-headline font-bold text-xs uppercase tracking-widest">Projetos</span>
        </Link>
        
        <Link 
          to="/client/files" 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 ${
            activePage === 'files' 
              ? 'text-on-secondary bg-gradient-to-r from-secondary to-primary shadow-[0_0_20px_rgba(233,179,255,0.2)] font-bold' 
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined" style={activePage === 'files' ? { fontVariationSettings: "'FILL' 1" } : {}}>folder_open</span>
          <span className="font-headline font-bold text-xs uppercase tracking-widest">Arquivos</span>
        </Link>
        
        <Link 
          to="/client/purchases" 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 ${
            activePage === 'purchases' 
              ? 'text-on-secondary bg-gradient-to-r from-secondary to-primary shadow-[0_0_20px_rgba(233,179,255,0.2)] font-bold' 
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined" style={activePage === 'purchases' ? { fontVariationSettings: "'FILL' 1" } : {}}>receipt_long</span>
          <span className="font-headline font-bold text-xs uppercase tracking-widest">Histórico de Compras</span>
        </Link>
        
        <Link 
          to="/client/support" 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 ${
            activePage === 'support' 
              ? 'text-on-secondary bg-gradient-to-r from-secondary to-primary shadow-[0_0_20px_rgba(233,179,255,0.2)] font-bold' 
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined" style={activePage === 'support' ? { fontVariationSettings: "'FILL' 1" } : {}}>contact_support</span>
          <span className="font-headline font-bold text-xs uppercase tracking-widest">Suporte</span>
        </Link>
      </nav>
    </aside>
  );
}

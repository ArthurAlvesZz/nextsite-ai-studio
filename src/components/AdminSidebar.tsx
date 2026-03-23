import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

import { useAuth } from '../hooks/useAuth';

interface AdminSidebarProps {
  activePage: 'dashboard' | 'vendas' | 'clientes' | 'videos' | 'tools' | 'settings' | 'team' | 'leads';
}

export default function AdminSidebar({ activePage }: AdminSidebarProps) {
  const [showLogout, setShowLogout] = useState(false);
  const navigate = useNavigate();
  const { adminProfile } = useAuth();

  const handleLogout = () => {
    navigate('/admin');
  };

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 border-r border-white/10 bg-white/[0.02] backdrop-blur-2xl flex flex-col py-8 z-50">
      <div className="px-8 mb-12 flex flex-col items-start gap-4">
        <img 
          className="h-8 object-contain logo-transparent" 
          alt="Next Creatives Logo" 
          src="/logo.png"
          referrerPolicy="no-referrer"
        />
        <div>
          <p className="font-serif italic text-sm tracking-[0.15em] text-secondary/90 mt-1">Admin Terminal</p>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <Link 
          to="/admin/dashboard" 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl mx-2 transition-all ${
            activePage === 'dashboard' 
              ? 'text-on-secondary bg-gradient-to-r from-secondary to-primary shadow-[0_0_20px_rgba(233,179,255,0.2)]' 
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-lg">dashboard</span>
          <span className="font-headline font-bold text-xs uppercase tracking-widest">Dashboard</span>
        </Link>
        <Link 
          to="/admin/sales" 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl mx-2 transition-all ${
            activePage === 'vendas' 
              ? 'text-on-secondary bg-gradient-to-r from-secondary to-primary shadow-[0_0_20px_rgba(233,179,255,0.2)]' 
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-lg">payments</span>
          <span className="font-headline font-bold text-xs uppercase tracking-widest">Vendas</span>
        </Link>
        <Link 
          to="/admin/clients" 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl mx-2 transition-all ${
            activePage === 'clientes' 
              ? 'text-on-secondary bg-gradient-to-r from-secondary to-primary shadow-[0_0_20px_rgba(233,179,255,0.2)]' 
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-lg">group</span>
          <span className="font-headline font-bold text-xs uppercase tracking-widest">Clientes</span>
        </Link>
        <Link 
          to="/admin/videos" 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl mx-2 transition-all ${
            activePage === 'videos' 
              ? 'text-on-secondary bg-gradient-to-r from-secondary to-primary shadow-[0_0_20px_rgba(233,179,255,0.2)]' 
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-lg">movie_filter</span>
          <span className="font-headline font-bold text-xs uppercase tracking-widest">Vídeos</span>
        </Link>
        <Link 
          to="/admin/tools" 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl mx-2 transition-all ${
            activePage === 'tools' || activePage === 'leads'
              ? 'text-on-secondary bg-gradient-to-r from-secondary to-primary shadow-[0_0_20px_rgba(233,179,255,0.2)]' 
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-lg">construction</span>
          <span className="font-headline font-bold text-xs uppercase tracking-widest">Ferramentas</span>
        </Link>
        <Link 
          to="/admin/settings" 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl mx-2 transition-all ${
            activePage === 'settings' 
              ? 'text-on-secondary bg-gradient-to-r from-secondary to-primary shadow-[0_0_20px_rgba(233,179,255,0.2)]' 
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-lg">settings</span>
          <span className="font-headline font-bold text-xs uppercase tracking-widest">Ajustes</span>
        </Link>
      </nav>
      <div className="px-6 mt-auto relative">
        <AnimatePresence>
          {showLogout && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-6 right-6 mb-2 bg-[#0e0e0e] border border-white/10 rounded-xl p-2 shadow-2xl z-50 backdrop-blur-xl"
            >
              <div className="flex flex-col gap-1">
                <Link
                  to="/admin/team/1"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-all group"
                >
                  <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">person</span>
                  <span className="font-headline font-bold text-[10px] uppercase tracking-widest">Meu Perfil</span>
                </Link>
                <div className="h-px w-full bg-white/10 my-1"></div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all group"
                >
                  <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">logout</span>
                  <span className="font-headline font-bold text-[10px] uppercase tracking-widest">Sair da Conta</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div 
          onClick={() => setShowLogout(!showLogout)}
          className={`bg-white/[0.02] border border-white/10 p-4 rounded-xl flex items-center gap-3 cursor-pointer transition-all hover:bg-white/[0.05] ${showLogout ? 'border-secondary/50 ring-1 ring-secondary/20' : ''}`}
        >
          {adminProfile.avatarUrl ? (
            <img src={adminProfile.avatarUrl} alt="Profile" className="h-10 w-10 rounded-full object-cover border border-white/10 shadow-lg" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center font-headline font-bold text-on-secondary text-sm shadow-lg">
              {adminProfile.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-headline font-bold text-white truncate">{adminProfile.name}</p>
            <p className="text-[10px] uppercase tracking-widest text-secondary/70 truncate mt-0.5">{adminProfile.phone}</p>
          </div>
          <span className={`material-symbols-outlined text-white/20 transition-transform duration-300 ${showLogout ? 'rotate-180' : ''}`}>expand_less</span>
        </div>
      </div>
    </aside>
  );
}

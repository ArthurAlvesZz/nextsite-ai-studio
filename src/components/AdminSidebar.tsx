import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';

interface AdminSidebarProps {
  activePage: 'dashboard' | 'vendas' | 'clientes' | 'videos' | 'leads' | 'tools' | 'settings' | 'team' | 'profile';
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ activePage, isOpen = false, onClose }: AdminSidebarProps) {
  const navigate = useNavigate();
  const { adminProfile, loading } = useAuth();
  const [showLogout, setShowLogout] = useState(false);

  console.log('[AdminSidebar] Role atual:', adminProfile?.role);

  const handleLogout = () => {
    navigate('/admin');
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`h-[100dvh] w-64 fixed left-0 top-0 border-r border-white/10 bg-[#050505] lg:bg-white/[0.02] backdrop-blur-2xl flex flex-col py-8 z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {isOpen && (
          <button 
            onClick={onClose}
            className="lg:hidden absolute top-6 right-6 text-white/50 hover:text-white"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
        <div className="px-8 mb-12 flex flex-col items-start gap-4">
        <div className="flex items-center gap-4">
          <img 
            className="h-8 object-contain" 
            alt="Next Creatives Logo" 
            src={logo}
          />
        </div>
        <div className="flex flex-col gap-1 ml-1">
          <span className="text-[16px] font-serif italic text-secondary tracking-[0.15em] leading-none">Painel Admin</span>
          <div className="h-[1px] w-12 bg-gradient-to-r from-secondary/50 to-transparent"></div>
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
            activePage === 'tools'
              ? 'text-on-secondary bg-gradient-to-r from-secondary to-primary shadow-[0_0_20px_rgba(233,179,255,0.2)]' 
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-lg">construction</span>
          <span className="font-headline font-bold text-xs uppercase tracking-widest">Ferramentas</span>
        </Link>

        {adminProfile?.isOwner === true && (
          <>
            <div className="px-6 py-4 text-[9px] text-white/40 font-medium uppercase tracking-widest">Administração</div>
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
          </>
        )}

        <div className="h-px bg-white/5 my-4 mx-6"></div>

        <div className="relative mt-auto pt-4">
          <AnimatePresence>
            {showLogout && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-0 w-full mb-2 p-2 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl z-[60]"
              >
                <Link 
                  to="/admin/profile"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  onClick={() => setShowLogout(false)}
                >
                  <span className="material-symbols-outlined text-lg">person</span>
                  <span className="font-headline font-bold text-[10px] uppercase tracking-widest">Meu Perfil</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  <span className="font-headline font-bold text-[10px] uppercase tracking-widest">Sair da Conta</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={() => setShowLogout(!showLogout)}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 border ${
              showLogout ? 'bg-white/10 border-white/20' : 'bg-white/[0.03] border-white/5 hover:bg-white/5 hover:border-white/10'
            }`}
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-secondary/20 to-primary/20 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {adminProfile?.avatarUrl ? (
                <img src={adminProfile.avatarUrl} alt={adminProfile.name} className="h-full w-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-secondary/60">person</span>
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-[11px] font-headline font-bold text-white truncate uppercase tracking-tight">
                {adminProfile?.name || 'Carregando...'}
              </div>
              <div className="text-[9px] text-white/40 font-medium uppercase tracking-widest">
                {adminProfile?.role?.toUpperCase() || (adminProfile?.isOwner ? 'OWNER' : 'EQUIPE')}
              </div>
            </div>
            <span className={`material-symbols-outlined text-white/20 transition-transform duration-300 ${showLogout ? 'rotate-180' : ''}`}>
              expand_less
            </span>
          </button>
        </div>
      </nav>
      </aside>
    </>
  );
}

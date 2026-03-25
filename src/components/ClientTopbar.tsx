import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface ClientTopbarProps {
  title?: string;
  subtitle?: string;
}

export default function ClientTopbar({ title = "Área do Cliente", subtitle = "Bem-vindo de volta, Lumina Tech 👋" }: ClientTopbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    // Implement logout logic here
    navigate('/client/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#020202]/80 backdrop-blur-xl border-b border-white/5 flex justify-between items-center px-10 py-6">
      <div className="flex flex-col">
        <h1 className="text-xl font-extrabold tracking-tighter text-white font-headline uppercase">{title}</h1>
        <p className="text-xs text-white/40 font-light mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center gap-8 mr-4">
          <a className="text-secondary border-b-2 border-secondary pb-1 text-xs font-headline font-bold uppercase tracking-widest" href="#">Visão Geral</a>
          <a className="text-white/40 hover:text-white pb-1 text-xs font-headline font-bold uppercase tracking-widest transition-opacity" href="#">Recentes</a>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-white/40 hover:text-white transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-secondary rounded-full border-2 border-[#020202]"></span>
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-white/10 relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-on-secondary font-headline font-bold shadow-lg hover:scale-105 transition-transform"
            >
              LT
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-4 w-48 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-white/5">
                    <p className="text-sm font-bold text-white font-headline">Lumina Tech</p>
                    <p className="text-[10px] text-white/40 mt-1">contato@lumina.tech</p>
                  </div>
                  <div className="p-2">
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                      <span className="material-symbols-outlined text-[18px]">settings</span>
                      Ajustes
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-error/70 hover:text-error hover:bg-error/10 rounded-xl transition-colors mt-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      Sair
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

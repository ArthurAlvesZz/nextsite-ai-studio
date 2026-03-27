import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface ClientTopbarProps {
  title?: string;
  subtitle?: string;
}

export default function ClientTopbar({ title = "Área do Cliente", subtitle = "Bem-vindo de volta 👋" }: ClientTopbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [clientData, setClientData] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const email = user.email || '';
        const accessId = email.split('@')[0];
        
        const q = query(collection(db, 'clients'), where('accessId', '==', accessId));
        const unsubscribeClient = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            setClientData({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
          }
        });
        return () => unsubscribeClient();
      }
    });

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      unsubscribeAuth();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/client/login');
  };

  const userInitials = clientData?.name 
    ? clientData.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'NC';

  return (
    <header className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 flex justify-between items-center px-12 py-8">
      <div className="flex flex-col">
        <h1 className="text-2xl font-black tracking-tighter text-white font-headline uppercase">{title}</h1>
        <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em] mt-1">{subtitle}</p>
      </div>
      <div className="flex items-center gap-8">
        <div className="hidden lg:flex items-center gap-10">
          <Link to="/client/dashboard" className="text-secondary text-[10px] font-bold uppercase tracking-[0.2em] relative after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-[2px] after:bg-secondary">Visão Geral</Link>
          <button onClick={() => navigate('/client/settings')} className="text-white/30 hover:text-white text-[10px] font-bold uppercase tracking-[0.2em] transition-colors">Notificações</button>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/client/settings')}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all relative"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-secondary rounded-full border-2 border-[#050505]"></span>
          </button>
          <div className="flex items-center gap-4 pl-8 border-l border-white/5 relative" ref={dropdownRef}>
            <div className="text-right hidden sm:block">
              <p className="text-[11px] font-bold text-white uppercase tracking-widest">{clientData?.company || 'Next Client'}</p>
              <p className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">{clientData?.plan || 'Premium Client'}</p>
            </div>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-secondary to-primary p-[1px] hover:scale-105 transition-transform shadow-xl shadow-secondary/10"
            >
              <div className="w-full h-full bg-[#050505] rounded-[15px] flex items-center justify-center text-white font-headline font-black text-sm">
                {clientData?.avatarUrl ? (
                  <img src={clientData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : userInitials}
              </div>
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-4 w-56 bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                    <p className="text-xs font-bold text-white uppercase tracking-widest">{clientData?.name || 'Usuário'}</p>
                    <p className="text-[10px] text-white/30 mt-1 font-light">{auth.currentUser?.email}</p>
                  </div>
                  <div className="p-3">
                    <button 
                      onClick={() => {
                        setIsDropdownOpen(false);
                        navigate('/client/settings');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/5 rounded-2xl transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">settings</span>
                      Configurações
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-error/60 hover:text-error hover:bg-error/5 rounded-2xl transition-colors mt-1"
                    >
                      <span className="material-symbols-outlined text-lg">logout</span>
                      Encerrar Sessão
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

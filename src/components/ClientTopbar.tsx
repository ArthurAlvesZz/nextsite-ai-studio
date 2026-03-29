import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, updateDoc, doc } from 'firebase/firestore';

interface ClientTopbarProps {
  title?: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export default function ClientTopbar({ title = "Área do Cliente", subtitle = "Bem-vindo de volta 👋", onMenuClick }: ClientTopbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [clientData, setClientData] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
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
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      unsubscribeAuth();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (clientData?.id) {
      const q = query(
        collection(db, 'notifications'),
        where('clientId', '==', clientData.id),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNotifications(notifs);
      });

      return () => unsubscribe();
    }
  }, [clientData?.id]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/client/login');
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const userInitials = clientData?.name 
    ? clientData.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'NC';

  return (
    <header className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 flex justify-between items-center px-6 md:px-12 py-6 md:py-8 gap-4">
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="md:hidden text-white/70 hover:text-white shrink-0"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
        )}
        <div className="flex flex-col">
          <h1 className="text-xl md:text-2xl font-black tracking-tighter text-white font-headline uppercase truncate max-w-[150px] md:max-w-none">{title}</h1>
          <p className="text-[9px] md:text-[10px] text-white/30 font-bold uppercase tracking-[0.2em] mt-1 truncate">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 md:gap-8">
        <div className="flex items-center gap-6">
          <div className="relative" ref={notificationsRef}>
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all relative ${
                isNotificationsOpen ? 'bg-secondary text-white border-secondary' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-xl">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-secondary rounded-full border-2 border-[#050505]"></span>
              )}
            </button>

            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-4 w-80 bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                    <p className="text-xs font-bold text-white uppercase tracking-widest">Notificações</p>
                    {unreadCount > 0 && (
                      <span className="text-[9px] bg-secondary/20 text-secondary px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                        {unreadCount} Novas
                      </span>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id}
                          onClick={() => handleMarkAsRead(notif.id)}
                          className={`p-5 border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer relative ${!notif.read ? 'bg-secondary/[0.02]' : ''}`}
                        >
                          {!notif.read && (
                            <div className="absolute top-6 left-2 w-1 h-1 bg-secondary rounded-full"></div>
                          )}
                          <div className="flex gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              notif.type === 'video_ready' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-primary/10 text-primary'
                            }`}>
                              <span className="material-symbols-outlined text-sm">
                                {notif.type === 'video_ready' ? 'movie' : 'info'}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <p className={`text-[11px] font-bold uppercase tracking-widest ${!notif.read ? 'text-white' : 'text-white/60'}`}>
                                {notif.title}
                              </p>
                              <p className="text-[10px] text-white/30 leading-relaxed">
                                {notif.message}
                              </p>
                              <p className="text-[8px] text-white/10 font-bold uppercase tracking-widest pt-1">
                                {new Date(notif.createdAt).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-10 text-center">
                        <span className="material-symbols-outlined text-white/5 text-4xl mb-2">notifications_off</span>
                        <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Nenhuma notificação</p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => navigate('/client/settings')}
                    className="w-full p-4 text-[9px] font-bold text-white/20 hover:text-white uppercase tracking-widest transition-colors bg-white/[0.01]"
                  >
                    Ver todas as configurações
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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

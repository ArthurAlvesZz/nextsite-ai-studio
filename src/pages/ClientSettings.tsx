import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ClientSidebar from '../components/ClientSidebar';
import ClientTopbar from '../components/ClientTopbar';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, onSnapshot, query, collection, where } from 'firebase/firestore';
import { updatePassword, updateEmail, sendPasswordResetEmail } from 'firebase/auth';

export default function ClientSettings() {
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [notifications, setNotifications] = useState({
    videosReady: true,
    projectUpdates: true
  });

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const userEmail = user.email || '';
        const accessId = userEmail.split('@')[0];

        const clientsQuery = query(
          collection(db, 'clients'),
          where('accessId', '==', accessId)
        );

        const unsubscribeClient = onSnapshot(clientsQuery, (snapshot) => {
          if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            setClientData({ id: snapshot.docs[0].id, ...data });
            setName(data.name || '');
            setCompany(data.company || '');
            setEmail(data.email || userEmail);
            setAvatarUrl(data.avatarUrl || '');
            setNotifications(data.preferences?.notifications || { videosReady: true, projectUpdates: true });
          }
          setLoading(false);
        });

        return () => unsubscribeClient();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleSave = async () => {
    if (!clientData) return;
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const user = auth.currentUser;
      
      // Update Auth Email if changed
      if (user && email !== user.email) {
        try {
          await updateEmail(user, email);
        } catch (authError: any) {
          if (authError.code === 'auth/requires-recent-login') {
            setMessage({ type: 'error', text: 'Para alterar o e-mail, você precisa ter feito login recentemente. Por favor, saia e entre novamente.' });
            setSaving(false);
            return;
          }
          throw authError;
        }
      }

      const clientRef = doc(db, 'clients', clientData.id);
      await updateDoc(clientRef, {
        name,
        company,
        email,
        avatarUrl,
        preferences: {
          notifications
        }
      });
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
    } catch (error) {
      console.error("Error updating settings:", error);
      setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await updatePassword(user, newPassword);
        setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
        setShowPasswordModal(false);
        setNewPassword('');
      }
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        setMessage({ type: 'error', text: 'Para alterar a senha, você precisa ter feito login recentemente.' });
      } else {
        setMessage({ type: 'error', text: 'Erro ao atualizar senha.' });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAvatarChange = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (readerEvent: any) => {
          setAvatarUrl(readerEvent.target.result);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handlePasskeyToggle = () => {
    setMessage({ type: 'success', text: 'Simulando ativação de Chave de Acesso (Passkey)...' });
    setTimeout(() => {
      setMessage({ type: 'success', text: 'Chave de Acesso configurada com sucesso neste dispositivo!' });
    }, 2000);
  };

  const handleSendResetEmail = async () => {
    const user = auth.currentUser;
    if (user && user.email) {
      try {
        await sendPasswordResetEmail(auth, user.email);
        setMessage({ type: 'success', text: 'E-mail de redefinição de senha enviado!' });
      } catch (error) {
        setMessage({ type: 'error', text: 'Erro ao enviar e-mail de redefinição.' });
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-[#050505] min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#050505] text-white font-body antialiased min-h-screen flex selection:bg-secondary selection:text-on-secondary">
      <ClientSidebar activePage="settings" isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col md:ml-64 relative w-full overflow-hidden">
        <div className="fixed bottom-0 right-0 w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-secondary/5 blur-[100px] md:blur-[150px] rounded-full -z-10 pointer-events-none"></div>
        <div className="fixed top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-primary/5 blur-[80px] md:blur-[120px] rounded-full -z-10 pointer-events-none"></div>

        <ClientTopbar 
          title="Configurações" 
          subtitle="Gerencie seu perfil e preferências." 
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <main className="p-6 md:p-12 space-y-10 md:space-y-16 max-w-5xl mx-auto w-full">
          <header className="mb-12">
            <h2 className="text-5xl font-black tracking-tighter text-white mb-4 font-headline uppercase">Configurações da Conta</h2>
            <p className="text-white/30 text-sm font-medium uppercase tracking-widest">Gerencie suas preferências de produção e segurança da Next Creatives.</p>
          </header>

          {message.text && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl border ${message.type === 'success' ? 'bg-tertiary/10 border-tertiary/20 text-tertiary' : 'bg-error/10 border-error/20 text-error'}`}
            >
              <p className="text-xs font-black uppercase tracking-widest text-center">{message.text}</p>
            </motion.div>
          )}

          <div className="space-y-10">
            {/* Section 1: Perfil do Cliente */}
            <section className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                  <div className="relative group mx-auto md:mx-0">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/5 bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center text-white font-headline font-black text-3xl">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'NC'
                      )}
                    </div>
                    <button 
                      onClick={handleAvatarChange}
                      className="absolute bottom-0 right-0 p-2.5 bg-secondary rounded-full text-on-secondary shadow-xl hover:scale-110 transition-transform"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-2xl font-black text-white font-headline tracking-tighter">Perfil do Cliente</h3>
                    <p className="text-sm text-white/30 font-medium">Atualize suas informações corporativas.</p>
                  </div>
                </div>
                <button 
                  onClick={handleAvatarChange}
                  className="w-full md:w-auto px-8 py-3 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                >
                  Alterar Foto
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-1 font-headline">Nome Completo</label>
                  <input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-sm text-white focus:ring-1 focus:ring-secondary transition-all outline-none" 
                    type="text" 
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-1 font-headline">Empresa</label>
                  <input 
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-sm text-white focus:ring-1 focus:ring-secondary transition-all outline-none" 
                    type="text" 
                    placeholder="Nome da empresa"
                  />
                </div>
                <div className="space-y-3 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-1 font-headline">E-mail</label>
                  <input 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-sm text-white focus:ring-1 focus:ring-secondary transition-all outline-none" 
                    type="email" 
                    placeholder="seu@email.com"
                  />
                </div>
              </div>
            </section>

            {/* Section 3: Segurança */}
            <section className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 flex flex-col">
                <div className="flex items-center gap-4 mb-8">
                  <span className="material-symbols-outlined text-secondary">shield</span>
                  <h3 className="text-xl font-black text-white font-headline tracking-tighter">Segurança</h3>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-secondary">lock</span>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-white uppercase tracking-widest">Trocar Senha</p>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">Atualize sua credencial de acesso.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowPasswordModal(true)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white uppercase tracking-widest rounded-xl transition-all"
                    >
                      Alterar
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-secondary">fingerprint</span>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-white uppercase tracking-widest">Chave de Acesso</p>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">Habilite autenticação sem senha.</p>
                      </div>
                    </div>
                    <button 
                      onClick={handlePasskeyToggle}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white uppercase tracking-widest rounded-xl transition-all"
                    >
                      Configurar
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-error">lock_reset</span>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-white uppercase tracking-widest">Recuperar Acesso</p>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">Esqueceu sua senha atual?</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleSendResetEmail}
                      className="px-4 py-2 bg-error/10 hover:bg-error/20 text-[10px] font-bold text-error uppercase tracking-widest rounded-xl transition-all"
                    >
                      Enviar E-mail
                    </button>
                  </div>
                </div>
              </section>

            {/* Section 4: Notificações */}
            <section className="bg-white/[0.01] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10">
              <div className="flex items-center gap-4 mb-10">
                <span className="material-symbols-outlined text-secondary">notifications_active</span>
                <h3 className="text-xl font-black text-white font-headline tracking-tighter">Notificações</h3>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div>
                    <p className="text-sm font-black text-white uppercase tracking-widest">Vídeos Prontos</p>
                    <p className="text-[10px] text-white/30 mt-1 font-medium">Receber alertas instantâneos quando um render for concluído.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={notifications.videosReady}
                      onChange={(e) => setNotifications({ ...notifications, videosReady: e.target.checked })}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/40 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div>
                    <p className="text-sm font-black text-white uppercase tracking-widest">Atualizações de Projetos</p>
                    <p className="text-[10px] text-white/30 mt-1 font-medium">Notificar sobre novos comentários e mudanças de status.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={notifications.projectUpdates}
                      onChange={(e) => setNotifications({ ...notifications, projectUpdates: e.target.checked })}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/40 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                  </label>
                </div>
              </div>
            </section>

            {/* Actions Footer */}
            <div className="flex justify-end gap-6 pt-10 border-t border-white/5">
              <button 
                onClick={() => {
                  if (clientData) {
                    setName(clientData.name);
                    setCompany(clientData.company);
                    setEmail(clientData.email);
                    setNotifications(clientData.preferences?.notifications || { readyVideos: true, projectUpdates: true });
                  }
                }}
                className="px-10 py-4 rounded-xl text-[10px] font-black text-white/30 hover:text-white transition-all uppercase tracking-[0.3em]"
              >
                Descartar Alterações
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-white text-black px-12 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-secondary hover:text-white transition-all duration-500 disabled:opacity-50 shadow-2xl shadow-black"
              >
                {saving ? 'Salvando...' : 'SALVAR CONFIGURAÇÕES'}
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasswordModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-white font-headline tracking-tighter mb-2">Trocar Senha</h3>
              <p className="text-sm text-white/30 font-medium mb-8">Digite sua nova senha abaixo.</p>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-1 font-headline">Nova Senha</label>
                  <input 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-sm text-white focus:ring-1 focus:ring-secondary transition-all outline-none" 
                    type="password" 
                    placeholder="••••••••"
                  />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 px-6 py-4 rounded-xl text-[10px] font-black text-white/30 hover:text-white transition-all uppercase tracking-[0.3em]"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handlePasswordChange}
                    disabled={isChangingPassword}
                    className="flex-1 bg-white text-black px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-secondary hover:text-white transition-all duration-500 disabled:opacity-50"
                  >
                    {isChangingPassword ? 'Alterando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

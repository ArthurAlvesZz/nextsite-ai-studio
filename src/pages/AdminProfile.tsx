import React, { useState, useEffect } from 'react';
import SEO from '../components/SEO';
import AdminSidebar from '../components/AdminSidebar';
import GlobalSearch from '../components/GlobalSearch';
import { useAuth } from '../hooks/useAuth';
import { useGoalSettings } from '../hooks/useGoalSettings';
import { useEmployees } from '../hooks/useEmployees';
import { motion } from 'motion/react';
import { auth, db, storage } from '../firebase';
import { GoogleAuthProvider, linkWithPopup, unlink, EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useWhatsapp } from '../contexts/WhatsappContext';

export default function AdminProfile() {
  const { user, adminProfile, updateAdminProfile } = useAuth();
  const { goalSettings } = useGoalSettings();
  const { teamMembers } = useEmployees();
  const [isLinking, setIsLinking] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    whatsappStatus,
    whatsappUser,
    handleConnectWhatsApp,
    handleLogoutWhatsApp,
    setShowQRModal
  } = useWhatsapp();

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Senha States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUpdatePassword = async () => {
    if (!user || !user.email) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Preencha todos os campos de senha.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("A nova senha e a confirmação não coincidem.");
      return;
    }
    if (newPassword.length < 6) {
      alert("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      alert("Senha atualizada com sucesso!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error("Erro ao atualizar senha:", error);
      if (error.code === 'auth/invalid-credential') {
         alert("A senha atual informada está incorreta.");
      } else {
         alert("Erro ao atualizar a senha: " + error.message);
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const file = e.target.files[0];

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Formato inválido. Use JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo: 5 MB.');
      return;
    }

    setIsUploadingAvatar(true);
    setUploadProgress(0);

    try {
      const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type });

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
          },
          reject,
          resolve
        );
      });

      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

      // 1. Update Firebase Auth profile
      await updateProfile(user, { photoURL: downloadURL });

      // 2. Update Firestore users document
      await updateDoc(doc(db, 'users', user.uid), { avatarUrl: downloadURL });

      // 3. Update local state via hook
      await updateAdminProfile({ avatarUrl: downloadURL });
    } catch (error: any) {
      console.error('[Avatar Upload] Error:', error);
      alert('Erro ao enviar a foto: ' + (error.message || 'Tente novamente.'));
    } finally {
      setIsUploadingAvatar(false);
      setUploadProgress(0);
    }
  };

  const isGoogleLinked = user?.providerData.some(provider => provider.providerId === 'google.com');

  const handleLinkGoogle = async () => {
    if (!user) return;
    setIsLinking(true);
    const provider = new GoogleAuthProvider();

    try {
      if (isGoogleLinked) {
        // Unlink
        await unlink(user, 'google.com');
        await updateDoc(doc(db, 'users', user.uid), {
          googleLinked: false,
          googleEmail: null
        });
        alert('Conta Google desconectada com sucesso.');
      } else {
        // Link
        const result = await linkWithPopup(user, provider);
        const googleUser = result.user;
        const googleEmail = result.user.providerData.find(p => p.providerId === 'google.com')?.email;

        await updateDoc(doc(db, 'users', user.uid), {
          googleLinked: true,
          googleEmail: googleEmail || googleUser.email,
          googleUid: googleUser.uid
        });
        alert('Conta Google conectada com sucesso!');
      }
    } catch (error: any) {
      console.error('Erro ao gerenciar conta Google:', error);
      if (error.code === 'auth/credential-already-in-use') {
        alert('Esta conta Google já está vinculada a outro usuário.');
      } else {
        alert('Erro ao processar solicitação: ' + error.message);
      }
    } finally {
      setIsLinking(false);
    }
  };
  
  const [formData, setFormData] = useState({
    name: adminProfile.name || '',
    email: adminProfile.email || '',
    role: adminProfile.role || '',
    phone: adminProfile.phone || ''
  });

  useEffect(() => {
    setFormData({
      name: adminProfile.name || '',
      email: adminProfile.email || '',
      role: adminProfile.role || '',
      phone: adminProfile.phone || ''
    });
  }, [adminProfile]);

  const handleSave = async () => {
    try {
      await updateAdminProfile(formData);
      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      alert('Erro ao atualizar perfil.');
    }
  };

  // Calculate metrics
  const currentMonth = new Date().toISOString().substring(0, 7);
  const monthGoal = goalSettings.months[currentMonth] || { totalMonthlySalesGoal: 0, totalMonthlyVideoGoal: 0 };
  
  // Find current member in team list to get more stats if needed
  const currentMember = teamMembers.find(m => m.userId === adminProfile.userId);

  return (
    <div className="font-body text-on-background min-h-screen flex bg-[#050505] overflow-hidden selection:bg-primary/30">
      {/* Background from Home */}
      <div className="fixed inset-0 w-full h-full -z-10 bg-[#050505] overflow-hidden">
        <div className="absolute inset-0 w-full h-full opacity-1 bg-gradient-to-b from-[#020202] to-transparent">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.05),transparent_60%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(153,0,255,0.05),transparent_40%)]"></div>
        </div>
      </div>

      <SEO title="Meu Perfil" />
      <AdminSidebar activePage="profile" isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="md:ml-64 w-full flex-1 min-h-screen relative">
        {/* Top Bar */}
        <header className="fixed top-0 right-0 w-full md:w-[calc(100%-16rem)] h-24 z-40 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/10 flex justify-between items-center px-10">
          <button className="md:hidden text-white/70 hover:text-white shrink-0 mr-4" onClick={() => setIsSidebarOpen(true)}><span className="material-symbols-outlined text-2xl">menu</span></button>
          <GlobalSearch />
          <div className="flex items-center gap-6">
            <button className="relative text-white/60 hover:text-white transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-0 right-0 w-2 h-2 bg-secondary rounded-full shadow-[0_0_10px_rgba(203,123,255,0.8)]"></span>
            </button>
            <button className="text-white/60 hover:text-white transition-colors">
              <span className="material-symbols-outlined">apps</span>
            </button>
            <div className="h-8 w-[1px] bg-white/10"></div>
            <button className="bg-gradient-to-r from-secondary to-primary text-on-secondary px-6 py-2.5 rounded-full text-xs font-headline font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-[0_0_20px_rgba(233,179,255,0.2)] hover:shadow-[0_0_30px_rgba(233,179,255,0.4)]">
              <span className="material-symbols-outlined text-[18px]">upload</span>
              <span>Upload</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="pt-32 pb-12 px-10 max-w-7xl mx-auto space-y-12">
          {/* Header Section */}
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter text-white mb-3">
                Meu Perfil
              </h2>
              <p className="text-white/50 text-lg max-w-2xl font-light leading-relaxed">
                Gerencie suas informações pessoais, métricas de desempenho e integrações.
              </p>
            </div>
            <button 
              onClick={handleSave}
              className="bg-secondary text-on-secondary px-8 py-3 rounded-xl font-headline font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_20px_rgba(203,123,255,0.3)] hover:shadow-[0_0_30px_rgba(203,123,255,0.5)]"
            >
              Salvar Alterações
            </button>
          </div>

          {/* Bento Grid Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Meta Mensal */}
            <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl group hover:border-secondary/30 hover:bg-white/[0.04] transition-all">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Meta Mensal</p>
                <span className="material-symbols-outlined text-secondary text-xl">trending_up</span>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-headline font-extrabold text-white tracking-tight">R$ 12.450</span>
                <span className="text-white/30 text-xs">/ R$ 20.000</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-secondary w-[62%] rounded-full shadow-[0_0_10px_rgba(203,123,255,0.5)]"></div>
              </div>
              <p className="mt-4 text-[10px] text-white/30 uppercase tracking-widest">62% da meta atingida</p>
            </div>

            {/* Vídeos Produzidos */}
            <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl group hover:border-primary/30 hover:bg-white/[0.04] transition-all">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Vídeos Produzidos</p>
                <span className="material-symbols-outlined text-primary text-xl">movie_filter</span>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-headline font-extrabold text-white tracking-tight">12</span>
                <span className="text-white/30 text-xs">/ 20 vídeos</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[60%] rounded-full shadow-[0_0_10px_rgba(173,198,255,0.5)]"></div>
              </div>
              <p className="mt-4 text-[10px] text-white/30 uppercase tracking-widest">60% da meta atingida</p>
            </div>

            {/* Avaliação Média */}
            <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl group hover:border-secondary/30 hover:bg-white/[0.04] transition-all">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Avaliação Média</p>
                <span className="material-symbols-outlined text-secondary text-xl">star</span>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-headline font-extrabold text-white tracking-tight">4.9</span>
                <span className="text-white/30 text-xs">/ 5.0</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-secondary w-[98%] rounded-full shadow-[0_0_10px_rgba(203,123,255,0.5)]"></div>
              </div>
              <p className="mt-4 text-[10px] text-white/30 uppercase tracking-widest">98% de satisfação</p>
            </div>
          </div>

          {/* Main Profile Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Personal Info */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl">
                <div className="flex items-center gap-3 mb-8">
                  <span className="material-symbols-outlined text-secondary">person</span>
                  <h3 className="text-xl font-headline font-bold text-white">Informações Pessoais</h3>
                </div>

                <div className="flex flex-col md:flex-row gap-10 items-start mb-10">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-secondary/20 to-primary/20 border-2 border-white/10 p-1 overflow-hidden transition-all group-hover:border-secondary/50">
                      {adminProfile.avatarUrl ? (
                        <img src={adminProfile.avatarUrl} alt={adminProfile.name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white/5 rounded-2xl">
                          <span className="material-symbols-outlined text-4xl text-white/20">person</span>
                        </div>
                      )}
                    </div>
                    <label className="absolute -bottom-3 -right-3 w-10 h-10 bg-secondary text-on-secondary rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer">
                      <span className="material-symbols-outlined text-xl">edit</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} />
                    </label>
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Nome Completo</label>
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-light focus:ring-1 focus:ring-secondary/50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">E-mail Corporativo</label>
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-light focus:ring-1 focus:ring-secondary/50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Cargo / Função</label>
                      <input 
                        type="text" 
                        value={formData.role}
                        readOnly
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white/50 font-light cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Telefone / WhatsApp</label>
                      <input 
                        type="text" 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-light focus:ring-1 focus:ring-secondary/50 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Integrations */}
              <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl">
                <div className="flex items-center gap-3 mb-8">
                  <span className="material-symbols-outlined text-secondary">extension</span>
                  <h3 className="text-xl font-headline font-bold text-white">Integrações Ativas</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2">
                        <img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" alt="Google" className="w-full object-contain" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm">Google OAuth</h4>
                        <p className="text-xs text-white/40">
                          {isGoogleLinked ? `Conectado como ${adminProfile.googleEmail || 'sua conta Google'}` : 'Vincule sua conta para login rápido'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={handleLinkGoogle}
                      disabled={isLinking}
                      className={`text-xs font-headline font-bold uppercase tracking-widest transition-colors ${
                        isGoogleLinked ? 'text-red-400 hover:text-red-300' : 'text-secondary hover:text-secondary/80'
                      } disabled:opacity-50`}
                    >
                      {isLinking ? 'Processando...' : (isGoogleLinked ? 'Desconectar' : 'Conectar')}
                    </button>
                  </div>

                  {/* WhatsApp Integration */}
                  <div className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#25D366] rounded-xl flex items-center justify-center p-2">
                        <svg viewBox="0 0 24 24" className="w-full h-full fill-white">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm">WhatsApp Web</h4>
                        <p className="text-xs text-white/40">
                          {whatsappStatus === 'ready' ? `Conectado como ${whatsappUser?.id?.split(':')[0] || 'Aparelho'}` : 
                           whatsappStatus === 'qr' ? 'Aguardando leitura do QR Code' :
                           whatsappStatus === 'connecting' ? 'Iniciando sessão...' :
                           'Conecte seu WhatsApp para automações'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {whatsappStatus === 'qr' && (
                        <button 
                          onClick={() => setShowQRModal(true)}
                          className="text-[10px] font-headline font-bold uppercase tracking-widest text-secondary hover:underline"
                        >
                          Ver QR Code
                        </button>
                      )}
                      <button 
                        onClick={whatsappStatus === 'ready' ? handleLogoutWhatsApp : handleConnectWhatsApp}
                        disabled={whatsappStatus === 'connecting'}
                        className={`text-xs font-headline font-bold uppercase tracking-widest transition-colors ${
                          whatsappStatus === 'ready' ? 'text-red-400 hover:text-red-300' : 'text-secondary hover:text-secondary/80'
                        } disabled:opacity-50`}
                      >
                        {whatsappStatus === 'connecting' ? 'Iniciando...' : (whatsappStatus === 'ready' ? 'Desconectar' : 'Conectar')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              
              {/* Security Card - Password Change */}
              <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl">
                <div className="flex items-center gap-3 mb-8">
                  <span className="material-symbols-outlined text-secondary">security</span>
                  <h3 className="text-xl font-headline font-bold text-white">Segurança</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Senha Atual</label>
                    <input 
                      type="password" 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-light focus:ring-1 focus:ring-secondary/50 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Nova Senha</label>
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-light focus:ring-1 focus:ring-secondary/50 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Confirmar Nova Senha</label>
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-light focus:ring-1 focus:ring-secondary/50 outline-none"
                    />
                  </div>
                  <button 
                    onClick={handleUpdatePassword}
                    disabled={isUpdatingPassword}
                    className="w-full mt-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 text-[10px] font-headline font-bold uppercase tracking-widest text-white transition-all disabled:opacity-50"
                  >
                    {isUpdatingPassword ? 'Atualizando...' : 'Atualizar Senha'}
                  </button>
                </div>
              </div>

              {/* Activity Log */}
              <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl">
                <div className="flex items-center gap-3 mb-8">
                  <span className="material-symbols-outlined text-secondary">history</span>
                  <h3 className="text-xl font-headline font-bold text-white">Atividade Recente</h3>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5 shrink-0"></div>
                    <div>
                      <p className="text-xs text-white font-medium">Login realizado</p>
                      <p className="text-[10px] text-white/30">Hoje, às 09:42 • São Paulo, BR</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-1.5 shrink-0"></div>
                    <div>
                      <p className="text-xs text-white font-medium">Alteração de senha</p>
                      <p className="text-[10px] text-white/30">Ontem, às 18:15 • São Paulo, BR</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}

import React, { useState } from 'react';
import SEO from '../components/SEO';
import { Link, useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import GlobalSearch from '../components/GlobalSearch';
import { useAuth } from '../hooks/useAuth';
import { useEmployees, TeamMember } from '../hooks/useEmployees';
import { useAgencySettings, PortfolioCase, WorkflowStep } from '../hooks/useAgencySettings';
import { useGoalSettings } from '../hooks/useGoalSettings';
import { auth, db } from '../firebase';
import { updatePassword } from 'firebase/auth';
import { doc } from 'firebase/firestore';

export default function AdminSettings() {
  const { teamMembers, addMember, updateMember, deleteMember } = useEmployees();
  const { settings, updateSettings } = useAgencySettings();
  const { goalSettings, updateGoalSettings } = useGoalSettings();
  const { adminProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Route Protection
  React.useEffect(() => {
    if (!authLoading && adminProfile) {
      if (adminProfile.role !== 'owner') {
        navigate('/admin/dashboard', { replace: true });
      }
    }
  }, [adminProfile, authLoading, navigate]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState({ name: '', role: 'Editor', login: '', password: '' });
  const [activeTab, setActiveTab] = useState('perfil');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));

  // Local state for goals to allow "Save" button
  const [localGoals, setLocalGoals] = useState(goalSettings);
  const [localTeamGoals, setLocalTeamGoals] = useState<{ [key: string]: { sales?: number; videos?: number } }>({});

  const handleOpenGoalsModal = () => {
    setLocalGoals(goalSettings);
    const monthData = goalSettings.months[selectedMonth] || { totalMonthlySalesGoal: 0, totalMonthlyVideoGoal: 0 };
    
    // Ensure localGoals has the current month data
    setLocalGoals(prev => ({
      ...prev,
      months: {
        ...prev.months,
        [selectedMonth]: monthData
      }
    }));

    const initialGoals: { [key: string]: { sales?: number; videos?: number } } = {};
    teamMembers.forEach(m => {
      // Use month-specific goal if available, otherwise fallback to member's general goal
      const monthIndividual = monthData.individualGoals?.[m.id];
      initialGoals[m.id] = { 
        sales: monthIndividual?.sales ?? m.monthlySalesGoal, 
        videos: monthIndividual?.videos ?? m.monthlyVideoGoal 
      };
    });
    setLocalTeamGoals(initialGoals);
    setIsGoalsModalOpen(true);
  };

  // Local state for agency settings to allow "Save" button
  const [localSettings, setLocalSettings] = useState(settings);

  const handleOpenModal = (member?: TeamMember) => {
    if (member) {
      setEditingMember(member);
      setFormData({ name: member.name, role: member.role, login: member.login, password: member.password || '' });
    } else {
      setEditingMember(null);
      setFormData({ name: '', role: 'Editor', login: '', password: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMember(null);
    setIsDeleting(false);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingMember) {
      if (editingMember.isOwner) {
        // Only allow updating name and password for owner
        const updates: any = {
          name: formData.name,
          password: formData.password
        };
        // Update auth password if changed
        if (formData.password !== editingMember.password) {
          try {
            const user = auth.currentUser;
            if (user && user.uid === editingMember.userId) {
              await updatePassword(user, formData.password);
            }
          } catch (error: any) {
            console.error("Error updating password:", error);
            if (error.code === 'auth/requires-recent-login') {
              alert("Por motivos de segurança, você precisa fazer login novamente para alterar sua senha.");
              return;
            }
            alert("Erro ao atualizar senha no Firebase Auth.");
            return;
          }
        }
        
        updateMember(editingMember.id, updates);
        handleCloseModal();
        return;
      }
      updateMember(editingMember.id, formData);
    } else {
      if (formData.login === '15599873676') {
        alert("Este ID de acesso é reservado para o proprietário.");
        return;
      }
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("Acesso negado: Seu login de Admin expirou.");

        const response = await fetch('/api/admin/users/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: formData.name,
            login: formData.login,
            password: formData.password,
            role: formData.role.toLowerCase()
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Erro ao processar criação no servidor.");
        }

        // A lista será atualizada automaticamente pelo onSnapshot no useEmployees()
      } catch (e: any) {
        console.error("Erro na criação do acesso:", e);
        alert("Erro ao criar acesso: " + (e.message || 'Erro inesperado'));
        return;
      }
    }
    handleCloseModal();
  };

  const handleDeleteMember = (id: string) => {
    const memberToDelete = teamMembers.find(m => m.id === id);
    if (memberToDelete?.isOwner) {
      alert("O proprietário não pode ser removido.");
      handleCloseModal();
      return;
    }
    
    if (isDeleting) {
      deleteMember(id);
      handleCloseModal();
    } else {
      setIsDeleting(true);
    }
  };

  const handleSaveAgencySettings = () => {
    updateSettings(localSettings);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const handleSaveGoals = () => {
    const updatedGoals = {
      ...localGoals,
      months: {
        ...localGoals.months,
        [selectedMonth]: {
          ...localGoals.months[selectedMonth],
          individualGoals: localTeamGoals
        }
      }
    };
    updateGoalSettings(updatedGoals);
    
    // Also update team members for backward compatibility or general display
    (Object.entries(localTeamGoals) as [string, { sales?: number; videos?: number }][]).forEach(([id, goals]) => {
      updateMember(id, {
        monthlySalesGoal: goals.sales,
        monthlyVideoGoal: goals.videos
      });
    });
    setIsGoalsModalOpen(false);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const updateLocalMonthGoal = (field: string, value: number) => {
    const currentMonthData = localGoals.months[selectedMonth] || { totalMonthlySalesGoal: 0, totalMonthlyVideoGoal: 0 };
    const updatedMonthData = { ...currentMonthData, [field]: value };

    // If daily goal is updated, update monthly total
    if (field === 'dailySalesGoal') {
      updatedMonthData.totalMonthlySalesGoal = value * 30;
    } else if (field === 'dailyVideoGoal') {
      updatedMonthData.totalMonthlyVideoGoal = value * 30;
    }
    // If monthly goal is updated, update daily
    else if (field === 'totalMonthlySalesGoal') {
      updatedMonthData.dailySalesGoal = Math.round(value / 30);
    } else if (field === 'totalMonthlyVideoGoal') {
      updatedMonthData.dailyVideoGoal = Math.round(value / 30);
    }

    setLocalGoals({
      ...localGoals,
      months: {
        ...localGoals.months,
        [selectedMonth]: updatedMonthData
      }
    });
  };

  const applyDefaultIndividualGoals = (type: 'sales' | 'videos') => {
    const role = type === 'sales' ? 'Vendedor' : 'Editor';
    const defaultValue = type === 'sales' ? localGoals.defaultIndividualSalesGoal : localGoals.defaultIndividualVideoGoal;
    
    const newTeamGoals = { ...localTeamGoals };
    teamMembers.forEach(m => {
      if (m.role === role) {
        newTeamGoals[m.id] = { 
          ...newTeamGoals[m.id], 
          [type === 'sales' ? 'sales' : 'videos']: defaultValue 
        };
      }
    });
    setLocalTeamGoals(newTeamGoals);
  };

  const calculateDistributedGoals = (type: 'sales' | 'videos', total: number) => {
    const role = type === 'sales' ? 'Vendedor' : 'Editor';
    const count = teamMembers.filter(m => m.role === role).length;
    if (count === 0) return;

    const perPerson = Math.floor(total / count);
    const newTeamGoals = { ...localTeamGoals };
    
    teamMembers.forEach(m => {
      if (m.role === role) {
        newTeamGoals[m.id] = { 
          ...newTeamGoals[m.id], 
          [type === 'sales' ? 'sales' : 'videos']: perPerson 
        };
      }
    });
    
    setLocalTeamGoals(newTeamGoals);
  };

  const updatePortfolioCase = (index: number, field: keyof PortfolioCase, value: string) => {
    const newCases = [...localSettings.portfolioCases];
    newCases[index] = { ...newCases[index], [field]: value };
    setLocalSettings({ ...localSettings, portfolioCases: newCases });
  };

  const addPortfolioCase = () => {
    setLocalSettings({
      ...localSettings,
      portfolioCases: [
        ...localSettings.portfolioCases,
        { videoSrc: '', tituloDaCampanha: '', metricaPrincipal: '', descricao: '', cliente: '' }
      ]
    });
  };

  const removePortfolioCase = (index: number) => {
    const newCases = localSettings.portfolioCases.filter((_, i) => i !== index);
    setLocalSettings({ ...localSettings, portfolioCases: newCases });
  };

  const updateWorkflowStep = (index: number, field: keyof WorkflowStep, value: string) => {
    const newSteps = [...localSettings.workflowSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setLocalSettings({ ...localSettings, workflowSteps: newSteps });
  };

  return (
    <div className="font-body text-on-background min-h-screen flex bg-[#050505] overflow-hidden selection:bg-primary/30">
      {/* Background from Home */}
      <div className="fixed inset-0 w-full h-full -z-10 bg-[#050505] overflow-hidden">
        <div className="absolute inset-0 w-full h-full opacity-1 bg-gradient-to-b from-[#020202] to-transparent">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.05),transparent_60%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(153,0,255,0.05),transparent_40%)]"></div>
        </div>
      </div>

      <SEO title="Configurações" />
      <AdminSidebar activePage="settings" isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
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

        {/* Scrollable Canvas */}
        <div className="pt-32 pb-12 px-10 max-w-7xl mx-auto space-y-12">
          {/* Header Section */}
          <div className="mb-12">
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter text-white mb-3">
              Configurações
            </h2>
            <p className="text-white/50 text-lg max-w-2xl font-light leading-relaxed">
              Gerencie sua agência, equipe e preferências de segurança em um ambiente centralizado.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-8 mb-10 border-b border-white/10">
            <button 
              onClick={() => setActiveTab('perfil')}
              className={`pb-4 text-sm font-headline font-bold uppercase tracking-widest transition-colors ${activeTab === 'perfil' ? 'text-secondary border-b-2 border-secondary' : 'text-white/50 hover:text-white'}`}
            >
              Perfil da Agência
            </button>
            <button 
              onClick={() => setActiveTab('equipe')}
              className={`pb-4 text-sm font-headline font-bold uppercase tracking-widest transition-colors ${activeTab === 'equipe' ? 'text-secondary border-b-2 border-secondary' : 'text-white/50 hover:text-white'}`}
            >
              Gestão de Equipe
            </button>
            <button 
              onClick={() => setActiveTab('seguranca')}
              className={`pb-4 text-sm font-headline font-bold uppercase tracking-widest transition-colors ${activeTab === 'seguranca' ? 'text-secondary border-b-2 border-secondary' : 'text-white/50 hover:text-white'}`}
            >
              Segurança
            </button>
          </div>

          {/* Tab Content: Gestão de Equipe */}
          {activeTab === 'equipe' && (
          <div className="space-y-8">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-2xl font-headline font-bold text-white mb-1">Membros da Equipe</h3>
                <p className="text-sm text-white/50 font-light">Gerencie permissões e visualize a atividade recente dos acessos.</p>
              </div>
              <button onClick={() => handleOpenModal()} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-xl font-headline font-bold text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2">
                <span className="material-symbols-outlined">add</span>
                <span>Novo Acesso</span>
              </button>
            </div>

            {/* Table Container (Glassmorphism Bento Style) */}
            <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold">
                    <th className="px-8 py-5">Foto</th>
                    <th className="px-8 py-5">Nome</th>
                    <th className="px-8 py-5">Cargo</th>
                    <th className="px-8 py-5">Último Login</th>
                    <th className="px-8 py-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-6">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-secondary/30 p-0.5 bg-white/5 flex items-center justify-center text-white font-headline font-bold">
                          {member.initials}
                        </div>
                      </td>
                      <td className="px-8 py-6 font-headline font-bold text-white text-base">
                        <Link to={`/admin/team/${member.id}`} className="hover:text-secondary transition-colors">
                          {member.name}
                        </Link>
                        <div className="text-xs text-white/40 font-light mt-0.5">{member.login}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="bg-secondary/10 border border-secondary/20 text-secondary px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                          {member.role} {member.isOwner && '(Owner)'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-white/50 text-sm font-light">{member.lastLogin}</td>
                      <td className="px-8 py-6 text-right">
                        <button onClick={() => handleOpenModal(member)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 transition-all inline-flex items-center justify-center text-white/50 hover:text-white">
                          <span className="material-symbols-outlined text-[20px]">settings</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Stats/Bento Grid Section for Context */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl group hover:border-secondary/30 hover:bg-white/[0.04] transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Metas da Equipe</p>
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-transparent text-[10px] text-white/60 font-bold uppercase tracking-widest outline-none border-none cursor-pointer hover:text-white transition-colors"
                    >
                      {Array.from({ length: 12 }).map((_, i) => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - 6 + i);
                        const key = d.toISOString().substring(0, 7);
                        const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                        return <option key={key} value={key} className="bg-[#0a0a0a]">{label}</option>;
                      })}
                    </select>
                  </div>
                  <div className="space-y-4 mb-6">
                    <div>
                      <div className="flex justify-between text-[10px] text-white/40 uppercase tracking-widest mb-1">
                        <span>Vendas Mensal</span>
                        <span className="text-secondary">R$ {(goalSettings.months[selectedMonth]?.totalMonthlySalesGoal || 0).toLocaleString()}</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-secondary w-[60%] rounded-full opacity-50"></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-white/40 uppercase tracking-widest mb-1">
                        <span>Produção Vídeos</span>
                        <span className="text-primary">{(goalSettings.months[selectedMonth]?.totalMonthlyVideoGoal || 0)} vídeos</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-[45%] rounded-full opacity-50"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleOpenGoalsModal}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-headline font-bold uppercase tracking-widest text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">target</span>
                  Configurar Metas
                </button>
              </div>

              <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl group hover:border-primary/30 hover:bg-white/[0.04] transition-all">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mb-4">Total de Membros</p>
                <div className="flex items-baseline space-x-3">
                  <span className="text-4xl font-headline font-extrabold text-white tracking-tight">
                    {teamMembers.length < 10 ? `0${teamMembers.length}` : teamMembers.length}
                  </span>
                  <span className="text-primary text-xs font-bold tracking-wider">ativos</span>
                </div>
              </div>
              
              <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl group hover:border-secondary/30 hover:bg-white/[0.04] transition-all">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mb-4">Acessos Ativos</p>
                <div className="flex items-baseline space-x-3">
                  <span className="text-4xl font-headline font-extrabold text-white tracking-tight">
                    01
                  </span>
                  <span className="text-white/40 text-xs font-bold tracking-wider">em tempo real</span>
                </div>
              </div>
            </div>
          </div>
          )}

          {activeTab === 'perfil' && (
            <div className="space-y-12">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-headline font-bold text-white mb-1">Identidade Visual da Home</h3>
                  <p className="text-sm text-white/50 font-light">Personalize os elementos visuais que seus clientes veem ao acessar o site.</p>
                </div>
                <button 
                  onClick={handleSaveAgencySettings}
                  className="bg-secondary text-on-secondary px-8 py-3 rounded-xl font-headline font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_20px_rgba(203,123,255,0.3)] hover:shadow-[0_0_30px_rgba(203,123,255,0.5)]"
                >
                  Salvar Alterações
                </button>
              </div>

              {/* Hero Section Settings */}
              <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-secondary">rocket_launch</span>
                  <h4 className="text-lg font-headline font-bold text-white">Seção Hero & Preloader</h4>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Título Principal (HTML permitido)</label>
                    <input 
                      type="text" 
                      value={localSettings.heroTitle}
                      onChange={(e) => setLocalSettings({...localSettings, heroTitle: e.target.value})}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-secondary/50 focus:border-secondary/50 transition-all text-white font-light"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Descrição Hero</label>
                    <textarea 
                      rows={3}
                      value={localSettings.heroDescription}
                      onChange={(e) => setLocalSettings({...localSettings, heroDescription: e.target.value})}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-secondary/50 focus:border-secondary/50 transition-all text-white font-light resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">URL do Vídeo de Preloader (Intro)</label>
                    <input 
                      type="text" 
                      value={localSettings.preloaderVideoUrl}
                      onChange={(e) => setLocalSettings({...localSettings, preloaderVideoUrl: e.target.value})}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-secondary/50 focus:border-secondary/50 transition-all text-white font-light"
                    />
                  </div>
                </div>
              </div>

              {/* Portfolio Cases Settings */}
              <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary">video_library</span>
                    <h4 className="text-lg font-headline font-bold text-white">Portfólio (Cases)</h4>
                  </div>
                  <button 
                    onClick={addPortfolioCase}
                    className="text-xs font-headline font-bold text-secondary uppercase tracking-widest flex items-center gap-2 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Adicionar Case
                  </button>
                </div>
                
                <div className="space-y-8">
                  {localSettings.portfolioCases.map((item, index) => (
                    <div key={index} className="p-6 bg-white/[0.02] border border-white/5 rounded-xl relative group">
                      <button 
                        onClick={() => removePortfolioCase(index)}
                        className="absolute top-4 right-4 text-white/20 hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Título da Campanha</label>
                          <input 
                            type="text" 
                            value={item.tituloDaCampanha}
                            onChange={(e) => updatePortfolioCase(index, 'tituloDaCampanha', e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-light"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Métrica Principal</label>
                          <input 
                            type="text" 
                            value={item.metricaPrincipal}
                            onChange={(e) => updatePortfolioCase(index, 'metricaPrincipal', e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-light"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">URL do Vídeo</label>
                          <input 
                            type="text" 
                            value={item.videoSrc}
                            onChange={(e) => updatePortfolioCase(index, 'videoSrc', e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-light"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Descrição</label>
                          <textarea 
                            rows={2}
                            value={item.descricao}
                            onChange={(e) => updatePortfolioCase(index, 'descricao', e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-light resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Cliente (@username)</label>
                          <input 
                            type="text" 
                            value={item.cliente}
                            onChange={(e) => updatePortfolioCase(index, 'cliente', e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-light"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transformation Section Settings */}
              <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-secondary">transform</span>
                  <h4 className="text-lg font-headline font-bold text-white">Seção de Transformação</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Imagem Painel 1 (Antes)</label>
                    <input 
                      type="text" 
                      value={localSettings.transformationPanel1Image}
                      onChange={(e) => setLocalSettings({...localSettings, transformationPanel1Image: e.target.value})}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-light"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Vídeo Painel 3 (Depois)</label>
                    <input 
                      type="text" 
                      value={localSettings.transformationPanel3Video}
                      onChange={(e) => setLocalSettings({...localSettings, transformationPanel3Video: e.target.value})}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-light"
                    />
                  </div>
                </div>
              </div>

              {/* Workflow & WhatsApp Settings */}
              <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-secondary">chat</span>
                  <h4 className="text-lg font-headline font-bold text-white">Workflow & Mockup WhatsApp</h4>
                </div>
                
                <div className="space-y-6">
                  <h5 className="text-xs font-headline font-bold text-white/40 uppercase tracking-widest">Passos do Workflow</h5>
                  <div className="grid grid-cols-1 gap-4">
                    {localSettings.workflowSteps.map((step, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                          type="text" 
                          placeholder="Título do Passo"
                          value={step.title}
                          onChange={(e) => updateWorkflowStep(index, 'title', e.target.value)}
                          className="bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-light"
                        />
                        <input 
                          type="text" 
                          placeholder="Descrição do Passo"
                          value={step.description}
                          onChange={(e) => updateWorkflowStep(index, 'description', e.target.value)}
                          className="bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-light"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="h-[1px] bg-white/5 my-6"></div>

                  <h5 className="text-xs font-headline font-bold text-white/40 uppercase tracking-widest">Imagens do Mockup</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Imagem 1 (Cliente)</label>
                      <input 
                        type="text" 
                        value={localSettings.whatsappMockupImage1}
                        onChange={(e) => setLocalSettings({...localSettings, whatsappMockupImage1: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-light"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Imagem 2 (Resultado)</label>
                      <input 
                        type="text" 
                        value={localSettings.whatsappMockupImage2}
                        onChange={(e) => setLocalSettings({...localSettings, whatsappMockupImage2: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-light"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Save Button */}
              <div className="flex justify-end items-center gap-4 pt-6">
                {showSaveSuccess && (
                  <span className="text-emerald-400 text-sm font-light animate-fade-in">
                    Alterações salvas com sucesso!
                  </span>
                )}
                <button 
                  onClick={handleSaveAgencySettings}
                  className="bg-gradient-to-r from-secondary to-primary text-on-secondary px-12 py-4 rounded-xl font-headline font-bold text-sm uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_30px_rgba(233,179,255,0.3)] hover:shadow-[0_0_40px_rgba(233,179,255,0.5)]"
                >
                  Salvar Todas as Alterações
                </button>
              </div>
            </div>
          )}

          {activeTab === 'seguranca' && (
            <div className="space-y-8">
              <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl">
                <h3 className="text-2xl font-headline font-bold text-white mb-6">Segurança</h3>
                <p className="text-white/50 mb-4">Configurações de segurança e autenticação de dois fatores estarão disponíveis em breve.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal for Add/Edit Member */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-headline font-bold text-white">
                {editingMember ? 'Editar Acesso' : 'Novo Acesso'}
              </h3>
              <button onClick={handleCloseModal} className="text-white/50 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveMember} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-secondary/50 focus:border-secondary/50 transition-all text-white placeholder:text-white/20 font-light"
                  placeholder="Ex: João Silva"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Login / ID</label>
                <input 
                  type="text" 
                  required
                  readOnly={editingMember?.isOwner}
                  value={formData.login}
                  onChange={(e) => setFormData({...formData, login: e.target.value})}
                  className={`w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-secondary/50 focus:border-secondary/50 transition-all text-white placeholder:text-white/20 font-light ${editingMember?.isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="Ex: joao.silva"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Senha</label>
                <input 
                  type="password" 
                  required={!editingMember}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-secondary/50 focus:border-secondary/50 transition-all text-white placeholder:text-white/20 font-light"
                  placeholder="********"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Cargo</label>
                <select 
                  disabled={editingMember?.isOwner}
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className={`w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-secondary/50 focus:border-secondary/50 transition-all text-white font-light appearance-none ${editingMember?.isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="Admin">Admin</option>
                  <option value="Editor">Editor</option>
                  <option value="Vendedor">Vendedor</option>
                </select>
              </div>
              
              <div className="pt-4 flex gap-3">
                {editingMember && !editingMember.isOwner && (
                  <button 
                    type="button"
                    onClick={() => handleDeleteMember(editingMember.id)}
                    className={`flex-1 ${isDeleting ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-500'} border border-red-500/20 py-3 rounded-xl font-headline font-bold text-xs uppercase tracking-widest transition-all active:scale-95`}
                  >
                    {isDeleting ? 'Confirmar?' : 'Remover'}
                  </button>
                )}
                <button 
                  type="submit"
                  className={`${editingMember?.isOwner ? 'w-full' : 'flex-[2]'} bg-gradient-to-r from-secondary to-primary text-on-secondary py-3 rounded-xl font-headline font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_20px_rgba(233,179,255,0.2)] hover:shadow-[0_0_30px_rgba(233,179,255,0.4)]`}
                >
                  {editingMember ? 'Salvar Alterações' : 'Criar Acesso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal for Team Goals */}
      {isGoalsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-4xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h3 className="text-xl font-headline font-bold text-white">Configurar Metas</h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-white/40 font-light">Defina os objetivos para</p>
                  <select 
                    value={selectedMonth}
                    onChange={(e) => {
                      const newMonth = e.target.value;
                      setSelectedMonth(newMonth);
                      // Reload goals for the new month
                      const monthData = goalSettings.months[newMonth] || { totalMonthlySalesGoal: 0, totalMonthlyVideoGoal: 0 };
                      setLocalGoals(prev => ({
                        ...prev,
                        months: {
                          ...prev.months,
                          [newMonth]: monthData
                        }
                      }));
                      const initialGoals: { [key: string]: { sales?: number; videos?: number } } = {};
                      teamMembers.forEach(m => {
                        const monthIndividual = monthData.individualGoals?.[m.id];
                        initialGoals[m.id] = { 
                          sales: monthIndividual?.sales ?? m.monthlySalesGoal, 
                          videos: monthIndividual?.videos ?? m.monthlyVideoGoal 
                        };
                      });
                      setLocalTeamGoals(initialGoals);
                    }}
                    className="bg-transparent text-xs text-secondary font-bold uppercase tracking-widest outline-none border-none cursor-pointer hover:text-white transition-colors"
                  >
                    {Array.from({ length: 12 }).map((_, i) => {
                      const d = new Date();
                      d.setMonth(d.getMonth() - 6 + i);
                      const key = d.toISOString().substring(0, 7);
                      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                      return <option key={key} value={key} className="bg-[#0a0a0a]">{label}</option>;
                    })}
                  </select>
                </div>
              </div>
              <button onClick={() => setIsGoalsModalOpen(false)} className="text-white/50 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto max-h-[75vh] space-y-10 custom-scrollbar">
              {/* Global & Daily Goals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Sales Column */}
                <div className="space-y-6 p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined text-secondary">payments</span>
                    <h4 className="text-sm font-headline font-bold text-white uppercase tracking-widest">Vendas</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Meta Mensal</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-[10px] font-bold">R$</span>
                        <input 
                          type="number" 
                          value={localGoals.months[selectedMonth]?.totalMonthlySalesGoal || 0}
                          onChange={(e) => updateLocalMonthGoal('totalMonthlySalesGoal', Number(e.target.value))}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 pl-8 pr-3 text-xs text-white font-light focus:ring-1 focus:ring-secondary/50"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Meta Diária</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-[10px] font-bold">R$</span>
                        <input 
                          type="number" 
                          value={localGoals.months[selectedMonth]?.dailySalesGoal || 0}
                          onChange={(e) => updateLocalMonthGoal('dailySalesGoal', Number(e.target.value))}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 pl-8 pr-3 text-xs text-white font-light focus:ring-1 focus:ring-secondary/50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Meta Individual Padrão</label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-[10px] font-bold">R$</span>
                        <input 
                          type="number" 
                          value={localGoals.defaultIndividualSalesGoal}
                          onChange={(e) => setLocalGoals({...localGoals, defaultIndividualSalesGoal: Number(e.target.value)})}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 pl-8 pr-3 text-xs text-white font-light focus:ring-1 focus:ring-secondary/50"
                        />
                      </div>
                      <button 
                        onClick={() => applyDefaultIndividualGoals('sales')}
                        className="px-3 bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 text-secondary rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => calculateDistributedGoals('sales', localGoals.months[selectedMonth]?.totalMonthlySalesGoal || 0)}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white/60 transition-all"
                  >
                    Distribuir Meta Mensal
                  </button>
                </div>

                {/* Video Column */}
                <div className="space-y-6 p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined text-primary">movie</span>
                    <h4 className="text-sm font-headline font-bold text-white uppercase tracking-widest">Vídeos</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Meta Mensal</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={localGoals.months[selectedMonth]?.totalMonthlyVideoGoal || 0}
                          onChange={(e) => updateLocalMonthGoal('totalMonthlyVideoGoal', Number(e.target.value))}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-light focus:ring-1 focus:ring-primary/50"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-[8px] font-bold uppercase tracking-widest">vids</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Meta Diária</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={localGoals.months[selectedMonth]?.dailyVideoGoal || 0}
                          onChange={(e) => updateLocalMonthGoal('dailyVideoGoal', Number(e.target.value))}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-light focus:ring-1 focus:ring-primary/50"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-[8px] font-bold uppercase tracking-widest">vids</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Meta Individual Padrão</label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input 
                          type="number" 
                          value={localGoals.defaultIndividualVideoGoal}
                          onChange={(e) => setLocalGoals({...localGoals, defaultIndividualVideoGoal: Number(e.target.value)})}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-light focus:ring-1 focus:ring-primary/50"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-[8px] font-bold uppercase tracking-widest">vids</span>
                      </div>
                      <button 
                        onClick={() => applyDefaultIndividualGoals('videos')}
                        className="px-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => calculateDistributedGoals('videos', localGoals.months[selectedMonth]?.totalMonthlyVideoGoal || 0)}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white/60 transition-all"
                  >
                    Distribuir Meta Mensal
                  </button>
                </div>
              </div>

              {/* Individual Overrides */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h4 className="text-xs font-headline font-bold text-white/60 uppercase tracking-[0.2em]">Ajustes Individuais</h4>
                  <span className="text-[10px] text-white/30 font-light italic">* Alterações manuais priorizam sobre o cálculo automático</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teamMembers.filter(m => m.role !== 'Admin').map(member => (
                    <div key={member.id} className="flex items-center gap-4 p-4 bg-white/[0.01] border border-white/5 rounded-xl hover:bg-white/[0.03] transition-all">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-white border border-white/10">
                          {member.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-headline font-bold text-white truncate">{member.name}</p>
                          <p className="text-[8px] text-white/40 uppercase tracking-widest">{member.role}</p>
                        </div>
                      </div>

                      <div className="w-32">
                        {member.role === 'Vendedor' ? (
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/20 text-[8px] font-bold">R$</span>
                            <input 
                              type="number" 
                              placeholder="Meta"
                              value={localTeamGoals[member.id]?.sales || ''}
                              onChange={(e) => setLocalTeamGoals({
                                ...localTeamGoals,
                                [member.id]: { ...localTeamGoals[member.id], sales: Number(e.target.value) }
                              })}
                              className="w-full bg-white/[0.03] border border-white/10 rounded-lg py-1.5 pl-6 pr-2 text-[10px] text-white font-light focus:border-secondary/50 transition-all"
                            />
                          </div>
                        ) : (
                          <div className="relative">
                            <input 
                              type="number" 
                              placeholder="Meta"
                              value={localTeamGoals[member.id]?.videos || ''}
                              onChange={(e) => setLocalTeamGoals({
                                ...localTeamGoals,
                                [member.id]: { ...localTeamGoals[member.id], videos: Number(e.target.value) }
                              })}
                              className="w-full bg-white/[0.03] border border-white/10 rounded-lg py-1.5 px-2 text-[10px] text-white font-light focus:border-primary/50 transition-all"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 text-[7px] font-bold uppercase tracking-widest">vids</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 bg-white/[0.02] flex justify-end gap-4">
              <button 
                onClick={() => setIsGoalsModalOpen(false)}
                className="px-6 py-3 text-xs font-headline font-bold text-white/50 uppercase tracking-widest hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveGoals}
                className="bg-gradient-to-r from-secondary to-primary text-on-secondary px-10 py-3 rounded-xl font-headline font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_20px_rgba(233,179,255,0.2)]"
              >
                Confirmar Metas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useMemo } from 'react';
import SEO from '../components/SEO';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import { useEmployees } from '../hooks/useEmployees';
import { useSales, Sale } from '../hooks/useSales';
import { useDemands } from '../hooks/useDemands';
import { useGoalSettings } from '../hooks/useGoalSettings';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { startOfMonth, endOfMonth, isWithinInterval, parse, isSameDay, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../hooks/useAuth';

export default function EmployeeProfile() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { teamMembers } = useEmployees();
  const { sales } = useSales();
  const { demands } = useDemands();
  const { goalSettings } = useGoalSettings();
  const { adminProfile, updateAdminProfile } = useAuth();

  const employee = teamMembers.find(m => m.id === id);
  const isOwnProfile = employee?.id === '1'; // Assuming '1' is the logged-in admin for now

  const [isEditing, setIsEditing] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = React.useState(adminProfile.avatarUrl);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [message, setMessage] = React.useState({ type: '', text: '' });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Password validation
    if (newPassword) {
      if (newPassword !== confirmPassword) {
        setMessage({ type: 'error', text: 'As novas senhas não coincidem.' });
        return;
      }
      const validPassword = adminProfile.password || '963369';
      if (currentPassword !== validPassword) {
        setMessage({ type: 'error', text: 'Senha atual incorreta.' });
        return;
      }
      // Update password
      updateAdminProfile({ avatarUrl, password: newPassword });
    } else {
      updateAdminProfile({ avatarUrl });
    }

    setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    setIsEditing(false);
    setNewPassword('');
    setCurrentPassword('');
    setConfirmPassword('');
    
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const stats = useMemo(() => {
    if (!employee) return null;

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Sales Stats
    const employeeSales = sales.filter(s => s.sellerId === employee.id && s.status === 'Confirmado');
    const allTimeRevenue = employeeSales.reduce((acc, s) => acc + s.value, 0);
    
    const getSaleDate = (s: Sale) => s.createdAt ? new Date(s.createdAt) : parse(s.date, "dd MMM, yyyy", new Date(), { locale: ptBR });

    const currentMonthSales = employeeSales.filter(s => {
      try {
        const saleDate = getSaleDate(s);
        return isWithinInterval(saleDate, { start: monthStart, end: monthEnd });
      } catch {
        return false;
      }
    });
    const currentMonthRevenue = currentMonthSales.reduce((acc, s) => acc + s.value, 0);

    const todaySales = currentMonthSales.filter(s => isSameDay(getSaleDate(s), now));
    const todayRevenue = todaySales.reduce((acc, s) => acc + s.value, 0);

    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekSales = currentMonthSales.filter(s => isWithinInterval(getSaleDate(s), { start: weekStart, end: now }));
    const weekRevenue = weekSales.reduce((acc, s) => acc + s.value, 0);

    // Production Stats
    const employeeDemands = demands.filter(d => d.assignedTo === employee.id || d.assignedToName === employee.name);
    const deliveredDemands = employeeDemands.filter(d => d.status === 'Finalizado');
    const allTimeVideos = deliveredDemands.reduce((acc, d) => acc + d.videoCount, 0);

    const currentMonthDelivered = deliveredDemands.filter(d => {
      if (!d.finishedAt) return false;
      const finishDate = new Date(d.finishedAt);
      return isWithinInterval(finishDate, { start: monthStart, end: monthEnd });
    });
    const currentMonthVideos = currentMonthDelivered.reduce((acc, d) => acc + d.videoCount, 0);

    const todayDelivered = currentMonthDelivered.filter(d => isSameDay(new Date(d.finishedAt!), now));
    const todayVideos = todayDelivered.reduce((acc, d) => acc + d.videoCount, 0);

    const weekDelivered = currentMonthDelivered.filter(d => isWithinInterval(new Date(d.finishedAt!), { start: weekStart, end: now }));
    const weekVideos = weekDelivered.reduce((acc, d) => acc + d.videoCount, 0);

    // Quality Index (Taxa de Aprovação de Primeira)
    const firstTimeApproved = deliveredDemands.filter(d => (d.revisionCount || 0) === 0).length;
    const qualityIndex = deliveredDemands.length > 0 
      ? Math.round((firstTimeApproved / deliveredDemands.length) * 100) 
      : 0;

    // Average Delivery Time
    let totalDeliveryTime = 0;
    let validDeliveryCount = 0;
    deliveredDemands.forEach(demand => {
      const sale = sales.find(s => s.id === demand.saleId);
      if (sale && demand.finishedAt) {
        try {
          const saleDate = sale.createdAt ? new Date(sale.createdAt) : parse(sale.date, "dd MMM, yyyy", new Date(), { locale: ptBR });
          const finishDate = new Date(demand.finishedAt);
          const diffTime = Math.abs(finishDate.getTime() - saleDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          totalDeliveryTime += diffDays;
          validDeliveryCount++;
        } catch {}
      }
    });
    const avgDeliveryTime = validDeliveryCount > 0 ? Math.round(totalDeliveryTime / validDeliveryCount) : 0;

    // Current Work Queue (Status "Now")
    const currentQueue = employeeDemands.filter(d => d.status === 'Em Produção' || d.status === 'Revisão');

    // Goals (Fetch from month-specific settings if available)
    const currentMonthKey = now.toISOString().substring(0, 7);
    const monthGoalData = goalSettings.months[currentMonthKey];
    const individualMonthGoal = monthGoalData?.individualGoals?.[employee.id];

    const monthlySalesGoal = individualMonthGoal?.sales ?? employee.monthlySalesGoal ?? 50000;
    const monthlyVideoGoal = individualMonthGoal?.videos ?? employee.monthlyVideoGoal ?? 100;

    // Daily goals: if month has a specific daily goal, we could distribute it, 
    // but usually individual goals already imply the daily (monthly / 30)
    // Unless the user set a specific "Daily Individual Goal" which we haven't added yet.
    // For now, let's use the monthly / 30 as the daily target for the individual.
    const weeklySalesGoal = Math.round(monthlySalesGoal / 4);
    const dailySalesGoal = Math.round(monthlySalesGoal / 30);

    const weeklyVideoGoal = Math.round(monthlyVideoGoal / 4);
    const dailyVideoGoal = Math.round(monthlyVideoGoal / 30);

    // Calculate progress
    const salesProgress = {
      month: Math.min((currentMonthRevenue / (monthlySalesGoal || 1)) * 100, 100),
      week: Math.min((weekRevenue / (weeklySalesGoal || 1)) * 100, 100),
      day: Math.min((todayRevenue / (dailySalesGoal || 1)) * 100, 100)
    };

    const videoProgress = {
      month: Math.min((currentMonthVideos / (monthlyVideoGoal || 1)) * 100, 100),
      week: Math.min((weekVideos / (weeklyVideoGoal || 1)) * 100, 100),
      day: Math.min((todayVideos / (dailyVideoGoal || 1)) * 100, 100)
    };

    return {
      allTimeRevenue,
      currentMonthRevenue,
      allTimeVideos,
      currentMonthVideos,
      weekVideos,
      todayVideos,
      qualityIndex,
      avgDeliveryTime,
      currentQueue,
      monthlySalesGoal,
      weeklySalesGoal,
      dailySalesGoal,
      monthlyVideoGoal,
      weeklyVideoGoal,
      dailyVideoGoal,
      salesProgress,
      videoProgress,
      weekRevenue,
      todayRevenue
    };
  }, [employee, sales, demands]);

  if (!employee || !stats) {
    return (
      <div className="min-h-screen bg-[#020202] text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-headline font-bold">Funcionário não encontrado</h2>
          <button onClick={() => navigate(-1)} className="text-secondary hover:underline">Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] text-white font-body selection:bg-primary selection:text-on-primary flex">
      <SEO title="Perfil do Funcionário" />
      <AdminSidebar activePage="team" isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="md:ml-64 w-full flex-1 min-h-screen relative flex flex-col">
        {/* Header */}
        <header className="fixed top-0 right-0 w-full md:w-[calc(100%-16rem)] h-24 z-40 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/10 flex justify-between items-center px-10">
          <button className="md:hidden text-white/70 hover:text-white shrink-0 mr-4" onClick={() => setIsSidebarOpen(true)}><span className="material-symbols-outlined text-2xl">menu</span></button>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/60 hover:text-white">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className="text-xl font-headline font-bold text-white tracking-tight">
              Perfil do <span className="font-serif italic text-secondary font-light">Colaborador</span>
            </h2>
          </div>
        </header>

        <div className="pt-32 pb-12 px-10 max-w-7xl mx-auto w-full space-y-12">
          
          {/* Profile Header Card */}
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="relative z-10 flex items-center gap-8">
              <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br from-secondary to-primary p-[2px] ${isOwnProfile ? 'relative group' : ''}`}>
                <div className="w-full h-full bg-[#050505] rounded-[14px] flex items-center justify-center overflow-hidden">
                  {isOwnProfile && adminProfile.avatarUrl ? (
                    <img src={adminProfile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-headline font-bold text-transparent bg-clip-text bg-gradient-to-r from-secondary to-primary">
                      {employee.initials}
                    </span>
                  )}
                </div>
                {isOwnProfile && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-[14px] flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-white">edit</span>
                  </button>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-4xl font-headline font-extrabold tracking-tight text-white">{employee.name}</h1>
                  <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Online</span>
                  </div>
                </div>
                <p className="text-white/60 text-lg font-light">{employee.role}</p>
              </div>

              {isOwnProfile && (
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">{isEditing ? 'close' : 'edit'}</span>
                  {isEditing ? 'Cancelar' : 'Editar Perfil'}
                </button>
              )}
            </div>
          </div>

          {message.text && (
            <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} flex items-center gap-3`}>
              <span className="material-symbols-outlined">
                {message.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <p className="text-sm font-bold">{message.text}</p>
            </div>
          )}

          {/* Goals Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sales Goals */}
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">payments</span>
                  <h3 className="text-xl font-headline font-bold text-white tracking-tight">Metas de <span className="text-primary">Vendas</span></h3>
                </div>
                <div className="flex items-center gap-2">
                  {stats.salesProgress.month >= 100 && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg border border-emerald-400/20 animate-pulse">
                      META BATIDA
                    </span>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Performance</span>
                </div>
              </div>

              <div className="space-y-6">
                {/* Monthly */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/40">Mensal</span>
                    <span className="text-sm font-bold text-white">R$ {stats.currentMonthRevenue.toLocaleString('pt-BR')} / R$ {stats.monthlySalesGoal.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(151,169,255,0.3)]" style={{ width: `${stats.salesProgress.month}%` }}></div>
                  </div>
                </div>

                {/* Weekly */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/40">Semanal</span>
                    <span className="text-sm font-bold text-white">R$ {stats.weekRevenue.toLocaleString('pt-BR')} / R$ {stats.weeklySalesGoal.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary/60 rounded-full" style={{ width: `${stats.salesProgress.week}%` }}></div>
                  </div>
                </div>

                {/* Daily */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/40">Diária</span>
                    <span className="text-sm font-bold text-white">R$ {stats.todayRevenue.toLocaleString('pt-BR')} / R$ {stats.dailySalesGoal.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary/40 rounded-full" style={{ width: `${stats.salesProgress.day}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Goals */}
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">movie</span>
                  <h3 className="text-xl font-headline font-bold text-white tracking-tight">Metas de <span className="text-secondary">Vídeos</span></h3>
                </div>
                <div className="flex items-center gap-2">
                  {stats.videoProgress.month >= 100 && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg border border-emerald-400/20 animate-pulse">
                      META BATIDA
                    </span>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Produção</span>
                </div>
              </div>

              <div className="space-y-6">
                {/* Monthly */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/40">Mensal</span>
                    <span className="text-sm font-bold text-white">{stats.currentMonthVideos} / {stats.monthlyVideoGoal} vídeos</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full shadow-[0_0_15px_rgba(203,123,255,0.3)]" style={{ width: `${stats.videoProgress.month}%` }}></div>
                  </div>
                </div>

                {/* Weekly */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/40">Semanal</span>
                    <span className="text-sm font-bold text-white">{stats.weekVideos} / {stats.weeklyVideoGoal} vídeos</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary/60 rounded-full" style={{ width: `${stats.videoProgress.week}%` }}></div>
                  </div>
                </div>

                {/* Daily */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/40">Diária</span>
                    <span className="text-sm font-bold text-white">{stats.todayVideos} / {stats.dailyVideoGoal} vídeos</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary/40 rounded-full" style={{ width: `${stats.videoProgress.day}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isEditing && isOwnProfile && (
            <form onSubmit={handleSaveProfile} className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 space-y-8">
              <h3 className="text-xl font-headline font-bold text-white border-b border-white/10 pb-4">Configurações da Conta</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 font-bold">URL da Foto de Perfil</label>
                  <input 
                    type="url" 
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://exemplo.com/foto.jpg"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"
                  />
                  <p className="text-xs text-white/40 mt-2">Insira o link direto para uma imagem (JPG, PNG).</p>
                </div>

                <div className="pt-6 border-t border-white/10 space-y-6">
                  <h4 className="text-sm font-bold text-white">Alterar Senha</h4>
                  
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 font-bold">Senha Atual</label>
                    <input 
                      type="password" 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 font-bold">Nova Senha</label>
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 font-bold">Confirmar Nova Senha</label>
                      <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 flex justify-end">
                <button 
                  type="submit"
                  className="px-8 py-3 bg-secondary hover:bg-secondary/90 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors shadow-[0_0_20px_rgba(233,179,255,0.3)]"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          )}

          {/* Top Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Vendas */}
            <div className="bg-white/[0.02] border border-white/10 p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <span className="material-symbols-outlined text-sm">payments</span>
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Vendas (Total)</h3>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-headline font-bold text-white">R$ {stats.allTimeRevenue.toLocaleString('pt-BR')}</span>
              </div>
            </div>

            {/* Produção */}
            <div className="bg-white/[0.02] border border-white/10 p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                  <span className="material-symbols-outlined text-sm">movie</span>
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Vídeos (Total)</h3>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-headline font-bold text-white">{stats.allTimeVideos}</span>
                <span className="text-sm text-white/40 mb-1">entregues</span>
              </div>
            </div>

            {/* Qualidade */}
            <div className="bg-white/[0.02] border border-white/10 p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <span className="material-symbols-outlined text-sm">verified</span>
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Aprovação de Primeira</h3>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-headline font-bold text-white">{stats.qualityIndex}%</span>
              </div>
              <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-[10px] text-white/40 uppercase tracking-wider">Tempo Médio</span>
                <span className="text-xs font-bold text-white/80">{stats.avgDeliveryTime} dias</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fila de Trabalho (Now) */}
            <div className="lg:col-span-2 bg-white/[0.02] border border-white/10 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <h3 className="text-lg font-headline font-bold text-white">Fila de Trabalho Atual (Now)</h3>
              </div>
              
              {stats.currentQueue.length > 0 ? (
                <div className="space-y-4">
                  {stats.currentQueue.map(demand => (
                    <div key={demand.id} className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between group hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                          <span className="material-symbols-outlined text-white/40">movie_edit</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{demand.title}</h4>
                          <p className="text-xs text-white/40">{demand.client}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                          demand.status === 'Em Produção' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        }`}>
                          {demand.status}
                        </span>
                        <span className="text-xs text-white/40 font-mono">{demand.deadline}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                  <span className="material-symbols-outlined text-4xl text-white/20 mb-4">check_circle</span>
                  <p className="text-white/40 text-sm">Nenhuma demanda na fila atual.</p>
                </div>
              )}
            </div>

            {/* Inventário / Kanban */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8">
              <h3 className="text-lg font-headline font-bold text-white mb-8">Inventário & Projetos</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Melhores Prompts</h4>
                  <div className="space-y-3">
                    {['Cinematic B-Roll', 'UGC Hook Generator', 'Color Grading LUT'].map((prompt, i) => (
                      <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/5 flex items-center gap-3 cursor-pointer hover:border-white/20 transition-colors">
                        <span className="material-symbols-outlined text-secondary text-sm">magic_button</span>
                        <span className="text-sm text-white/80">{prompt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Kanban Ativo</h4>
                  <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="text-center">
                      <span className="block text-2xl font-bold text-white">{stats.currentQueue.length}</span>
                      <span className="text-[10px] uppercase tracking-widest text-white/40">Fazendo</span>
                    </div>
                    <div className="w-[1px] h-8 bg-white/10"></div>
                    <div className="text-center">
                      <span className="block text-2xl font-bold text-white">{stats.currentMonthVideos}</span>
                      <span className="text-[10px] uppercase tracking-widest text-white/40">Feito (Mês)</span>
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

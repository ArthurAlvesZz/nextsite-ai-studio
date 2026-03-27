import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import GlobalSearch from '../components/GlobalSearch';
import { useSales, Sale } from '../hooks/useSales';
import { useClients } from '../hooks/useClients';
import { useDemands } from '../hooks/useDemands';
import { useEmployees } from '../hooks/useEmployees';
import { useGoalSettings } from '../hooks/useGoalSettings';
import { usePresence } from '../hooks/usePresence';
import ErrorBoundary from '../components/ErrorBoundary';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { 
  subDays, 
  subMonths, 
  isAfter, 
  parse, 
  format, 
  startOfDay, 
  eachDayOfInterval,
  isSameDay,
  startOfMonth,
  endOfMonth,
  isWithinInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

type TimeFilter = 'today' | '7d' | '14d' | '1m' | '6m' | 'custom';

export default function AdminDashboard() {
  const { sales } = useSales();
  const { clients } = useClients();
  const { demands } = useDemands();
  const { teamMembers } = useEmployees();
  const { goalSettings } = useGoalSettings();
  const { onlineAdminUsers } = usePresence();
  
  // Helper to parse date from sales (format: "22 Mar, 2024")
  const parseSaleDate = (sale: Sale) => {
    if (sale.createdAt) {
      return new Date(sale.createdAt);
    }
    try {
      return parse(sale.date, "dd MMM, yyyy", new Date(), { locale: ptBR });
    } catch (e) {
      return new Date();
    }
  };

  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthSales = sales.filter(s => {
      const sDate = parseSaleDate(s);
      return s.status === 'Confirmado' && isWithinInterval(sDate, { start: monthStart, end: monthEnd });
    });

    const monthDemands = demands.filter(d => {
      if (!d.finishedAt || d.status !== 'Finalizado') return false;
      const fDate = new Date(d.finishedAt);
      return isWithinInterval(fDate, { start: monthStart, end: monthEnd });
    });

    return {
      revenue: monthSales.reduce((acc, s) => acc + s.value, 0),
      videos: monthDemands.reduce((acc, d) => acc + d.videoCount, 0)
    };
  }, [sales, demands]);

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('1m');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const [rankingType, setRankingType] = useState<'sales' | 'videos'>('sales');

  const filteredSales = useMemo(() => {
    const now = startOfDay(new Date());
    let startDate: Date;

    if (timeFilter === 'today') startDate = now;
    else if (timeFilter === '7d') startDate = subDays(now, 7);
    else if (timeFilter === '14d') startDate = subDays(now, 14);
    else if (timeFilter === '1m') startDate = subMonths(now, 1);
    else if (timeFilter === '6m') startDate = subMonths(now, 6);
    else if (timeFilter === 'custom' && customRange.start) startDate = new Date(customRange.start);
    else startDate = subMonths(now, 1);

    return sales.filter(sale => {
      const saleDate = parseSaleDate(sale);
      const isAfterStart = isAfter(saleDate, startDate) || isSameDay(saleDate, startDate);
      const matchesTime = (timeFilter === 'custom' && customRange.end) ? (isAfterStart && !isAfter(saleDate, new Date(customRange.end))) : isAfterStart;
      
      const matchesSearch = 
        sale.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.id.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTime && matchesSearch;
    });
  }, [sales, timeFilter, customRange, searchQuery]);

  const filteredClients = useMemo(() => {
    const now = startOfDay(new Date());
    let startDate: Date;

    if (timeFilter === 'today') startDate = now;
    else if (timeFilter === '7d') startDate = subDays(now, 7);
    else if (timeFilter === '14d') startDate = subDays(now, 14);
    else if (timeFilter === '1m') startDate = subMonths(now, 1);
    else if (timeFilter === '6m') startDate = subMonths(now, 6);
    else if (timeFilter === 'custom' && customRange.start) startDate = new Date(customRange.start);
    else startDate = subMonths(now, 1);

    return clients.filter(client => {
      const clientDate = new Date(client.createdAt);
      const isAfterStart = isAfter(clientDate, startDate) || isSameDay(clientDate, startDate);
      const matchesTime = (timeFilter === 'custom' && customRange.end) ? (isAfterStart && !isAfter(clientDate, new Date(customRange.end))) : isAfterStart;
      
      const matchesSearch = 
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTime && matchesSearch;
    });
  }, [clients, timeFilter, customRange, searchQuery]);

  const filteredDemands = useMemo(() => {
    const now = startOfDay(new Date());
    let startDate: Date;

    if (timeFilter === 'today') startDate = now;
    else if (timeFilter === '7d') startDate = subDays(now, 7);
    else if (timeFilter === '14d') startDate = subDays(now, 14);
    else if (timeFilter === '1m') startDate = subMonths(now, 1);
    else if (timeFilter === '6m') startDate = subMonths(now, 6);
    else if (timeFilter === 'custom' && customRange.start) startDate = new Date(customRange.start);
    else startDate = subMonths(now, 1);

    return demands.filter(d => {
      const demandDate = d.finishedAt ? new Date(d.finishedAt) : new Date(d.createdAt);
      const isAfterStart = isAfter(demandDate, startDate) || isSameDay(demandDate, startDate);
      const matchesTime = (timeFilter === 'custom' && customRange.end) ? (isAfterStart && !isAfter(demandDate, new Date(customRange.end))) : isAfterStart;

      const matchesSearch = 
        d.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.id.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTime && matchesSearch;
    });
  }, [demands, searchQuery, timeFilter, customRange]);

  const stats = useMemo(() => {
    const confirmedSales = filteredSales.filter(s => s.status === 'Confirmado');
    const mrr = confirmedSales.reduce((acc, s) => acc + s.value, 0);
    const newClients = filteredClients.length;
    const activeClients = filteredClients.filter(c => c.status === 'Ativo').length;
    
    // Videos delivered (Finalizado)
    const deliveredVideos = filteredDemands
      .filter(d => d.status === 'Finalizado')
      .reduce((acc, d) => acc + d.videoCount, 0);

    // Churn calculation (mock logic for now as we don't have churn data)
    const churn = 2.1; 

    // Average Delivery Time
    const finishedDemands = filteredDemands.filter(d => d.status === 'Finalizado' && d.finishedAt);
    let totalDeliveryTime = 0;
    let validDeliveryCount = 0;

    finishedDemands.forEach(demand => {
      const sale = sales.find(s => s.id === demand.saleId);
      if (sale) {
        const saleDate = parseSaleDate(sale);
        const finishDate = new Date(demand.finishedAt!);
        const diffTime = Math.abs(finishDate.getTime() - saleDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalDeliveryTime += diffDays;
        validDeliveryCount++;
      }
    });

    const avgDeliveryTime = validDeliveryCount > 0 ? Math.round(totalDeliveryTime / validDeliveryCount) : 0;

    return { mrr, newClients, activeClients, deliveredVideos, avgDeliveryTime };
  }, [filteredSales, filteredDemands, sales, filteredClients]);

  const chartData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    if (timeFilter === 'today') startDate = startOfDay(now);
    else if (timeFilter === '7d') startDate = subDays(now, 6);
    else if (timeFilter === '14d') startDate = subDays(now, 13);
    else if (timeFilter === '1m') startDate = subMonths(now, 1);
    else startDate = subMonths(now, 1);

    const days = eachDayOfInterval({ start: startDate, end: now });

    return days.map(day => {
      const daySales = sales.filter(s => {
        const sDate = parseSaleDate(s);
        return isSameDay(sDate, day) && s.status === 'Confirmado';
      });
      return {
        name: format(day, 'dd/MM'),
        value: daySales.reduce((acc, s) => acc + s.value, 0)
      };
    });
  }, [sales, timeFilter]);

  const ranking = useMemo(() => {
    const currentMonthKey = format(new Date(), 'yyyy-MM');
    
    if (rankingType === 'sales') {
      const ranking: Record<string, { id: string, name: string, total: number, count: number, individualGoal: number, isGoalReached: boolean }> = {};
      
      filteredSales.filter(s => s.status === 'Confirmado').forEach(sale => {
        if (!ranking[sale.sellerId]) {
          const member = teamMembers.find(m => m.id === sale.sellerId);
          const individualGoal = goalSettings.months[currentMonthKey]?.individualGoals?.[sale.sellerId]?.sales ?? member?.monthlySalesGoal ?? 50000;
          ranking[sale.sellerId] = { id: sale.sellerId, name: sale.sellerName, total: 0, count: 0, individualGoal, isGoalReached: false };
        }
        ranking[sale.sellerId].total += sale.value;
        ranking[sale.sellerId].count += 1;
        ranking[sale.sellerId].isGoalReached = ranking[sale.sellerId].total >= ranking[sale.sellerId].individualGoal;
      });

      return Object.values(ranking).sort((a, b) => b.total - a.total);
    } else {
      const ranking: Record<string, { id: string, name: string, total: number, count: number, individualGoal: number, isGoalReached: boolean }> = {};
      
      filteredDemands.filter(d => d.status === 'Finalizado').forEach(demand => {
        const editorId = demand.assignedTo || 'unknown';
        const editorName = demand.assignedToName || 'Não Atribuído';
        
        if (!ranking[editorId]) {
          const member = teamMembers.find(m => m.id === editorId);
          const individualGoal = goalSettings.months[currentMonthKey]?.individualGoals?.[editorId]?.videos ?? member?.monthlyVideoGoal ?? 100;
          ranking[editorId] = { id: editorId, name: editorName, total: 0, count: 0, individualGoal, isGoalReached: false };
        }
        ranking[editorId].total += demand.videoCount;
        ranking[editorId].count += 1;
        ranking[editorId].isGoalReached = ranking[editorId].total >= ranking[editorId].individualGoal;
      });

      return Object.values(ranking).sort((a, b) => b.total - a.total);
    }
  }, [filteredSales, filteredDemands, rankingType, teamMembers, goalSettings]);

  return (
    <ErrorBoundary>
      <div className="font-body text-on-background min-h-screen flex bg-[#050505] overflow-hidden selection:bg-primary/30">
      {/* Background from Home */}
      <div className="fixed inset-0 w-full h-full -z-10 bg-[#050505] overflow-hidden">
        <div className="absolute inset-0 w-full h-full opacity-1 bg-gradient-to-b from-[#020202] to-transparent">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.05),transparent_60%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(153,0,255,0.05),transparent_40%)]"></div>
        </div>
      </div>

      <AdminSidebar activePage="dashboard" />

      {/* Main Content Area */}
      <main className="ml-64 flex-1 min-h-screen relative">
        {/* Top Bar */}
        <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-24 z-40 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/10 flex justify-between items-center px-10">
          <GlobalSearch />
          <div className="flex items-center gap-6">
            <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
              {(['today', '7d', '14d', '1m', '6m'] as TimeFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setTimeFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                    timeFilter === f 
                      ? 'bg-secondary text-on-secondary shadow-lg' 
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  {f === 'today' ? 'Hoje' : f === '7d' ? '7 Dias' : f === '14d' ? '14 Dias' : f === '1m' ? '1 Mês' : '6 Meses'}
                </button>
              ))}
              <button
                onClick={() => setTimeFilter('custom')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  timeFilter === 'custom' 
                    ? 'bg-secondary text-on-secondary shadow-lg' 
                    : 'text-white/40 hover:text-white'
                }`}
              >
                Personalizado
              </button>
            </div>
            
            <div className="h-8 w-[1px] bg-white/10"></div>
          </div>
        </header>

        {/* Scrollable Canvas */}
        <div className="pt-32 pb-12 px-10 max-w-7xl mx-auto space-y-12">
          {/* Custom Range Inputs */}
          {timeFilter === 'custom' && (
            <div className="flex gap-4 bg-white/[0.02] border border-white/10 p-4 rounded-2xl animate-in fade-in slide-in-from-top-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Início</label>
                <input 
                  type="date" 
                  value={customRange.start}
                  onChange={(e) => setCustomRange({...customRange, start: e.target.value})}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-secondary transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Fim</label>
                <input 
                  type="date" 
                  value={customRange.end}
                  onChange={(e) => setCustomRange({...customRange, end: e.target.value})}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-secondary transition-all"
                />
              </div>
            </div>
          )}

          {/* Hero Header */}
          <div className="space-y-3">
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter text-white">
              Dashboard <span className="font-serif italic text-secondary font-light">Geral</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl font-light leading-relaxed">
              Análise de performance e fluxo de produção criativa da Next Creatives.
            </p>
          </div>

          {/* Metrics Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl space-y-4 hover:border-white/20 hover:bg-white/[0.04] transition-all group">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 group-hover:bg-primary/20 transition-colors">
                  <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
                </div>
              </div>
              <div>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Receita no Período</p>
                <h3 className="text-3xl font-headline font-extrabold text-white tracking-tight">R$ {stats.mrr.toLocaleString('pt-BR')}</h3>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl space-y-4 hover:border-white/20 hover:bg-white/[0.04] transition-all group">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-secondary/10 rounded-xl border border-secondary/20 group-hover:bg-secondary/20 transition-colors">
                  <span className="material-symbols-outlined text-secondary">person_add</span>
                </div>
              </div>
              <div>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Novos Clientes</p>
                <h3 className="text-3xl font-headline font-extrabold text-white tracking-tight">{stats.newClients}</h3>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl space-y-4 hover:border-white/20 hover:bg-white/[0.04] transition-all group">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                  <span className="material-symbols-outlined text-blue-400">group</span>
                </div>
              </div>
              <div>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Clientes Ativos</p>
                <h3 className="text-3xl font-headline font-extrabold text-white tracking-tight">{stats.activeClients}</h3>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl space-y-4 hover:border-white/20 hover:bg-white/[0.04] transition-all group">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 group-hover:bg-white/10 transition-colors">
                  <span className="material-symbols-outlined text-white/80">movie</span>
                </div>
              </div>
              <div>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Vídeos Entregues</p>
                <h3 className="text-3xl font-headline font-extrabold text-white tracking-tight">{stats.deliveredVideos}</h3>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl space-y-4 hover:border-white/20 hover:bg-white/[0.04] transition-all group">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                  <span className="material-symbols-outlined text-emerald-400">timer</span>
                </div>
              </div>
              <div>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Tempo Médio de Entrega</p>
                <h3 className="text-3xl font-headline font-extrabold text-white tracking-tight">{stats.avgDeliveryTime} <span className="text-lg text-white/40 font-light">dias</span></h3>
              </div>
            </div>

            {/* Online Users Card */}
            <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl space-y-4 hover:border-white/20 hover:bg-white/[0.04] transition-all group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-50"></div>
              <div className="flex justify-between items-start relative z-10">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors relative">
                  <span className="material-symbols-outlined text-emerald-400">public</span>
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full"></span>
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Usuários Online</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-headline font-extrabold text-white tracking-tight">{onlineAdminUsers}</h3>
                  <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest animate-pulse">Agora</span>
                </div>
              </div>
              
              {/* Decorative background glow */}
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none"></div>
            </div>
          </div>

          {/* Goal Progress Card */}
          <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 rounded-2xl hover:border-white/20 hover:bg-white/[0.04] transition-all group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary/10 rounded-2xl border border-secondary/20">
                  <span className="material-symbols-outlined text-secondary">target</span>
                </div>
                <div>
                  <h3 className="text-xl font-headline font-bold text-white tracking-tight">Progresso das Metas</h3>
                  <p className="text-white/40 text-xs font-light uppercase tracking-widest">Mês de {format(new Date(), 'MMMM', { locale: ptBR })}</p>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Sales Goal */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Meta de Vendas</p>
                    {(() => {
                      const currentMonthKey = new Date().toISOString().substring(0, 7);
                      const monthGoal = goalSettings.months[currentMonthKey]?.totalMonthlySalesGoal || 200000;
                      const progress = Math.min(Math.round((currentMonthStats.revenue / monthGoal) * 100), 100);
                      return (
                        <p className="text-sm font-headline font-bold text-white">
                          {progress}% <span className="text-white/20 font-normal ml-1">/ R$ {monthGoal.toLocaleString('pt-BR')}</span>
                        </p>
                      );
                    })()}
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    {(() => {
                      const currentMonthKey = new Date().toISOString().substring(0, 7);
                      const monthGoal = goalSettings.months[currentMonthKey]?.totalMonthlySalesGoal || 200000;
                      const progress = Math.min(Math.round((currentMonthStats.revenue / monthGoal) * 100), 100);
                      return (
                        <div 
                          className="bg-secondary h-full shadow-[0_0_15px_rgba(203,123,255,0.4)] transition-all duration-1000" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      );
                    })()}
                  </div>
                </div>

                {/* Video Goal */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Meta de Vídeos</p>
                    {(() => {
                      const currentMonthKey = new Date().toISOString().substring(0, 7);
                      const monthGoal = goalSettings.months[currentMonthKey]?.totalMonthlyVideoGoal || 500;
                      const progress = Math.min(Math.round((currentMonthStats.videos / monthGoal) * 100), 100);
                      return (
                        <p className="text-sm font-headline font-bold text-white">
                          {progress}% <span className="text-white/20 font-normal ml-1">/ {monthGoal.toLocaleString('pt-BR')} vídeos</span>
                        </p>
                      );
                    })()}
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    {(() => {
                      const currentMonthKey = new Date().toISOString().substring(0, 7);
                      const monthGoal = goalSettings.months[currentMonthKey]?.totalMonthlyVideoGoal || 500;
                      const progress = Math.min(Math.round((currentMonthStats.videos / monthGoal) * 100), 100);
                      return (
                        <div 
                          className="bg-primary h-full shadow-[0_0_15px_rgba(151,169,255,0.4)] transition-all duration-1000" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Flux Chart Section */}
            <div className="lg:col-span-2 bg-white/[0.02] border border-white/10 backdrop-blur-xl rounded-2xl p-10 overflow-hidden relative">
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h4 className="text-2xl font-headline font-bold text-white tracking-tight mb-1">Fluxo de Receita</h4>
                  <p className="text-white/40 text-sm font-light">Dados reais baseados nas vendas confirmadas</p>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#cb7bff" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#cb7bff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 'bold' }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 'bold' }}
                      tickFormatter={(value) => `R$ ${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#cb7bff', fontSize: '12px', fontWeight: 'bold' }}
                      labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}
                      formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#cb7bff" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ranking Section */}
            <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl rounded-2xl p-8 flex flex-col">
              <div className="mb-8 flex justify-between items-start">
                <div>
                  <h4 className="text-xl font-headline font-bold text-white tracking-tight mb-1">Ranking</h4>
                  <p className="text-white/40 text-xs font-light uppercase tracking-widest">Performance por {rankingType === 'sales' ? 'Vendedor' : 'Editor'}</p>
                </div>
                <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                  <button 
                    onClick={() => setRankingType('sales')}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${rankingType === 'sales' ? 'bg-secondary text-on-secondary' : 'text-white/40 hover:text-white'}`}
                  >
                    Vendas
                  </button>
                  <button 
                    onClick={() => setRankingType('videos')}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${rankingType === 'videos' ? 'bg-secondary text-on-secondary' : 'text-white/40 hover:text-white'}`}
                  >
                    Vídeos
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                {ranking.length > 0 ? (
                  ranking.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 group">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-headline font-bold text-sm ${
                        index === 0 ? 'bg-secondary text-on-secondary shadow-[0_0_15px_rgba(203,123,255,0.4)]' : 
                        index === 1 ? 'bg-primary text-on-primary shadow-[0_0_15px_rgba(151,169,255,0.4)]' :
                        'bg-white/5 text-white/40 border border-white/10'
                      }`}>
                        {index + 1}º
                      </div>
                      <div className="flex-1">
                        <Link to={`/admin/team/${item.id}`} className="text-sm font-headline font-bold text-white hover:text-secondary transition-colors block">{item.name}</Link>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
                            {rankingType === 'sales' ? `${item.count} Vendas` : `${item.count} Projetos`}
                          </p>
                          <div className="flex flex-col items-end">
                            <p className="text-xs font-headline font-bold text-secondary">
                              {rankingType === 'sales' ? `R$ ${item.total.toLocaleString('pt-BR')}` : `${item.total} Vídeos`}
                            </p>
                            {item.isGoalReached && (
                              <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest mt-0.5">Meta batida</p>
                            )}
                          </div>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full mt-2 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${index === 0 ? 'bg-secondary' : 'bg-primary'}`}
                            style={{ width: `${(item.total / (ranking[0]?.total || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                    <span className="material-symbols-outlined text-4xl">leaderboard</span>
                    <p className="text-xs uppercase tracking-widest font-bold">Sem dados no período</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
    </ErrorBoundary>
  );
}

import React, { useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import GlobalSearch from '../components/GlobalSearch';
import { motion, AnimatePresence } from 'motion/react';
import { useDemands, VideoDemand } from '../hooks/useDemands';
import { useClients } from '../hooks/useClients';
import { useEmployees } from '../hooks/useEmployees';
import { useSales } from '../hooks/useSales';

export default function AdminVideos() {
  const { demands, addDemand, updateDemand, deleteDemand } = useDemands();
  const { clients } = useClients();
  const { teamMembers } = useEmployees();
  const { sales, updateSale } = useSales();
  
  const [selectedVideo, setSelectedVideo] = useState<VideoDemand | null>(null);
  const [isNewDemandModalOpen, setIsNewDemandModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [finalizeVideoUrl, setFinalizeVideoUrl] = useState('');
  const [pendingMove, setPendingMove] = useState<{ id: string, status: string } | null>(null);
  const [focusedDemands, setFocusedDemands] = useState<Record<string, string | null>>({});
  const [selectedSaleId, setSelectedSaleId] = useState('');
  
  // Filter States
  const [hasInteracted, setHasInteracted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterNiche, setFilterNiche] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filteredDemands = demands.filter(demand => {
    if (!hasInteracted) return false;

    const matchesSearch = demand.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         demand.client.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClient = !filterClient || demand.clientId === filterClient;
    const matchesPlan = !filterPlan || demand.plan === filterPlan;
    const matchesNiche = !filterNiche || demand.niche.toLowerCase().includes(filterNiche.toLowerCase());
    const matchesType = !filterType || demand.type.toLowerCase().includes(filterType.toLowerCase());
    const matchesStatus = !filterStatus || demand.status === filterStatus;

    return matchesSearch && matchesClient && matchesPlan && matchesNiche && matchesType && matchesStatus;
  });

  const uniqueNiches = Array.from(new Set(demands.map(d => d.niche))).filter(Boolean);
  const uniqueTypes = Array.from(new Set(demands.map(d => d.type))).filter(Boolean);

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setHasInteracted(true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterClient('');
    setFilterPlan('');
    setFilterNiche('');
    setFilterType('');
    setFilterStatus('');
    setHasInteracted(false);
  };

  const [newDemandData, setNewDemandData] = useState<Omit<VideoDemand, 'id' | 'createdAt'>>({
    client: '',
    clientId: '',
    saleId: '',
    title: '',
    deadline: '',
    priority: 'Média',
    status: 'Aberto',
    videoCount: 1,
    niche: '',
    type: '',
    description: '',
    plan: 'Starter'
  });

  const columns = [
    { id: 'Aberto', title: 'Demanda Aberta', color: 'bg-blue-400', shadow: 'shadow-[0_0_15px_rgba(96,165,250,0.3)]' },
    { id: 'Em Produção', title: 'Em Produção', color: 'bg-secondary', shadow: 'shadow-[0_0_15px_rgba(203,123,255,0.3)]' },
    { id: 'Revisão', title: 'Em Revisão', color: 'bg-orange-400', shadow: 'shadow-[0_0_15px_rgba(251,146,60,0.3)]' },
    { id: 'Finalizado', title: 'Finalizada', color: 'bg-emerald-400', shadow: 'shadow-[0_0_15px_rgba(52,211,153,0.3)]' },
  ];

  const handleMove = (id: string, newStatus: any) => {
    const demand = demands.find(d => d.id === id);
    
    // Enforce employee assignment if moving out of 'Aberto' and no one is assigned
    if (newStatus !== 'Aberto' && demand && !demand.assignedTo) {
      setPendingMove({ id, status: newStatus });
      setIsEmployeeModalOpen(true);
      return;
    }

    const updates: Partial<VideoDemand> = { status: newStatus };
    
    // Trigger finalize modal if moving to 'Finalizado'
    if (newStatus === 'Finalizado') {
      setPendingMove({ id, status: newStatus });
      setIsFinalizeModalOpen(true);
      return;
    }

    // Increment revision count if moving from Revisão back to Em Produção
    if (demand?.status === 'Revisão' && newStatus === 'Em Produção') {
      updates.revisionCount = (demand.revisionCount || 0) + 1;
    }

    updateDemand(id, updates);
    // Clear focus if the focused card moves
    setFocusedDemands(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(status => {
        if (next[status] === id) next[status] = null;
      });
      return next;
    });
    if (selectedVideo?.id === id) {
      setSelectedVideo(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleToggleFocus = (id: string, status: string) => {
    setFocusedDemands(prev => ({
      ...prev,
      [status]: prev[status] === id ? null : id
    }));
  };

  const handleNextPhase = (id: string, currentStatus: string) => {
    const phaseOrder = ['Aberto', 'Em Produção', 'Revisão', 'Finalizado'];
    const currentIndex = phaseOrder.indexOf(currentStatus);
    if (currentIndex < phaseOrder.length - 1) {
      handleMove(id, phaseOrder[currentIndex + 1]);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja deletar esta demanda?')) {
      deleteDemand(id);
      if (selectedVideo?.id === id) {
        setSelectedVideo(null);
      }
    }
  };

  const handleAssignEmployee = (employeeId: string) => {
    if (!pendingMove) return;
    
    const employee = teamMembers.find(m => m.id === employeeId);
    if (employee) {
      updateDemand(pendingMove.id, { 
        status: pendingMove.status as any,
        assignedTo: employee.id,
        assignedToName: employee.name
      });
      setIsEmployeeModalOpen(false);
      setPendingMove(null);
    }
  };

  const handleFinalizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingMove) return;

    updateDemand(pendingMove.id, { 
      status: 'Finalizado' as any,
      videoUrl: finalizeVideoUrl
    });

    setIsFinalizeModalOpen(false);
    setFinalizeVideoUrl('');
    setPendingMove(null);
    if (selectedVideo?.id === pendingMove.id) {
      setSelectedVideo(prev => prev ? { ...prev, status: 'Finalizado', videoUrl: finalizeVideoUrl } : null);
    }
  };

  const handleCreateDemand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleId) {
      alert('Por favor, selecione uma venda confirmada para vincular a esta demanda.');
      return;
    }

    const sale = sales.find(s => s.id === selectedSaleId);
    if (!sale) return;

    addDemand({
      ...newDemandData,
      client: sale.clientName,
      clientId: sale.clientId,
      saleId: sale.id,
      plan: sale.plan as any
    });

    // Mark sale as having a demand
    updateSale(sale.id, { hasDemand: true });

    setIsNewDemandModalOpen(false);
    setSelectedSaleId('');
    setNewDemandData({
      client: '',
      clientId: '',
      saleId: '',
      title: '',
      deadline: '',
      priority: 'Média',
      status: 'Aberto',
      videoCount: 1,
      niche: '',
      type: '',
      description: '',
      plan: 'Starter'
    });
  };

  const availableSales = sales.filter(s => s.status === 'Confirmado' && !s.hasDemand);

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setNewDemandData(prev => ({
        ...prev,
        clientId: client.id,
        client: client.name,
        niche: client.niche // Auto-fill niche from client
      }));
    }
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

      <AdminSidebar activePage="videos" />

      {/* Main Content Area */}
      <main className="ml-64 flex-1 min-h-screen relative flex flex-col">
        {/* Top Bar */}
        <header className="h-24 z-40 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/10 flex justify-between items-center px-10 shrink-0">
          <div className="flex items-center gap-6">
            <GlobalSearch />
            <h2 className="text-2xl font-headline font-bold text-white tracking-tight hidden lg:block">
              Video <span className="font-serif italic text-secondary font-light">Control</span>
            </h2>
          </div>
          <div className="flex items-center gap-6">
            {/* Status Overview Hover Button */}
            <div className="relative group">
              <button 
                onClick={clearFilters}
                className="bg-white/5 text-white/60 border border-white/10 px-6 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">analytics</span>
                Visão Geral
                <span className="material-symbols-outlined text-xs group-hover:rotate-180 transition-transform">expand_more</span>
              </button>
              
              {/* Hover Dropdown */}
              <div className="absolute top-full right-0 mt-2 w-72 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                <div className="p-4 border-b border-white/5">
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Resumo de Status</p>
                </div>
                <div className="p-2 space-y-1">
                  {columns.map(col => (
                    <button 
                      key={col.id} 
                      onClick={() => handleFilterChange(setFilterStatus, col.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                        filterStatus === col.id ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${col.color} ${col.shadow}`}></div>
                        <span className="text-[11px] font-bold">{col.title}</span>
                      </div>
                      <span className="text-xs font-bold">{demands.filter(d => d.status === col.id).length}</span>
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => handleFilterChange(setFilterStatus, '')}
                  className="w-full p-3 bg-white/5 border-t border-white/5 hover:bg-white/10 transition-all text-left"
                >
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-white/40">Total Geral</span>
                    <span className="text-secondary">{demands.length}</span>
                  </div>
                </button>
              </div>
            </div>

            <button 
              onClick={() => setIsNewDemandModalOpen(true)}
              className="bg-secondary/10 text-secondary border border-secondary/20 px-6 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-secondary hover:text-white transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Nova Demanda
            </button>
            <div className="h-8 w-[1px] bg-white/10"></div>
          </div>
        </header>

        {/* Filter Bar */}
        <div className="px-10 py-8 bg-[#0a0a0a]/60 border-b border-white/10 backdrop-blur-3xl sticky top-24 z-30">
          <div className="flex flex-col gap-8 max-w-7xl mx-auto">
            <div className="flex items-center gap-6">
              <div className="relative flex-1 group">
                <div className={`absolute inset-0 bg-secondary/20 blur-xl rounded-2xl transition-opacity duration-500 ${searchQuery ? 'opacity-100' : 'opacity-0'}`}></div>
                <span className={`material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${searchQuery ? 'text-secondary' : 'text-white/20'}`}>search</span>
                <input 
                  type="text" 
                  placeholder="Pesquisar por título ou cliente..."
                  value={searchQuery}
                  onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                  className={`w-full bg-white/[0.03] border rounded-2xl py-4 pl-14 pr-6 text-sm transition-all text-white outline-none placeholder:text-white/20 relative z-10 ${
                    searchQuery ? 'border-secondary/50 bg-secondary/5 ring-1 ring-secondary/20' : 'border-white/10 focus:border-white/30'
                  }`}
                />
              </div>
              <button 
                onClick={clearFilters}
                className="px-8 py-4 rounded-2xl border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 transition-all flex items-center gap-3 shrink-0"
              >
                <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                Limpar Filtros
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
              <div className="relative">
                <select 
                  value={filterClient}
                  onChange={(e) => handleFilterChange(setFilterClient, e.target.value)}
                  className={`w-full appearance-none bg-white/[0.03] border rounded-xl py-3 px-5 text-[10px] font-bold uppercase tracking-widest outline-none transition-all cursor-pointer hover:bg-white/5 ${
                    filterClient ? 'border-primary/50 text-primary bg-primary/5' : 'border-white/10 text-white/60'
                  }`}
                >
                  <option value="" className="bg-[#0a0a0a]">Cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id} className="bg-[#0a0a0a]">{c.name}</option>)}
                </select>
                <span className={`material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-xs pointer-events-none ${filterClient ? 'text-primary' : 'text-white/20'}`}>expand_more</span>
              </div>

              <div className="relative">
                <select 
                  value={filterPlan}
                  onChange={(e) => handleFilterChange(setFilterPlan, e.target.value)}
                  className={`w-full appearance-none bg-white/[0.03] border rounded-xl py-3 px-5 text-[10px] font-bold uppercase tracking-widest outline-none transition-all cursor-pointer hover:bg-white/5 ${
                    filterPlan ? 'border-emerald-400/50 text-emerald-400 bg-emerald-400/5' : 'border-white/10 text-white/60'
                  }`}
                >
                  <option value="" className="bg-[#0a0a0a]">Plano</option>
                  <option value="Starter" className="bg-[#0a0a0a]">Starter</option>
                  <option value="Growth" className="bg-[#0a0a0a]">Growth</option>
                  <option value="Scale" className="bg-[#0a0a0a]">Scale</option>
                </select>
                <span className={`material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-xs pointer-events-none ${filterPlan ? 'text-emerald-400' : 'text-white/20'}`}>expand_more</span>
              </div>

              <div className="relative">
                <select 
                  value={filterNiche}
                  onChange={(e) => handleFilterChange(setFilterNiche, e.target.value)}
                  className={`w-full appearance-none bg-white/[0.03] border rounded-xl py-3 px-5 text-[10px] font-bold uppercase tracking-widest outline-none transition-all cursor-pointer hover:bg-white/5 ${
                    filterNiche ? 'border-orange-400/50 text-orange-400 bg-orange-400/5' : 'border-white/10 text-white/60'
                  }`}
                >
                  <option value="" className="bg-[#0a0a0a]">Nicho</option>
                  {uniqueNiches.map(n => <option key={n} value={n} className="bg-[#0a0a0a]">{n}</option>)}
                </select>
                <span className={`material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-xs pointer-events-none ${filterNiche ? 'text-orange-400' : 'text-white/20'}`}>expand_more</span>
              </div>

              <div className="relative">
                <select 
                  value={filterType}
                  onChange={(e) => handleFilterChange(setFilterType, e.target.value)}
                  className={`w-full appearance-none bg-white/[0.03] border rounded-xl py-3 px-5 text-[10px] font-bold uppercase tracking-widest outline-none transition-all cursor-pointer hover:bg-white/5 ${
                    filterType ? 'border-blue-400/50 text-blue-400 bg-blue-400/5' : 'border-white/10 text-white/60'
                  }`}
                >
                  <option value="" className="bg-[#0a0a0a]">Tipo</option>
                  {uniqueTypes.map(t => <option key={t} value={t} className="bg-[#0a0a0a]">{t}</option>)}
                </select>
                <span className={`material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-xs pointer-events-none ${filterType ? 'text-blue-400' : 'text-white/20'}`}>expand_more</span>
              </div>

              <div className="relative">
                <select 
                  value={filterStatus}
                  onChange={(e) => handleFilterChange(setFilterStatus, e.target.value)}
                  className={`w-full appearance-none bg-white/[0.03] border rounded-xl py-3 px-5 text-[10px] font-bold uppercase tracking-widest outline-none transition-all cursor-pointer hover:bg-white/5 ${
                    filterStatus ? 'border-secondary/50 text-secondary bg-secondary/5' : 'border-white/10 text-white/60'
                  }`}
                >
                  <option value="" className="bg-[#0a0a0a]">Status</option>
                  {columns.map(c => <option key={c.id} value={c.id} className="bg-[#0a0a0a]">{c.title}</option>)}
                </select>
                <span className={`material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-xs pointer-events-none ${filterStatus ? 'text-secondary' : 'text-white/20'}`}>expand_more</span>
              </div>
            </div>
          </div>
        </div>

        {/* Kanban Board or Search Results */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {!hasInteracted ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
              <div className="relative">
                <div className="absolute inset-0 bg-secondary/20 blur-[100px] rounded-full"></div>
                <div className="w-32 h-32 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center backdrop-blur-3xl relative z-10">
                  <span className="material-symbols-outlined text-5xl text-white/10 animate-pulse">search_insights</span>
                </div>
              </div>
              <div className="space-y-3 relative z-10">
                <h3 className="text-3xl font-headline font-bold text-white tracking-tight">O que vamos <span className="font-serif italic text-secondary font-light">encontrar hoje?</span></h3>
                <p className="text-white/30 text-base max-w-md mx-auto font-light leading-relaxed">Inicie sua busca utilizando a barra de filtros acima para localizar demandas específicas em tempo real.</p>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-8 bg-secondary rounded-full"></div>
                  <h3 className="text-2xl font-headline font-bold text-white tracking-tight">
                    Resultados da <span className="font-serif italic text-secondary font-light">Busca</span>
                  </h3>
                </div>
                <div className="bg-white/5 border border-white/10 px-6 py-2 rounded-full">
                  <span className="text-xs font-bold text-white/40 uppercase tracking-widest">
                    <span className="text-secondary">{filteredDemands.length}</span> {filteredDemands.length === 1 ? 'Demanda encontrada' : 'Demandas encontradas'}
                  </span>
                </div>
              </div>

              {filteredDemands.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {filteredDemands.map(video => (
                    <VideoCard 
                      key={video.id}
                      id={video.id}
                      client={video.client}
                      title={video.title}
                      deadline={video.deadline}
                      priority={video.priority}
                      status={video.status}
                      videoCount={video.videoCount}
                      niche={video.niche}
                      type={video.type}
                      description={video.description}
                      plan={video.plan as any}
                      assignedToName={video.assignedToName}
                      onMove={handleMove}
                      onNextPhase={() => handleNextPhase(video.id, video.status)}
                      onDelete={handleDelete}
                      onClick={() => {}} // No focus mode in search results
                      onViewDetails={() => setSelectedVideo(video as any)}
                    />
                  ))}
                </div>
              ) : (
                <div className="h-96 border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center gap-6 bg-white/[0.01]">
                  <span className="material-symbols-outlined text-6xl text-white/5">sentiment_dissatisfied</span>
                  <div className="text-center">
                    <p className="text-lg font-bold text-white/20 uppercase tracking-widest">Nenhum resultado encontrado</p>
                    <p className="text-sm text-white/10 font-light mt-2">Tente ajustar seus filtros ou limpar a busca.</p>
                  </div>
                  <button 
                    onClick={clearFilters}
                    className="mt-4 px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all"
                  >
                    Limpar Tudo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* New Demand Modal */}
      <AnimatePresence>
        {isNewDemandModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-secondary/10 to-transparent">
                <h2 className="text-2xl font-headline font-bold text-white tracking-tight">Criar <span className="font-serif italic text-secondary font-light">Nova Demanda</span></h2>
                <button 
                  onClick={() => setIsNewDemandModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateDemand} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {/* Sale Selection - MANDATORY LINKAGE */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Venda Vinculada (Obrigatório)</label>
                  <select 
                    required
                    value={selectedSaleId}
                    onChange={(e) => setSelectedSaleId(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-5 text-sm focus:ring-1 focus:ring-secondary/50 focus:border-secondary/50 transition-all text-white outline-none"
                  >
                    <option value="" className="bg-[#0a0a0a]">Selecione uma venda confirmada...</option>
                    {availableSales.map(sale => (
                      <option key={sale.id} value={sale.id} className="bg-[#0a0a0a]">
                        {sale.id} - {sale.clientName} ({sale.plan})
                      </option>
                    ))}
                  </select>
                  {availableSales.length === 0 && (
                    <p className="text-[10px] text-amber-400/60 mt-2 ml-1 italic">Nenhuma venda confirmada sem demanda disponível. Registre uma venda primeiro.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Título da Demanda</label>
                    <input 
                      required
                      type="text"
                      placeholder="Ex: Criativo Lançamento V1"
                      value={newDemandData.title}
                      onChange={(e) => setNewDemandData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-5 text-sm focus:ring-1 focus:ring-secondary/50 focus:border-secondary/50 transition-all text-white outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Prazo de Entrega</label>
                    <input 
                      required
                      type="date"
                      value={newDemandData.deadline}
                      onChange={(e) => setNewDemandData(prev => ({ ...prev, deadline: e.target.value }))}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-5 text-sm focus:ring-1 focus:ring-secondary/50 focus:border-secondary/50 transition-all text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Prioridade</label>
                    <select 
                      value={newDemandData.priority}
                      onChange={(e) => setNewDemandData(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-5 text-sm focus:ring-1 focus:ring-secondary/50 focus:border-secondary/50 transition-all text-white outline-none"
                    >
                      <option value="Baixa" className="bg-[#0a0a0a]">Baixa</option>
                      <option value="Média" className="bg-[#0a0a0a]">Média</option>
                      <option value="Alta" className="bg-[#0a0a0a]">Alta</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Plano</label>
                    <select 
                      value={newDemandData.plan}
                      onChange={(e) => setNewDemandData(prev => ({ ...prev, plan: e.target.value as any }))}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-5 text-sm focus:ring-1 focus:ring-secondary/50 focus:border-secondary/50 transition-all text-white outline-none"
                    >
                      <option value="Starter" className="bg-[#0a0a0a]">Starter</option>
                      <option value="Growth" className="bg-[#0a0a0a]">Growth</option>
                      <option value="Scale" className="bg-[#0a0a0a]">Scale</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Qtd. Vídeos</label>
                    <input 
                      required
                      type="number"
                      min="1"
                      value={newDemandData.videoCount}
                      onChange={(e) => setNewDemandData(prev => ({ ...prev, videoCount: parseInt(e.target.value) }))}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-5 text-sm focus:ring-1 focus:ring-secondary/50 focus:border-secondary/50 transition-all text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Nicho</label>
                    <input 
                      required
                      type="text"
                      placeholder="Ex: E-commerce"
                      value={newDemandData.niche}
                      onChange={(e) => setNewDemandData(prev => ({ ...prev, niche: e.target.value }))}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-5 text-sm focus:ring-1 focus:ring-secondary/50 focus:border-secondary/50 transition-all text-white outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Tipo de Vídeo</label>
                    <input 
                      required
                      type="text"
                      placeholder="Ex: UGC / Criativo"
                      value={newDemandData.type}
                      onChange={(e) => setNewDemandData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-5 text-sm focus:ring-1 focus:ring-secondary/50 focus:border-secondary/50 transition-all text-white outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Briefing / Descrição</label>
                  <textarea 
                    required
                    rows={4}
                    placeholder="Descreva os detalhes da demanda..."
                    value={newDemandData.description}
                    onChange={(e) => setNewDemandData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-5 text-sm focus:ring-1 focus:ring-secondary/50 focus:border-secondary/50 transition-all text-white outline-none resize-none"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-secondary to-primary text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-xs hover:shadow-[0_0_30px_rgba(203,123,255,0.4)] transition-all active:scale-[0.98]"
                  >
                    Criar Demanda
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Finalize Video Modal */}
      <AnimatePresence>
        {isFinalizeModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/10 bg-gradient-to-r from-emerald-400/10 to-transparent">
                <h2 className="text-xl font-headline font-bold text-white tracking-tight">Finalizar <span className="font-serif italic text-emerald-400 font-light">Vídeo</span></h2>
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-2">Insira o link para o cliente baixar o arquivo</p>
              </div>

              <form onSubmit={handleFinalizeSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Link do Vídeo Final</label>
                  <input 
                    required
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={finalizeVideoUrl}
                    onChange={(e) => setFinalizeVideoUrl(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-5 text-sm focus:ring-1 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all text-white outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => { setIsFinalizeModalOpen(false); setPendingMove(null); setFinalizeVideoUrl(''); }}
                    className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-400 text-black py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] transition-all"
                  >
                    Finalizar Agora
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Employee Assignment Modal */}
      <AnimatePresence>
        {isEmployeeModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/10 bg-gradient-to-r from-primary/10 to-transparent">
                <h2 className="text-xl font-headline font-bold text-white tracking-tight">Designar <span className="font-serif italic text-primary font-light">Responsável</span></h2>
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-2">Obrigatório para avançar de fase</p>
              </div>

              <div className="p-8 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Selecione um Membro da Equipe</label>
                  <div className="grid grid-cols-1 gap-3">
                    {teamMembers.map(member => (
                      <button
                        key={member.id}
                        onClick={() => handleAssignEmployee(member.id)}
                        className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/10 rounded-2xl hover:bg-white/10 hover:border-primary/50 transition-all group text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs">
                          {member.initials}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{member.name}</p>
                          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{member.role}</p>
                        </div>
                        <span className="material-symbols-outlined ml-auto text-white/20 group-hover:text-primary transition-colors">chevron_right</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => { setIsEmployeeModalOpen(false); setPendingMove(null); }}
                  className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                >
                  Cancelar Movimentação
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Details Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
          <div className="w-full max-w-3xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-8 border-b border-white/10 flex justify-between items-start bg-gradient-to-r from-secondary/5 to-transparent relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary via-primary to-secondary opacity-50"></div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
                    selectedVideo.priority === 'Alta' ? 'text-red-400 border-red-400/20 bg-red-400/5' :
                    selectedVideo.priority === 'Média' ? 'text-orange-400 border-orange-400/20 bg-orange-400/5' :
                    'text-blue-400 border-blue-400/20 bg-blue-400/5'
                  }`}>
                    {selectedVideo.priority}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">ID: #{selectedVideo.id.slice(-4).toUpperCase()}</span>
                </div>
                <h2 className="text-3xl font-headline font-bold text-white tracking-tight leading-tight">{selectedVideo.title}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="material-symbols-outlined text-secondary text-sm">person</span>
                  <p className="text-secondary font-medium">{selectedVideo.client}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedVideo(null)}
                className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all shadow-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Plano Contratado</p>
                  <p className={`text-lg font-bold ${
                    selectedVideo.plan === 'Starter' ? 'text-emerald-400' :
                    selectedVideo.plan === 'Growth' ? 'text-primary' : 'text-secondary'
                  }`}>{selectedVideo.plan}</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Prazo de Entrega</p>
                  <p className="text-lg font-bold text-white">{new Date(selectedVideo.deadline).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Status Atual</p>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      selectedVideo.status === 'Aberto' ? 'bg-blue-400' :
                      selectedVideo.status === 'Em Produção' ? 'bg-secondary' : 
                      selectedVideo.status === 'Revisão' ? 'bg-orange-400' : 'bg-emerald-400'
                    }`}></span>
                    <p className="text-lg font-bold text-white">{selectedVideo.status}</p>
                  </div>
                </div>
              </div>

              {selectedVideo.assignedToName && (
                <div className="mb-8 p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold">
                    {selectedVideo.assignedToName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Responsável Designado</p>
                    <p className="text-white font-bold">{selectedVideo.assignedToName}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 shadow-inner">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-secondary">category</span>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white/80">Especificações</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-xs text-white/40">Nicho</span>
                      <span className="text-xs font-bold text-white">{selectedVideo.niche}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-xs text-white/40">Tipo de Vídeo</span>
                      <span className="text-xs font-bold text-white">{selectedVideo.type}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-xs text-white/40">Quantidade</span>
                      <span className="text-xs font-bold text-white">{selectedVideo.videoCount} {selectedVideo.videoCount === 1 ? 'Vídeo' : 'Vídeos'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 shadow-inner">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-secondary">description</span>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white/80">Briefing Detalhado</h3>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed italic">
                    "{selectedVideo.description}"
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
                <button className="flex-1 min-w-[140px] bg-secondary text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:shadow-[0_0_20px_rgba(203,123,255,0.4)] transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Editar
                </button>
                <button className="flex-1 min-w-[140px] bg-white/5 text-white/60 border border-white/10 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">download</span>
                  Assets
                </button>
                <button 
                  onClick={() => handleDelete(selectedVideo.id)}
                  className="flex-1 min-w-[140px] bg-red-400/10 text-red-400 border border-red-400/20 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-red-400/20 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  Deletar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


interface VideoCardProps {
  id: string;
  client: string;
  title: string;
  deadline: string;
  priority: string;
  status: string;
  videoCount: number;
  niche: string;
  type: string;
  description: string;
  plan: 'Starter' | 'Growth' | 'Scale';
  assignedToName?: string;
  isFocused?: boolean;
  onMove: (id: string, newStatus: string) => void;
  onNextPhase: () => void;
  onDelete: (id: string) => void;
  onClick: () => void;
  onViewDetails: () => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ 
  id, client, title, deadline, priority, status, 
  videoCount, niche, type, description, plan, assignedToName, isFocused, onMove, onNextPhase, onDelete, onClick, onViewDetails 
}) => {
  const priorityColors: Record<string, string> = {
    'Alta': 'text-red-400 bg-red-400/10 border-red-400/20',
    'Média': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    'Baixa': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  };

  const planColors: Record<string, string> = {
    'Starter': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    'Growth': 'text-primary bg-primary/10 border-primary/20',
    'Scale': 'text-secondary bg-secondary/10 border-secondary/20'
  };

  const statusColors: Record<string, string> = {
    'Aberto': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    'Em Produção': 'text-secondary bg-secondary/10 border-secondary/20',
    'Revisão': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    'Finalizado': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
  };

  const [showMenu, setShowMenu] = useState(false);

  return (
    <div 
      onClick={onClick}
      className={`bg-white/[0.03] border backdrop-blur-xl p-6 rounded-3xl transition-all group relative cursor-pointer ${
        isFocused ? 'border-secondary bg-secondary/5 ring-1 ring-secondary/20 shadow-[0_0_30px_rgba(203,123,255,0.1)]' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
      }`}
    >
      <div className="flex justify-between items-start mb-5">
        <div className="flex flex-wrap gap-2">
          {isFocused && (
            <span className="text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border border-secondary text-secondary bg-secondary/10 flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px]">visibility</span>
              Focado
            </span>
          )}
          <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border ${priorityColors[priority] || priorityColors['Normal']}`}>
            {priority}
          </span>
          <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border ${planColors[plan]}`}>
            {plan}
          </span>
          <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border ${statusColors[status]}`}>
            {status}
          </span>
        </div>
        <div className="relative">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="text-white/20 hover:text-white transition-colors p-1"
          >
            <span className="material-symbols-outlined text-lg">more_vert</span>
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-3 w-56 bg-[#121212]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
              <div className="p-3 border-b border-white/5 space-y-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); /* Add edit logic if needed */ }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Editar Demanda
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(id); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  Deletar Demanda
                </button>
              </div>

              <div className="p-2 bg-white/5">
                <p className="text-[8px] uppercase tracking-[0.2em] text-white/30 font-black px-3 py-2">Mover para</p>
                <div className="space-y-1">
                  {status !== 'Aberto' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onMove(id, 'Aberto'); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-[10px] uppercase tracking-widest font-bold text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                      Demanda Aberta
                    </button>
                  )}
                  {status !== 'Em Produção' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onMove(id, 'Em Produção'); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-[10px] uppercase tracking-widest font-bold text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-secondary"></div>
                      Em Produção
                    </button>
                  )}
                  {status !== 'Revisão' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onMove(id, 'Revisão'); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-[10px] uppercase tracking-widest font-bold text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                      Em Revisão
                    </button>
                  )}
                  {status !== 'Finalizado' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onMove(id, 'Finalizado'); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-[10px] uppercase tracking-widest font-bold text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                      Finalizada
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-4">
        <h4 className="text-base font-headline font-bold text-white mb-1 group-hover:text-secondary transition-colors leading-tight">{title}</h4>
        <p className="text-xs text-white/40 font-light">{client}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white/5 rounded-xl p-2 border border-white/5">
          <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold mb-1">Nicho</p>
          <p className="text-[10px] text-white/70 font-medium truncate">{niche}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-2 border border-white/5">
          <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold mb-1">Tipo</p>
          <p className="text-[10px] text-white/70 font-medium truncate">{type}</p>
        </div>
      </div>

      <div className="bg-white/5 rounded-2xl p-3 border border-white/5 mb-5">
        <div className="flex justify-between items-center mb-2">
          <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold">Briefing</p>
          <span className="text-[9px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">{videoCount} {videoCount === 1 ? 'Vídeo' : 'Vídeos'}</span>
        </div>
        <p className="text-[10px] text-white/50 leading-relaxed line-clamp-3 italic">"{description}"</p>
      </div>

      {status !== 'Finalizado' && (
        <button 
          onClick={(e) => { e.stopPropagation(); onNextPhase(); }}
          className="w-full mb-3 py-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:bg-secondary hover:text-white hover:border-secondary transition-all group/btn"
        >
          <span>Avançar Fase</span>
          <span className="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
        </button>
      )}

      <button 
        onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
        className="w-full mb-5 py-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all"
      >
        <span className="material-symbols-outlined text-sm">info</span>
        Ver Detalhes
      </button>
      
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-white/20 text-sm">calendar_today</span>
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{new Date(deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
        </div>
        <div className="flex items-center gap-2">
          {assignedToName && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-2 py-1 rounded-lg">
              <span className="text-[9px] font-bold text-primary uppercase tracking-tighter truncate max-w-[60px]">{assignedToName.split(' ')[0]}</span>
            </div>
          )}
          <div className="flex -space-x-2">
            {assignedToName ? (
              <div className="w-7 h-7 rounded-full bg-primary/20 border-2 border-[#050505] flex items-center justify-center text-[9px] font-bold text-primary">
                {assignedToName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-white/5 border-2 border-[#050505] flex items-center justify-center text-[9px] font-bold text-white/20">?</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

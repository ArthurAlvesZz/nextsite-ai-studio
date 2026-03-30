import React, { useState, useMemo } from 'react';
import SEO from '../components/SEO';
import { Link } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import GlobalSearch from '../components/GlobalSearch';
import { useClients, Client } from '../hooks/useClients';
import { useEmployees } from '../hooks/useEmployees';
import { useSales, Sale } from '../hooks/useSales';
import { useGoalSettings } from '../hooks/useGoalSettings';
import { motion, AnimatePresence } from 'motion/react';
import { format, isSameMonth, parseISO } from 'date-fns';

export default function AdminSales() {
  const { clients, addClient } = useClients();
  const { teamMembers } = useEmployees();
  const { sales, addSale, totalRevenue } = useSales();
  const { goalSettings } = useGoalSettings();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('Starter');
  const [saleValue, setSaleValue] = useState('');
  const [pixReceipt, setPixReceipt] = useState<string | null>(null);
  
  const filteredSales = useMemo(() => {
    return sales.filter(sale => 
      sale.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.plan.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sales, searchQuery]);

  const [clientFormData, setClientFormData] = useState<Omit<Client, 'id' | 'createdAt'>>({
    name: '',
    email: '',
    niche: '',
    document: '',
    instagram: '',
    whatsapp: '',
    billedAmount: 0,
    status: 'Ativo'
  });

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newClient = await addClient(clientFormData);
      setClientFormData({ name: '', email: '', niche: '', document: '', instagram: '', whatsapp: '', billedAmount: 0, status: 'Ativo' });
      setIsClientModalOpen(false);
      if (newClient) {
        setSelectedClientId(newClient.id);
      }
    } catch (error) {
      console.error("Error adding client:", error);
    }
  };

  const handleConfirmSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedSellerId || !saleValue || !pixReceipt) {
      alert('Por favor, preencha todos os campos, incluindo o comprovante PIX.');
      return;
    }

    const client = clients.find(c => c.id === selectedClientId);
    const seller = teamMembers.find(m => m.id === selectedSellerId);

    if (client && seller) {
      addSale({
        clientId: client.id,
        clientName: client.name,
        sellerId: seller.id,
        sellerName: seller.name,
        plan: selectedPlan,
        value: Number(saleValue),
        pixReceipt: pixReceipt
      });
      
      // Reset form
      setSelectedClientId('');
      setSelectedSellerId('');
      setSelectedPlan('Starter');
      setSaleValue('');
      setPixReceipt(null);
      alert('Venda confirmada com sucesso!');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPixReceipt(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatSaleDate = (sale: Sale) => {
    if (sale.createdAt) {
      return new Date(sale.createdAt).toLocaleString('pt-BR', { 
        timeZone: 'America/Sao_Paulo',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).replace(',', ' às');
    }
    return sale.date;
  };

  const handleExportCSV = () => {
    if (filteredSales.length === 0) {
      alert('Não há dados para exportar.');
      return;
    }

    // Define CSV headers
    const headers = ['ID', 'Data', 'Cliente', 'Vendedor', 'Plano', 'Valor', 'Status'];
    
    // Map data to CSV rows
    const csvRows = [
      headers.join(','), // Header row
      ...filteredSales.map(sale => [
        sale.id,
        formatSaleDate(sale),
        `"${sale.clientName.replace(/"/g, '""')}"`, // Escape quotes and wrap in quotes
        `"${sale.sellerName.replace(/"/g, '""')}"`,
        sale.plan,
        sale.value,
        sale.status
      ].join(','))
    ];

    // Create CSV string with BOM for Excel UTF-8 support
    const csvString = '\uFEFF' + csvRows.join('\n');
    
    // Create blob and download
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vendas_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Synchronized ranking logic (Current Month)
  const currentMonthKey = format(new Date(), 'yyyy-MM');
  const sellerRanking = teamMembers.map(member => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const memberSales = sales.filter(s => {
      const sDate = s.createdAt 
        ? new Date(s.createdAt) 
        : new Date(s.date.replace(/(\d+)\s(\w+),\s(\d+)/, '$2 $1 $3')); // Simple parse for "22 Mar, 2024"
      return s.sellerId === member.id && 
             s.status === 'Confirmado' && 
             sDate >= startOfMonth;
    });
    
    const totalValue = memberSales.reduce((acc, s) => acc + s.value, 0);
    const count = memberSales.length;

    // Get individual goal from settings or fallback to member default
    const individualGoal = goalSettings.months[currentMonthKey]?.individualGoals?.[member.id]?.sales ?? member.monthlySalesGoal ?? 50000;
    const isGoalReached = totalValue >= individualGoal;

    return { ...member, totalValue, count, individualGoal, isGoalReached };
  }).sort((a, b) => b.totalValue - a.totalValue).slice(0, 3);

  const vipClients = clients.map(client => {
    const clientSales = sales.filter(s => s.clientId === client.id && s.status === 'Confirmado');
    const totalValue = clientSales.reduce((acc, s) => acc + s.value, 0);
    return { ...client, totalValue };
  }).sort((a, b) => b.totalValue - a.totalValue).slice(0, 3);

  return (
    <div className="font-headline text-on-background min-h-screen flex bg-[#050505] overflow-hidden selection:bg-primary/30">
      {/* Background from Home */}
      <div className="fixed inset-0 w-full h-full -z-10 bg-[#050505] overflow-hidden">
        <div className="absolute inset-0 w-full h-full opacity-1 bg-gradient-to-b from-[#020202] to-transparent">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.05),transparent_60%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(153,0,255,0.05),transparent_40%)]"></div>
        </div>
      </div>

      <SEO title="Vendas" />
      <AdminSidebar activePage="vendas" isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <main className="md:ml-64 w-full flex-1 min-h-screen relative flex flex-col overflow-y-auto">
        {/* Top Bar */}
        <header className="h-24 z-40 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/10 flex justify-between items-center px-10 shrink-0 sticky top-0">
          <div className="flex items-center gap-6 flex-1">
            <GlobalSearch />
            <h2 className="text-xl font-headline font-bold text-white tracking-tight hidden lg:block">
              Painel de <span className="font-serif italic text-secondary font-light">Gestão</span>
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-white/60 hover:text-white transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full border-2 border-[#050505]"></span>
            </button>
            <div className="h-8 w-[1px] bg-white/10"></div>
          </div>
        </header>

        {/* Content Section */}
        <div className="p-10 space-y-10 max-w-7xl mx-auto w-full">
          {/* Header & Metrics */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <h1 className="text-4xl font-headline font-bold text-white mb-2">Gestão de <span className="font-serif italic text-secondary font-light">Vendas</span></h1>
              <p className="text-white/40 text-sm">Acompanhe o desempenho comercial em tempo real.</p>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 min-w-[200px] backdrop-blur-xl">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Faturamento Total</p>
                <h3 className="text-2xl font-headline font-bold text-white">R$ {totalRevenue.toLocaleString('pt-BR')}</h3>
                <div className="flex items-center gap-1 text-emerald-400 text-[10px] mt-1">
                  <span className="material-symbols-outlined text-xs">trending_up</span>
                  <span>+12% este mês</span>
                </div>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 min-w-[200px] backdrop-blur-xl">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Meta Mensal</p>
                {(() => {
                  const currentMonthKey = new Date().toISOString().substring(0, 7);
                  const monthGoal = goalSettings.months[currentMonthKey]?.totalMonthlySalesGoal || 200000;
                  const progress = Math.min(Math.round((totalRevenue / monthGoal) * 100), 100);
                  return (
                    <>
                      <h3 className="text-2xl font-headline font-bold text-white">{progress}% <span className="text-sm text-white/40 font-normal">/ R$ {monthGoal.toLocaleString('pt-BR')}</span></h3>
                      <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className="bg-secondary h-full shadow-[0_0_10px_rgba(203,123,255,0.5)]" style={{ width: `${progress}%` }}></div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Upper Grid: Form & Ranking */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Nova Venda Form */}
            <div className="lg:col-span-2 bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 blur-[100px] -mr-32 -mt-32 transition-all group-hover:bg-secondary/10"></div>
              
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined">add_shopping_cart</span>
                </div>
                <h3 className="text-xl font-headline font-bold text-white">Registrar Nova Venda</h3>
              </div>

              <form onSubmit={handleConfirmSale} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Cliente</label>
                    <button 
                      type="button"
                      onClick={() => setIsClientModalOpen(true)}
                      className="text-[10px] uppercase tracking-widest text-secondary font-bold hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">add</span>
                      Novo Cliente
                    </button>
                  </div>
                  <select 
                    required
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-secondary/50 transition-all"
                  >
                    <option value="" className="bg-[#0a0a0a]">Selecionar Cliente</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id} className="bg-[#0a0a0a]">{client.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Vendedor</label>
                  <select 
                    required
                    value={selectedSellerId}
                    onChange={(e) => setSelectedSellerId(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-secondary/50 transition-all"
                  >
                    <option value="" className="bg-[#0a0a0a]">Selecionar Vendedor</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id} className="bg-[#0a0a0a]">{member.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Produto/Plano</label>
                  <select 
                    required
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-secondary/50 transition-all"
                  >
                    <option value="Starter" className="bg-[#0a0a0a]">Plano Starter</option>
                    <option value="Pro" className="bg-[#0a0a0a]">Plano Pro</option>
                    <option value="Enterprise" className="bg-[#0a0a0a]">Plano Enterprise</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Valor da Venda</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-sm">R$</span>
                    <input 
                      required
                      type="number" 
                      placeholder="0,00" 
                      value={saleValue}
                      onChange={(e) => setSaleValue(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-secondary/50 transition-all" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Comprovante PIX (Obrigatório)</label>
                  <div className="relative">
                    <input 
                      required
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden" 
                      id="pix-upload"
                    />
                    <label 
                      htmlFor="pix-upload"
                      className={`w-full flex items-center justify-center gap-2 bg-white/[0.05] border border-dashed rounded-xl py-3 px-4 text-sm cursor-pointer transition-all ${
                        pixReceipt ? 'border-emerald-400/50 text-emerald-400 bg-emerald-400/5' : 'border-white/20 text-white/40 hover:border-white/40'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {pixReceipt ? 'check_circle' : 'upload_file'}
                      </span>
                      {pixReceipt ? 'Comprovante Anexado' : 'Anexar Comprovante PIX'}
                    </label>
                  </div>
                </div>
                <button type="submit" className="md:col-span-2 mt-4 bg-gradient-to-r from-secondary to-primary text-on-secondary py-4 rounded-xl font-headline font-bold uppercase text-xs tracking-[0.2em] shadow-lg shadow-secondary/20 hover:shadow-secondary/40 hover:scale-[1.01] transition-all">
                  Confirmar Venda
                </button>
              </form>
            </div>

            {/* Ranking Section */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-headline font-bold text-white">Ranking do Mês</h3>
                <span className="material-symbols-outlined text-secondary">emoji_events</span>
              </div>

              <div className="space-y-6">
                {sellerRanking.map((seller, i) => (
                  <div key={seller.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg ${
                        i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-slate-300' : 'bg-orange-400'
                      } flex items-center justify-center text-black font-bold text-xs shrink-0`}>
                        {i + 1}º
                      </div>
                      <div>
                        <Link to={`/admin/team/${seller.id}`} className="text-sm font-bold text-white hover:text-secondary transition-colors block">{seller.name}</Link>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(seller.totalValue / Math.max(...sellerRanking.map(s => s.totalValue || 1))) * 100}%` }}
                              className={`h-full ${i === 0 ? 'bg-yellow-400' : 'bg-secondary'}`}
                            />
                          </div>
                          <span className="text-[10px] text-white/40 font-bold">{seller.count} vendas</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-secondary">R$ {seller.totalValue.toLocaleString('pt-BR')}</p>
                      {seller.isGoalReached && (
                        <p className="text-[10px] text-emerald-400 font-bold">Meta batida</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <button className="w-full mt-8 py-3 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                Ver Ranking Completo
              </button>
            </div>
          </div>

          {/* Clientes VIP Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-headline font-bold text-white">Clientes <span className="font-serif italic text-secondary font-light">VIP</span></h3>
              <button className="text-xs text-secondary hover:underline">Gerenciar Clientes</button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {vipClients.map((client, i) => (
                <div key={client.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-secondary/30 transition-all cursor-pointer group">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mb-4 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">verified</span>
                  </div>
                  <h4 className="text-white font-bold mb-1">{client.name}</h4>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-3">{client.niche}</p>
                  <p className="text-sm font-bold text-secondary">R$ {client.totalValue.toLocaleString('pt-BR')}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Histórico de Vendas Table */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-headline font-bold text-white">Histórico de Vendas Recentes</h3>
                <p className="text-white/40 text-xs mt-1">Últimas 50 transações registradas.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white/60 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Exportar CSV
                </button>
                <button className="px-4 py-2 bg-secondary/10 border border-secondary/20 rounded-xl text-[10px] font-bold uppercase tracking-widest text-secondary hover:bg-secondary hover:text-white transition-all flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">filter_list</span>
                  Filtrar
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">ID</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Data</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Cliente</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Vendedor</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Plano</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Valor</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredSales.length > 0 ? (
                    filteredSales.map((sale, i) => (
                      <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-8 py-5 text-sm font-mono text-white/40">{sale.id}</td>
                        <td className="px-8 py-5 text-sm text-white/60">{formatSaleDate(sale)}</td>
                        <td className="px-8 py-5 text-sm font-bold text-white">{sale.clientName}</td>
                        <td className="px-8 py-5 text-sm text-white/60">{sale.sellerName}</td>
                        <td className="px-8 py-5">
                          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-white/60">{sale.plan}</span>
                        </td>
                        <td className="px-8 py-5 text-sm font-bold text-secondary">R$ {sale.value.toLocaleString('pt-BR')}</td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full bg-current ${
                              sale.status === 'Confirmado' ? 'text-emerald-400' : 
                              sale.status === 'Pendente' ? 'text-orange-400' : 'text-red-400'
                            }`}></div>
                            <span className={`text-xs font-bold ${
                              sale.status === 'Confirmado' ? 'text-emerald-400' : 
                              sale.status === 'Pendente' ? 'text-orange-400' : 'text-red-400'
                            }`}>{sale.status}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-8 py-24 text-center">
                        <div className="flex flex-col items-center gap-4 text-white/20">
                          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                            <span className="material-symbols-outlined text-4xl">search_off</span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-lg font-headline font-bold text-white/40">Nenhuma venda encontrada</p>
                            <p className="text-sm font-light">Não encontramos resultados para "<span className="text-secondary/60 italic">{searchQuery}</span>"</p>
                          </div>
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="mt-4 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-white/60 transition-all active:scale-95"
                          >
                            Limpar Filtros
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-6 bg-white/[0.02] flex justify-center">
              <button className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">Carregar Mais Vendas</button>
            </div>
          </div>
        </div>
      </main>

      {/* New Client Modal */}
      <AnimatePresence>
        {isClientModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsClientModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0e0e0e] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              {/* Modal Glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-secondary/20 blur-[80px] rounded-full" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-headline font-bold text-white tracking-tight">Novo <span className="font-serif italic text-secondary font-light">Cliente</span></h3>
                    <p className="text-white/40 text-xs mt-1 font-light">Preencha os dados para cadastrar na base.</p>
                  </div>
                  <button 
                    onClick={() => setIsClientModalOpen(false)}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <form onSubmit={handleAddClient} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Nome / Empresa</label>
                    <input 
                      required
                      value={clientFormData.name}
                      onChange={(e) => setClientFormData({...clientFormData, name: e.target.value})}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-secondary/50 outline-none transition-all"
                      placeholder="Ex: Titan Industries"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Email</label>
                      <input 
                        required
                        type="email"
                        value={clientFormData.email}
                        onChange={(e) => setClientFormData({...clientFormData, email: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-secondary/50 outline-none transition-all"
                        placeholder="contato@empresa.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Nicho</label>
                      <input 
                        required
                        value={clientFormData.niche}
                        onChange={(e) => setClientFormData({...clientFormData, niche: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-secondary/50 outline-none transition-all"
                        placeholder="Ex: Tecnologia"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Instagram</label>
                      <input 
                        value={clientFormData.instagram}
                        onChange={(e) => setClientFormData({...clientFormData, instagram: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-secondary/50 outline-none transition-all"
                        placeholder="@usuario"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">WhatsApp</label>
                      <input 
                        required
                        value={clientFormData.whatsapp}
                        onChange={(e) => setClientFormData({...clientFormData, whatsapp: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-secondary/50 outline-none transition-all"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">CPF / CNPJ</label>
                      <input 
                        required
                        value={clientFormData.document}
                        onChange={(e) => setClientFormData({...clientFormData, document: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-secondary/50 outline-none transition-all"
                        placeholder="00.000.000/0001-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Valor Faturado (R$)</label>
                      <input 
                        type="number"
                        value={clientFormData.billedAmount}
                        onChange={(e) => setClientFormData({...clientFormData, billedAmount: Number(e.target.value)})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-secondary/50 outline-none transition-all"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">Status Inicial</label>
                      <select 
                        value={clientFormData.status}
                        onChange={(e) => setClientFormData({...clientFormData, status: e.target.value as 'Ativo' | 'Inativo'})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-secondary/50 outline-none transition-all appearance-none"
                      >
                        <option value="Ativo" className="bg-[#0e0e0e]">Ativo</option>
                        <option value="Inativo" className="bg-[#0e0e0e]">Inativo</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      className="w-full bg-gradient-to-r from-secondary to-primary text-on-secondary font-headline font-bold py-4 rounded-xl hover:shadow-[0_0_30px_rgba(203,123,255,0.3)] transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
                    >
                      Finalizar Cadastro
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

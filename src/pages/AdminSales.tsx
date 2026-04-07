import React, { useState, useMemo } from 'react';
import SEO from '../components/SEO';
import AdminSidebar from '../components/AdminSidebar';
import GlobalSearch from '../components/GlobalSearch';
import { useCRMLeads, CRMLead } from '../hooks/useCRMLeads';
import { motion } from 'motion/react';
import { format } from 'date-fns';

// Helper to format lead date outside component to avoid re-creation
const formatLeadDate = (createdAt?: string) => {
  if (createdAt) {
    try {
      return new Date(createdAt).toLocaleString('pt-BR', { 
        timeZone: 'America/Sao_Paulo',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).replace(',', ' às');
    } catch (e) {
      return 'Data Inválida';
    }
  }
  return 'Data N/A';
};

const statusColors = {
  'Novo': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Contato Feito': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  'Em Negociação': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  'Convertido': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
};

const LeadRow = React.memo(({ lead }: { lead: CRMLead }) => (
  <tr className="hover:bg-white/[0.02] transition-colors group">
    <td className="px-8 py-5 text-sm font-bold text-white">{lead.businessName}</td>
    <td className="px-8 py-5 text-sm text-white/60">{lead.phone}</td>
    <td className="px-8 py-5 text-sm text-white/60">{lead.leadSource}</td>
    <td className="px-8 py-5">
      <span className={`px-3 py-1.5 border rounded-full text-[10px] font-bold uppercase tracking-widest ${statusColors[lead.status as keyof typeof statusColors] || 'text-white/60'}`}>
        {lead.status}
      </span>
    </td>
    <td className="px-8 py-5 text-sm font-mono text-white/40">{formatLeadDate(lead.createdAt)}</td>
  </tr>
));

export default function AdminSales() {
  const { leads, addLead } = useCRMLeads();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // CRM Lead Form State
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [leadSource, setLeadSource] = useState('B2B Local');
  const [status, setStatus] = useState<'Novo' | 'Contato Feito' | 'Em Negociação' | 'Convertido'>('Novo');
  
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => 
      lead.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.leadSource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.status.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [leads, searchQuery]);

  const handleAddLead = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !phone) {
      alert('Por favor, preencha nome da empresa e WhatsApp.');
      return;
    }

    try {
      await addLead({
        businessName,
        phone,
        leadSource,
        status
      });
      
      // Reset form
      setBusinessName('');
      setPhone('');
      setLeadSource('B2B Local');
      setStatus('Novo');
      alert('Lead adicionado com sucesso!');
    } catch (error) {
      alert('Erro ao adicionar lead.');
    }
  }, [addLead, businessName, phone, leadSource, status]);

  const handleExportCSV = React.useCallback(() => {
    if (filteredLeads.length === 0) {
      alert('Não há dados para exportar.');
      return;
    }

    const headers = ['Nome da Empresa', 'WhatsApp', 'Origem', 'Status', 'Data de Entrada'];
    
    const csvRows = [
      headers.join(','),
      ...filteredLeads.map(lead => [
        `"${lead.businessName.replace(/"/g, '""')}"`,
        `"${lead.phone}"`,
        `"${lead.leadSource}"`,
        `"${lead.status}"`,
        `"${formatLeadDate(lead.createdAt)}"`
      ].join(','))
    ];

    const csvString = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredLeads]);

  const { totalLeads, convertedLeads, conversionRate } = useMemo(() => {
    const total = leads.length;
    const converted = leads.filter(l => l.status === 'Convertido').length;
    const rate = total ? Math.round((converted / total) * 100) : 0;
    return { totalLeads: total, convertedLeads: converted, conversionRate: rate };
  }, [leads]);

  return (
    <div className="font-headline text-on-background min-h-screen flex bg-[#050505] overflow-hidden selection:bg-primary/30">
      <div className="fixed inset-0 w-full h-full -z-10 bg-[#050505] overflow-hidden">
        <div className="absolute inset-0 w-full h-full opacity-1 bg-gradient-to-b from-[#020202] to-transparent">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.05),transparent_60%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(153,0,255,0.05),transparent_40%)]"></div>
        </div>
      </div>

      <SEO title="CRM Leads" />
      <AdminSidebar activePage="vendas" isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="md:ml-64 w-full flex-1 min-h-screen relative flex flex-col overflow-y-auto">
        <header className="h-24 z-40 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/10 flex justify-between items-center px-10 shrink-0 sticky top-0">
          <div className="flex items-center gap-6 flex-1">
            <GlobalSearch />
            <h2 className="text-xl font-headline font-bold text-white tracking-tight hidden lg:block">
              Painel de <span className="font-serif italic text-secondary font-light">Leads</span>
            </h2>
          </div>
        </header>

        <div className="p-10 space-y-10 max-w-7xl mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <h1 className="text-4xl font-headline font-bold text-white mb-2">Gestão de <span className="font-serif italic text-secondary font-light">CRM (Prospecção)</span></h1>
              <p className="text-white/40 text-sm">Acompanhe contatos e fluxo de leads em tempo real.</p>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 min-w-[200px] backdrop-blur-xl">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Total de Leads</p>
                <h3 className="text-2xl font-headline font-bold text-white">{totalLeads}</h3>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 min-w-[200px] backdrop-blur-xl">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Taxa de Conversão</p>
                <h3 className="text-2xl font-headline font-bold text-emerald-400">{conversionRate}%</h3>
                <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-emerald-400 h-full" style={{ width: `${conversionRate}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Novo Lead Form */}
            <div className="lg:col-span-3 bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 blur-[100px] -mr-32 -mt-32 transition-all group-hover:bg-secondary/10"></div>
              
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined">person_add</span>
                </div>
                <h3 className="text-xl font-headline font-bold text-white">Cadastrar Lead de Prospecção</h3>
              </div>

              <form onSubmit={handleAddLead} className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Nome da Empresa</label>
                  <input 
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Ex: Clínica Sorrir"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-secondary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">WhatsApp</label>
                  <input 
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-secondary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Origem do Lead</label>
                  <select 
                    required
                    value={leadSource}
                    onChange={(e) => setLeadSource(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-secondary/50 transition-all"
                  >
                    <option value="B2B Local" className="bg-[#0a0a0a]">B2B Local</option>
                    <option value="Google Dorks" className="bg-[#0a0a0a]">Google Dorks</option>
                    <option value="Indicação" className="bg-[#0a0a0a]">Indicação</option>
                    <option value="Inbound" className="bg-[#0a0a0a]">Inbound</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Status Inicial</label>
                  <select 
                    required
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-secondary/50 transition-all"
                  >
                    <option value="Novo" className="bg-[#0a0a0a]">Novo</option>
                    <option value="Contato Feito" className="bg-[#0a0a0a]">Contato Feito</option>
                    <option value="Em Negociação" className="bg-[#0a0a0a]">Em Negociação</option>
                    <option value="Convertido" className="bg-[#0a0a0a]">Convertido</option>
                  </select>
                </div>
                <div className="md:col-span-4 mt-2">
                  <button type="submit" className="w-full bg-gradient-to-r from-secondary to-primary text-on-secondary py-4 rounded-xl font-headline font-bold uppercase text-xs tracking-[0.2em] shadow-lg shadow-secondary/20 hover:shadow-secondary/40 transition-all">
                    Registrar Lead no CRM
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* CRM Leads Table */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-headline font-bold text-white">Pipeline de Prospectos</h3>
                <p className="text-white/40 text-xs mt-1">Os 30 últimos leads gerados no sistema.</p>
              </div>
              <button 
                onClick={handleExportCSV}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white/60 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Exportar CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Empresa / Lead</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">WhatsApp</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Origem</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Status</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Data de Entrada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((lead) => (
                      <LeadRow key={lead.id} lead={lead} />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-8 py-24 text-center">
                        <div className="flex flex-col items-center gap-4 text-white/20">
                          <span className="material-symbols-outlined text-4xl">search_off</span>
                          <p className="text-lg font-headline font-bold text-white/40">Nenhum lead encontrado</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
